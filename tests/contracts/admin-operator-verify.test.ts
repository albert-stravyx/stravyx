import { describe, expect, it } from "vitest";
import type { RequestContext } from "../../supabase/functions/api/client.ts";
import {
  listPendingOperators,
  verifyOperator,
} from "../../supabase/functions/api/routes/adminOperatorVerify.ts";
import type { OperatorCredentialKind, VerificationStatus } from "@stravyx/types";

interface ReocRow {
  id: string;
  owner_user_id: string;
  verification_status: VerificationStatus;
  verified: boolean;
  rejection_reason: string | null;
  arn: string | null;
  reoc_number: string | null;
}

interface FileRow {
  id: string;
  reoc_profile_id: string;
  uploaded_by: string | null;
  kind: OperatorCredentialKind;
  storage_path: string;
  content_type: string | null;
  original_name: string | null;
  byte_size: number | null;
  confirmed_at: string | null;
  created_at: string;
}

interface ProfileRow {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface FilterEntry {
  op: "eq" | "neq" | "in";
  column: string;
  value: unknown;
}

interface QueryResult<T> {
  data: T;
  error: { message: string } | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function toRouteClient(value: unknown): RequestContext["admin"] {
  if (!isRecord(value) || typeof value.from !== "function" || !isRecord(value.storage)) {
    throw new Error("fake_admin_shape_invalid");
  }
  return value as RequestContext["admin"];
}

async function parsePayload(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error("response_payload_not_object");
  return payload;
}

function matchesFilters(row: Record<string, unknown>, filters: FilterEntry[]): boolean {
  return filters.every((filter) => {
    const current = row[filter.column];
    if (filter.op === "eq") return current === filter.value;
    if (filter.op === "neq") return current !== filter.value;
    if (filter.op === "in" && Array.isArray(filter.value)) return filter.value.includes(current);
    return false;
  });
}

class FakeQueryBuilder {
  #filters: FilterEntry[] = [];
  #operation: "select" | "update" = "select";
  #payload: Record<string, unknown> | null = null;

  constructor(
    private readonly admin: FakeAdminClient,
    private readonly table: string,
  ) {}

