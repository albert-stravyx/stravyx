import type { RequestContext } from "../../supabase/functions/api/client.ts";
import type { OperatorCredentialKind, VerificationStatus } from "@stravyx/types";

export interface ReocRow {
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
  #operation: "select" | "update" | "insert" | "upsert" = "select";
  #payload: Record<string, unknown> | null = null;

  constructor(
    private readonly admin: FakeAdminClient,
    private readonly table: string,
  ) {}

  select(_columns: string): FakeQueryBuilder | Promise<QueryResult<unknown>> {
    if (this.#operation === "update") {
      return Promise.resolve(this.#runUpdate(true));
    }
    if (this.#operation === "upsert") {
      return this;
    }
    this.#operation = "select";
    return this;
  }

  update(payload: Record<string, unknown>): FakeQueryBuilder {
    this.#operation = "update";
    this.#payload = payload;
    return this;
  }

  upsert(
    payload: Record<string, unknown>,
    _options?: { onConflict?: string },
  ): FakeQueryBuilder {
    this.#operation = "upsert";
    this.#payload = payload;
    return this;
  }

  insert(payload: Record<string, unknown>): Promise<QueryResult<null>> {
    const row = this.#fileRowFromPayload(payload);
    if (row.error) return Promise.resolve({ data: null, error: row.error });
    if (row.data) this.admin.files.set(row.data.id, row.data);
    return Promise.resolve({ data: null, error: null });
  }

  single(): Promise<QueryResult<unknown>> {
    if (this.#operation === "upsert") {
      return Promise.resolve(this.#runUpsert());
    }
    if (this.#operation === "update") {
      return Promise.resolve(this.#runUpdate(true));
    }
    const rows = this.#selectRows();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
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

  maybeSingle(): Promise<QueryResult<unknown>> {
    const rows = this.#selectRows();
    return Promise.resolve({ data: rows[0] ?? null, error: null });
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const result = this.#operation === "update"
      ? this.#runUpdate(false)
      : { data: this.#selectRows(), error: null };
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  #selectRows(): Record<string, unknown>[] {
    if (this.table === "reoc_profiles") {
      return [...this.admin.reocs.values()]
        .map((row) => ({ ...row }))
        .filter((row) => matchesFilters(row, this.#filters));
    }
    if (this.table === "operator_credential_files") {
      return [...this.admin.files.values()]
        .map((row) => ({ ...row }))
        .filter((row) => matchesFilters(row, this.#filters));
    }
    return [];
  }

  #runUpdate(withSelect: boolean): QueryResult<unknown> {
    const payload = this.#payload ?? {};
    const matched: Record<string, unknown>[] = [];
    if (this.table === "reoc_profiles") {
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
    }
    if (this.table === "operator_credential_files") {
      for (const [id, row] of this.admin.files) {
        if (!matchesFilters({ ...row }, this.#filters)) continue;
        const next: FileRow = { ...row };
        if (typeof payload.storage_path === "string") next.storage_path = payload.storage_path;
        if (typeof payload.uploaded_by === "string") next.uploaded_by = payload.uploaded_by;
        if (payload.content_type === null || typeof payload.content_type === "string") {
          next.content_type = payload.content_type;
        }
        if (payload.original_name === null || typeof payload.original_name === "string") {
          next.original_name = payload.original_name;
        }
        if (payload.byte_size === null || typeof payload.byte_size === "number") {
          next.byte_size = payload.byte_size;
        }
        if (payload.confirmed_at === null || typeof payload.confirmed_at === "string") {
          next.confirmed_at = payload.confirmed_at;
        }
        this.admin.files.set(id, next);
        matched.push({ id });
      }
    }
    return { data: withSelect ? matched : null, error: null };
  }

  #fileRowFromPayload(
    payload: Record<string, unknown>,
    existing?: FileRow,
  ): { data: FileRow | null; error: { message: string } | null } {
    if (this.table !== "operator_credential_files") {
      return { data: null, error: { message: "unsupported table" } };
    }
    const kind = payload.kind;
    if (
      kind !== "reoc_certificate" && kind !== "repl" && kind !== "certificate_of_currency"
    ) {
      return { data: null, error: { message: "invalid kind" } };
    }
    const row: FileRow = {
      id: existing?.id ?? (typeof payload.id === "string" ? payload.id : crypto.randomUUID()),
      reoc_profile_id: String(payload.reoc_profile_id),
      uploaded_by: typeof payload.uploaded_by === "string"
        ? payload.uploaded_by
        : existing?.uploaded_by ?? null,
      kind,
      storage_path: String(payload.storage_path),
      content_type: typeof payload.content_type === "string"
        ? payload.content_type
        : existing?.content_type ?? null,
      original_name: typeof payload.original_name === "string"
        ? payload.original_name
        : existing?.original_name ?? null,
      byte_size: typeof payload.byte_size === "number"
        ? payload.byte_size
        : payload.byte_size === null
        ? null
        : existing?.byte_size ?? null,
      confirmed_at: typeof payload.confirmed_at === "string"
        ? payload.confirmed_at
        : payload.confirmed_at === null
        ? null
        : existing?.confirmed_at ?? null,
      created_at: existing?.created_at ?? new Date().toISOString(),
    };
    return { data: row, error: null };
  }

  #runUpsert(): QueryResult<unknown> {
    const payload = this.#payload ?? {};
    const reocId = String(payload.reoc_profile_id);
    const kind = payload.kind;
    let existing: FileRow | undefined;
    for (const row of this.admin.files.values()) {
      if (row.reoc_profile_id === reocId && row.kind === kind) {
        existing = row;
        break;
      }
    }
    const built = this.#fileRowFromPayload(payload, existing);
    if (built.error || !built.data) {
      return { data: null, error: built.error ?? { message: "upsert failed" } };
    }
    this.admin.files.set(built.data.id, built.data);
    return { data: { id: built.data.id }, error: null };
  }
}

function mimeFromFilename(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpeg") || lower.endsWith(".jpg")) return "image/jpeg";
  return "application/pdf";
}

export class FakeAdminClient {
  readonly reocs = new Map<string, ReocRow>();
  readonly files = new Map<string, FileRow>();
  readonly storageObjects = new Map<string, { name: string; size: number; mimetype: string }>();
  readonly buckets: string[] = [];

  from(table: string): FakeQueryBuilder {
    return new FakeQueryBuilder(this, table);
  }

  storage = {
    from: (bucket: string) => {
      this.buckets.push(bucket);
      return {
        createSignedUploadUrl: (path: string) => {
          const name = path.split("/").pop() ?? "file";
          this.storageObjects.set(path, {
            name,
            size: 2048,
            mimetype: mimeFromFilename(name),
          });
          return Promise.resolve({
            data: { path, token: "upload-token", signedUrl: `https://upload.example/${path}` },
            error: null,
          });
        },
        list: (prefix: string) => {
          const entries = [...this.storageObjects.entries()]
            .filter(([path]) => path.startsWith(`${prefix}/`) || path === prefix)
            .map(([, object]) => ({
              name: object.name,
              metadata: { size: object.size, mimetype: object.mimetype },
            }));
          return Promise.resolve({ data: entries, error: null });
        },
        createSignedUrls: (paths: string[], _ttl: number) => {
          return Promise.resolve({
            data: paths.map((path) => ({
              path,
              signedUrl: `https://download.example/${path}?token=1`,
            })),
            error: null,
          });
        },
        move: (fromPath: string, toPath: string) => {
          const existing = this.storageObjects.get(fromPath);
          if (!existing) {
            return Promise.resolve({ data: null, error: { message: "object not found" } });
          }
          this.storageObjects.delete(fromPath);
          this.storageObjects.set(toPath, {
            ...existing,
            name: toPath.split("/").pop() ?? existing.name,
          });
          return Promise.resolve({ data: { message: "ok" }, error: null });
        },
        remove: (paths: string[]) => {
          for (const path of paths) this.storageObjects.delete(path);
          return Promise.resolve({ data: [], error: null });
        },
      };
    },
  };
}

export function seedReoc(admin: FakeAdminClient, overrides: Partial<ReocRow> = {}): ReocRow {
  const row: ReocRow = {
    id: "reoc-1",
    owner_user_id: "operator-1",
    verification_status: "pending_docs",
    verified: false,
    rejection_reason: null,
    arn: "123456",
    reoc_number: "CASA.ReOC.0001",
    ...overrides,
  };
  admin.reocs.set(row.id, row);
  return row;
}

export function makeCtx(admin: FakeAdminClient, role: string, userId: string): RequestContext {
  return {
    cors: {},
    admin: toRouteClient(admin),
    userClient: toRouteClient(admin),
    userId,
    role,
  };
}
