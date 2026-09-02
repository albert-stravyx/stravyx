import { describe, expect, it } from "vitest";
import type { RequestContext } from "../../supabase/functions/api/client.ts";
import { deleteMissionMedia } from "../../supabase/functions/api/routes/mediaDelete.ts";
import { MEDIA_BUCKET } from "../../supabase/functions/api/routes/mediaShared.ts";

type Visibility = "held" | "released";

interface MissionRow {
  id: string;
  customer_id: string;
  assigned_reoc_id: string | null;
  status: string;
}

interface ConfirmableMediaRow {
  id: string;
  mission_id: string;
  uploaded_by: string | null;
  visibility: Visibility;
  storage_path: string;
}

interface QueryError {
  message: string;
}

interface QueryResult<T> {
  data: T;
  error: QueryError | null;
}

interface Scenario {
  mission: MissionRow;
  operatorReocId: string | null;
  mediaRow: ConfirmableMediaRow | null;
  deleteMatchedRows: number;
  storageDeleteError?: QueryError | null;
  role: "admin" | "operator" | "customer";
  userId: string;
}

interface FilterEntry {
  column: string;
  value: unknown;
}

interface TestContext {
  ctx: RequestContext;
  admin: FakeAdminClient;
}

interface JsonPayload {
  ok?: unknown;
  code?: unknown;
  storageRemoved?: unknown;
  cleanup?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRouteClientLike(value: unknown): value is Pick<RequestContext["admin"], "from" | "storage"> {
  if (!isRecord(value)) return false;
  if (typeof value.from !== "function") return false;
  if (!isRecord(value.storage)) return false;
  return typeof value.storage.from === "function";
}

function toRouteClient(value: unknown): RequestContext["admin"] {
  if (!isRouteClientLike(value)) {
    throw new Error("fake_admin_shape_invalid");
  }
  return value as RequestContext["admin"];
}

async function parseResponsePayload(response: Response): Promise<JsonPayload> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) {
    throw new Error("response_payload_not_object");
  }
  return payload;
}

class FakeQueryBuilder {
  #filters: FilterEntry[] = [];
  #operation: "select" | "delete" = "select";

  constructor(private readonly admin: FakeAdminClient, private readonly table: string) {}

  eq(column: string, value: unknown): FakeQueryBuilder {
    this.#filters.push({ column, value });
    return this;
  }

  delete(): FakeQueryBuilder {
    this.#operation = "delete";
    this.admin.deleteAttempted = true;
    return this;
  }

