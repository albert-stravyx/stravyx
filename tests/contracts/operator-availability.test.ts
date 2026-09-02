import { describe, expect, it } from "vitest";
import type { RequestContext } from "../../supabase/functions/api/client.ts";
import { setOperatorAvailability } from "../../supabase/functions/api/routes/operatorAvailability.ts";
import type { VerificationStatus } from "@stravyx/types";

interface ReocRow {
  id: string;
  owner_user_id: string;
  verification_status: VerificationStatus;
  verified: boolean;
  rejection_reason: string | null;
  arn: string | null;
  reoc_number: string | null;
  online: boolean;
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

function matchesFilters(row: Record<string, unknown>, filters: FilterEntry[]): boolean {
  return filters.every((filter) => {
    const current = row[filter.column];
    if (filter.op === "eq") return current === filter.value;
    if (filter.op === "neq") return current !== filter.value;
    if (filter.op === "in" && Array.isArray(filter.value)) {
      return filter.value.includes(current);
    }
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
      return Promise.resolve(this.#runUpdate());
    }
    this.#operation = "select";
    return this;
  }

  update(payload: Record<string, unknown>): FakeQueryBuilder {
    this.#operation = "update";
    this.#payload = payload;
    return this;
  }

  eq(column: string, value: unknown): FakeQueryBuilder {
    this.#filters.push({ op: "eq", column, value });
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
    if (this.table !== "reoc_profiles") return [];
    return [...this.admin.reocs.values()]
      .map((row) => ({ ...row }))
      .filter((row) => matchesFilters(row, this.#filters));
  }

  #runUpdate(): QueryResult<unknown> {
    const payload = this.#payload ?? {};
    const matched: Record<string, unknown>[] = [];
    for (const [id, row] of this.admin.reocs) {
      if (!matchesFilters({ ...row }, this.#filters)) continue;
      const next: ReocRow = { ...row };
      if (typeof payload.online === "boolean") next.online = payload.online;
      this.admin.reocs.set(id, next);
      matched.push({ id: next.id, online: next.online });
    }
    return { data: matched, error: null };
  }
}

class FakeAdminClient {
  readonly reocs = new Map<string, ReocRow>();
  from(table: string): FakeQueryBuilder {
    return new FakeQueryBuilder(this, table);
  }
  storage = { from: () => ({}) };
}

function seedReoc(admin: FakeAdminClient, overrides: Partial<ReocRow> = {}): void {
  admin.reocs.set("reoc-1", {
    id: "reoc-1",
    owner_user_id: "operator-1",
    verification_status: "verified",
    verified: true,
    rejection_reason: null,
    arn: "123456",
    reoc_number: "CASA.ReOC.0001",
    online: false,
    ...overrides,
  });
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

function availabilityRequest(online: unknown): Request {
  return new Request("http://localhost/api/operator/availability", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ online }),
  });
}

async function parsePayload(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error("response_payload_not_object");
  return payload;
}

describe("operator availability", () => {
  it("persists online=true for a verified operator", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin);
    const response = await setOperatorAvailability(
      availabilityRequest(true),
      makeCtx(admin, "operator", "operator-1"),
    );
    expect(response.status).toBe(200);
    const payload = await parsePayload(response);
    expect(payload.online).toBe(true);
    expect(admin.reocs.get("reoc-1")?.online).toBe(true);
  });

  it("returns 403 operator_not_verified when the ReOC is still pending", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin, {
      verification_status: "pending_review",
      verified: false,
    });
    const response = await setOperatorAvailability(
      availabilityRequest(true),
      makeCtx(admin, "operator", "operator-1"),
    );
    expect(response.status).toBe(403);
    expect((await parsePayload(response)).code).toBe("operator_not_verified");
    expect(admin.reocs.get("reoc-1")?.online).toBe(false);
  });

  it("returns 403 for customers", async () => {
    const admin = new FakeAdminClient();
    seedReoc(admin);
    const response = await setOperatorAvailability(
      availabilityRequest(true),
      makeCtx(admin, "customer", "customer-1"),
    );
    expect(response.status).toBe(403);
    expect((await parsePayload(response)).code).toBe("forbidden");
  });
});