  select(_columns: string): FakeQueryBuilder | Promise<QueryResult<unknown>> {
    if (this.#operation === "update") {
      this.admin.updateAttempted = true;
      return Promise.resolve(this.#runUpdate());
    }
    this.#operation = "select";
    return this;
  }

  update(payload: Record<string, unknown>): FakeQueryBuilder {
    this.#operation = "update";
    this.#payload = payload;
    this.admin.updateAttempted = true;
    return this;
  }

  eq(column: string, value: unknown): FakeQueryBuilder {
    this.#filters.push({ op: "eq", column, value });
    return this;
  }

  neq(column: string, value: unknown): FakeQueryBuilder {
    this.#filters.push({ op: "neq", column, value });
    return this;
  }

  in(column: string, value: unknown[]): FakeQueryBuilder {
    this.#filters.push({ op: "in", column, value });
    return this;
  }

  limit(_count: number): FakeQueryBuilder {
    return this;
  }

  maybeSingle(): Promise<QueryResult<unknown>> {
    return Promise.resolve({ data: this.#selectRows()[0] ?? null, error: null });
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const result = this.#operation === "update"
      ? this.#runUpdate()
      : { data: this.#selectRows(), error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  #selectRows(): Record<string, unknown>[] {
    if (this.table === "reoc_profiles") {
      return [...this.admin.reocs.values()].map((row) => ({ ...row }))
        .filter((row) => matchesFilters(row, this.#filters));
    }
    if (this.table === "profiles") {
      return [...this.admin.profiles.values()].map((row) => ({ ...row }))
        .filter((row) => matchesFilters(row, this.#filters));
    }
    if (this.table === "operator_credential_files") {
      return [...this.admin.files.values()].map((row) => ({ ...row }))
        .filter((row) => matchesFilters(row, this.#filters));
    }
    return [];
  }

  #runUpdate(): QueryResult<Array<{ id: string }>> {
    const payload = this.#payload ?? {};
    const matched: Array<{ id: string }> = [];
    for (const [id, row] of this.admin.reocs) {
      if (!matchesFilters({ ...row }, this.#filters)) continue;
      const next: ReocRow = { ...row };
      if (typeof payload.verification_status === "string") {
        const status = payload.verification_status;
        if (
          status === "pending_docs" || status === "pending_review" ||
          status === "verified" || status === "rejected"
        ) {
          next.verification_status = status;
        }
      }
      if (typeof payload.verified === "boolean") next.verified = payload.verified;
      if (payload.rejection_reason === null || typeof payload.rejection_reason === "string") {
        next.rejection_reason = payload.rejection_reason;
      }
      this.admin.reocs.set(id, next);
      matched.push({ id });
    }
    return { data: matched, error: null };
  }
}

class FakeAdminClient {
  updateAttempted = false;
  readonly reocs = new Map<string, ReocRow>();
  readonly profiles = new Map<string, ProfileRow>();
  readonly files = new Map<string, FileRow>();

  from(table: string): FakeQueryBuilder {
    return new FakeQueryBuilder(this, table);
  }

  storage = {
    from: (_bucket: string) => ({
      createSignedUrls: (paths: string[], _ttl: number) =>
        Promise.resolve({
          data: paths.map((path) => ({
            path,
            signedUrl: `https://download.example/${path}?token=1`,
          })),
          error: null,
        }),
    }),
  };
}

function seedPending(admin: FakeAdminClient): void {
  admin.reocs.set("reoc-1", {
    id: "reoc-1",
    owner_user_id: "operator-1",
    verification_status: "pending_review",
    verified: false,
    rejection_reason: null,
    arn: "123456",
    reoc_number: "CASA.ReOC.0001",
  });
  admin.profiles.set("operator-1", {
    id: "operator-1",
    full_name: "Ada Operator",
    email: "op@example.com",
  });
  admin.files.set("file-1", {
    id: "file-1",
    reoc_profile_id: "reoc-1",
    uploaded_by: "operator-1",
    kind: "reoc_certificate",
    storage_path: "reoc-1/reoc_certificate/file-1/cert.pdf",
    content_type: "application/pdf",
    original_name: "cert.pdf",
    byte_size: 1000,
    confirmed_at: "2026-08-24T00:00:00.000Z",
    created_at: "2026-08-24T00:00:00.000Z",
  });
}

function seedAllConfirmedKinds(admin: FakeAdminClient): void {
  const kinds: OperatorCredentialKind[] = [
    "reoc_certificate",
    "repl",
    "certificate_of_currency",
  ];
  for (const kind of kinds) {
    admin.files.set(`file-${kind}`, {
      id: `file-${kind}`,
      reoc_profile_id: "reoc-1",
      uploaded_by: "operator-1",
      kind,
      storage_path: `reoc-1/${kind}/file-${kind}/doc.pdf`,
      content_type: "application/pdf",
      original_name: `${kind}.pdf`,
      byte_size: 1000,
      confirmed_at: "2026-08-24T00:00:00.000Z",
      created_at: "2026-08-24T00:00:00.000Z",
    });
  }
}

function makeCtx(admin: FakeAdminClient, role: string, userId: string): RequestContext {
  return {
    cors: {},
    admin: toRouteClient(admin),
    userClient: toRouteClient(admin),
    userId,
    role,
  };
}

function verifyRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/admin/operators/reoc-1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin operator verify", () => {
  it("lets admin approve a pending_review operator and flips verified", async () => {
    const admin = new FakeAdminClient();
    seedPending(admin);
    seedAllConfirmedKinds(admin);
    const response = await verifyOperator(
      "reoc-1",
      verifyRequest({ decision: "approve" }),
      makeCtx(admin, "admin", "admin-1"),
    );
    expect(response.status).toBe(200);
    const payload = await parsePayload(response);
    expect(payload.verified).toBe(true);
    expect(payload.verificationStatus).toBe("verified");
    expect(admin.reocs.get("reoc-1")?.verified).toBe(true);
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("verified");
    expect(admin.reocs.get("reoc-1")?.rejection_reason).toBeNull();
  });

  it("refuses approve when a required credential kind is not confirmed", async () => {
    const admin = new FakeAdminClient();
    seedPending(admin);
    const response = await verifyOperator(
      "reoc-1",
      verifyRequest({ decision: "approve" }),
      makeCtx(admin, "admin", "admin-1"),
    );
    expect(response.status).toBe(409);
    expect((await parsePayload(response)).code).toBe("credentials_incomplete");
    expect(admin.reocs.get("reoc-1")?.verified).toBe(false);
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("pending_review");
  });

  it("returns 403 forbidden for a non-admin trying to approve themselves", async () => {
    const admin = new FakeAdminClient();
    seedPending(admin);
    const response = await verifyOperator(
      "reoc-1",
      verifyRequest({ decision: "approve" }),
      makeCtx(admin, "operator", "operator-1"),
    );
    expect(response.status).toBe(403);
    const payload = await parsePayload(response);
    expect(payload.code).toBe("forbidden");
    expect(admin.updateAttempted).toBe(false);
    expect(admin.reocs.get("reoc-1")?.verified).toBe(false);
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("pending_review");
  });

  it("returns 403 forbidden when a customer lists the pending queue", async () => {
    const admin = new FakeAdminClient();
    seedPending(admin);
    const response = await listPendingOperators(makeCtx(admin, "customer", "customer-1"));
    expect(response.status).toBe(403);
    expect((await parsePayload(response)).code).toBe("forbidden");
  });

  it("lists pending_review operators for admin with signed attachment URLs", async () => {
    const admin = new FakeAdminClient();
    seedPending(admin);
    const response = await listPendingOperators(makeCtx(admin, "admin", "admin-1"));
    expect(response.status).toBe(200);
    const payload = await parsePayload(response);
    expect(Array.isArray(payload.operators)).toBe(true);
    const operators = payload.operators as Array<Record<string, unknown>>;
    expect(operators).toHaveLength(1);
    expect(operators[0]?.reocId).toBe("reoc-1");
    expect(operators[0]?.arn).toBe("123456");
    expect(operators[0]?.fullName).toBe("Ada Operator");
    const files = operators[0]?.files as Array<Record<string, unknown>>;
    expect(files[0]?.downloadUrl).toEqual(expect.stringContaining("download="));
  });

  it("rejects with a reason and keeps verified false", async () => {
    const admin = new FakeAdminClient();
    seedPending(admin);
    const response = await verifyOperator(
      "reoc-1",
      verifyRequest({ decision: "reject", reason: "Illegible RePL scan" }),
      makeCtx(admin, "admin", "admin-1"),
    );
    expect(response.status).toBe(200);
    const payload = await parsePayload(response);
    expect(payload.verified).toBe(false);
    expect(payload.verificationStatus).toBe("rejected");
    expect(admin.reocs.get("reoc-1")?.verified).toBe(false);
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("rejected");
    expect(admin.reocs.get("reoc-1")?.rejection_reason).toBe("Illegible RePL scan");
  });

  it("returns 409 verification_conflict when approve CAS matches zero rows", async () => {
    const admin = new FakeAdminClient();
    seedPending(admin);
    const current = admin.reocs.get("reoc-1");
    if (!current) throw new Error("seed_reoc_missing");
    admin.reocs.set("reoc-1", {
      ...current,
      verification_status: "pending_docs",
      verified: false,
    });
    const response = await verifyOperator(
      "reoc-1",
      verifyRequest({ decision: "approve" }),
      makeCtx(admin, "admin", "admin-1"),
    );
    expect(response.status).toBe(409);
    expect((await parsePayload(response)).code).toBe("verification_conflict");
    expect(admin.reocs.get("reoc-1")?.verified).toBe(false);
    expect(admin.reocs.get("reoc-1")?.verification_status).toBe("pending_docs");
  });

  it("requires a non-empty rejection reason", async () => {
    const admin = new FakeAdminClient();
    seedPending(admin);
    const response = await verifyOperator(
      "reoc-1",
      verifyRequest({ decision: "reject", reason: "   " }),
      makeCtx(admin, "admin", "admin-1"),
    );
    expect(response.status).toBe(400);
    expect((await parsePayload(response)).code).toBe("invalid_rejection_reason");
    expect(admin.updateAttempted).toBe(false);
  });
});