  select(_columns: string): FakeQueryBuilder | Promise<QueryResult<Array<{ id: string }>>> {
    if (this.#operation !== "delete") {
      return this;
    }
    this.admin.operationLog.push("db_delete");
    this.admin.deleteFilters = [...this.#filters];
    const deletedRows = Array.from(
      { length: this.admin.scenario.deleteMatchedRows },
      (_, idx) => ({ id: `deleted-${idx}` }),
    );
    return Promise.resolve({ data: deletedRows, error: null });
  }

  maybeSingle(): Promise<QueryResult<unknown>> {
    if (this.table === "missions") {
      return Promise.resolve({ data: this.admin.scenario.mission, error: null });
    }
    if (this.table === "reoc_profiles") {
      if (!this.admin.scenario.operatorReocId) {
        return Promise.resolve({ data: null, error: null });
      }
      return Promise.resolve({
        data: { id: this.admin.scenario.operatorReocId },
        error: null,
      });
    }
    if (this.table === "media_files") {
      this.admin.mediaLookupAttempted = true;
      return Promise.resolve({ data: this.admin.scenario.mediaRow, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  }
}

class FakeAdminClient {
  deleteAttempted = false;
  mediaLookupAttempted = false;
  deleteFilters: FilterEntry[] = [];
  storageRemoveCalls: string[][] = [];
  storageBuckets: string[] = [];
  operationLog: string[] = [];

  constructor(readonly scenario: Scenario) {}

  from(table: string): FakeQueryBuilder {
    return new FakeQueryBuilder(this, table);
  }

  storage = {
    from: (bucket: string) => {
      this.storageBuckets.push(bucket);
      return {
        remove: (paths: string[]): Promise<QueryResult<null>> => {
          this.operationLog.push("storage_remove");
          this.storageRemoveCalls.push(paths);
          return Promise.resolve({
            data: null,
            error: this.scenario.storageDeleteError ?? null,
          });
        },
      };
    },
  };
}

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
  const missionId = "mission-1";
  const mediaId = "media-1";
  return {
    mission: {
      id: missionId,
      customer_id: "customer-1",
      assigned_reoc_id: "reoc-1",
      status: "flown",
    },
    operatorReocId: "reoc-1",
    mediaRow: {
      id: mediaId,
      mission_id: missionId,
      uploaded_by: "operator-user-1",
      visibility: "held",
      storage_path: `missions/${missionId}/${mediaId}/photo.jpg`,
    },
    deleteMatchedRows: 1,
    storageDeleteError: null,
    role: "operator",
    userId: "operator-user-1",
    ...overrides,
  };
}

function makeDeleteContext(scenario: Scenario): TestContext {
  const admin = new FakeAdminClient(scenario);
  const routeClient = toRouteClient(admin);
  return {
    admin,
    ctx: {
      cors: {},
      admin: routeClient,
      userClient: routeClient,
      userId: scenario.userId,
      role: scenario.role,
    },
  };
}

function findFilterValue(filters: FilterEntry[], column: string): unknown {
  const entry = filters.find((filter) => filter.column === column);
  return entry?.value;
}

describe("deleteMissionMedia route safety", () => {
  it("returns media_already_released without delete or storage calls when row is released at read time", async () => {
    const { ctx, admin } = makeDeleteContext(
      makeScenario({
        mediaRow: {
          id: "media-1",
          mission_id: "mission-1",
          uploaded_by: "operator-user-1",
          visibility: "released",
          storage_path: "missions/mission-1/media-1/photo.jpg",
        },
      }),
    );

    const response = await deleteMissionMedia("mission-1", "media-1", ctx);
    expect(response.status).toBe(409);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("media_already_released");
    expect(admin.deleteAttempted).toBe(false);
    expect(admin.storageRemoveCalls).toEqual([]);
  });

  it("returns media_not_deletable and never removes storage when conditional held delete matches zero rows", async () => {
    const { ctx, admin } = makeDeleteContext(
      makeScenario({
        deleteMatchedRows: 0,
      }),
    );

    const response = await deleteMissionMedia("mission-1", "media-1", ctx);
    expect(response.status).toBe(409);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("media_not_deletable");
    expect(admin.storageRemoveCalls).toEqual([]);
  });

  it("denies customer deletes before media lookup and side effects", async () => {
    const { ctx, admin } = makeDeleteContext(
      makeScenario({
        role: "customer",
        userId: "customer-user-1",
      }),
    );

    const response = await deleteMissionMedia("mission-1", "media-1", ctx);
    expect(response.status).toBe(403);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("forbidden_media_delete");
    expect(admin.mediaLookupAttempted).toBe(false);
    expect(admin.deleteAttempted).toBe(false);
    expect(admin.storageRemoveCalls).toEqual([]);
  });

  it("denies unassigned operator deletes before media lookup and side effects", async () => {
    const { ctx, admin } = makeDeleteContext(
      makeScenario({
        role: "operator",
        userId: "operator-user-1",
        mission: {
          id: "mission-1",
          customer_id: "customer-1",
          assigned_reoc_id: "reoc-2",
          status: "flown",
        },
        operatorReocId: "reoc-1",
      }),
    );

    const response = await deleteMissionMedia("mission-1", "media-1", ctx);
    expect(response.status).toBe(403);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("forbidden_media_delete");
    expect(admin.mediaLookupAttempted).toBe(false);
    expect(admin.deleteAttempted).toBe(false);
    expect(admin.storageRemoveCalls).toEqual([]);
  });

  it("treats missing media row as idempotent success without storage removal", async () => {
    const { ctx, admin } = makeDeleteContext(
      makeScenario({
        mediaRow: null,
      }),
    );

    const response = await deleteMissionMedia("mission-1", "media-1", ctx);
    expect(response.status).toBe(200);
    const payload = await parseResponsePayload(response);
    expect(payload.ok).toBe(true);
    expect(payload.storageRemoved).toBe(false);
    expect(isRecord(payload.cleanup)).toBe(true);
    if (!isRecord(payload.cleanup)) {
      throw new Error("cleanup_note_missing");
    }
    expect(payload.cleanup.code).toBe("media_already_absent");
    expect(admin.deleteAttempted).toBe(false);
    expect(admin.storageRemoveCalls).toEqual([]);
  });

  it("deletes held uploader media with held filter before storage removal", async () => {
    const scenario = makeScenario();
    const { ctx, admin } = makeDeleteContext(scenario);

    const response = await deleteMissionMedia("mission-1", "media-1", ctx);
    expect(response.status).toBe(200);
    const payload = await parseResponsePayload(response);
    expect(payload.ok).toBe(true);
    expect(payload.storageRemoved).toBe(true);
    expect(payload.cleanup).toBeUndefined();
    expect(findFilterValue(admin.deleteFilters, "id")).toBe("media-1");
    expect(findFilterValue(admin.deleteFilters, "mission_id")).toBe("mission-1");
    expect(findFilterValue(admin.deleteFilters, "visibility")).toBe("held");
    expect(admin.storageBuckets).toEqual([MEDIA_BUCKET]);
    if (!scenario.mediaRow) {
      throw new Error("scenario_media_missing");
    }
    expect(admin.storageRemoveCalls).toEqual([[scenario.mediaRow.storage_path]]);
    expect(admin.operationLog).toEqual(["db_delete", "storage_remove"]);
  });

  it("returns success with cleanup warning when storage deletion fails after row delete", async () => {
    const scenario = makeScenario({
      storageDeleteError: { message: "storage remove failed" },
    });
    const { ctx, admin } = makeDeleteContext(scenario);

    const response = await deleteMissionMedia("mission-1", "media-1", ctx);
    expect(response.status).toBe(200);
    const payload = await parseResponsePayload(response);
    expect(payload.ok).toBe(true);
    expect(payload.storageRemoved).toBe(false);
    expect(isRecord(payload.cleanup)).toBe(true);
    if (!isRecord(payload.cleanup)) {
      throw new Error("cleanup_warning_missing");
    }
    expect(payload.cleanup.code).toBe("media_storage_delete_failed");
    expect(admin.operationLog).toEqual(["db_delete", "storage_remove"]);
  });

  it("returns forbidden_media_delete_uploader for held non-uploader operator without delete or storage calls", async () => {
    const { ctx, admin } = makeDeleteContext(
      makeScenario({
        mediaRow: {
          id: "media-1",
          mission_id: "mission-1",
          uploaded_by: "operator-user-2",
          visibility: "held",
          storage_path: "missions/mission-1/media-1/photo.jpg",
        },
      }),
    );

    const response = await deleteMissionMedia("mission-1", "media-1", ctx);
    expect(response.status).toBe(403);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("forbidden_media_delete_uploader");
    expect(admin.deleteAttempted).toBe(false);
    expect(admin.storageRemoveCalls).toEqual([]);
  });
});
