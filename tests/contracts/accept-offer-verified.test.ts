import { describe, expect, it } from "vitest";
import type { RequestContext } from "../../supabase/functions/api/client.ts";
import { acceptOffer } from "../../supabase/functions/api/routes/acceptOffer.ts";

interface OfferRow {
  id: string;
  status: string;
  mission_id: string;
  reoc_profile_id: string;
  reoc_profiles: { owner_user_id: string; verified: boolean };
}

interface QueryError {
  message: string;
}

interface QueryResult<T> {
  data: T;
  error: QueryError | null;
}

interface FilterEntry {
  column: string;
  op: "eq" | "neq";
  value: unknown;
}

interface UpdateCall {
  table: string;
  payload: Record<string, unknown>;
  filters: FilterEntry[];
}

interface Scenario {
  offer: OfferRow | null;
  userId: string;
  role: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRouteClientLike(value: unknown): value is Pick<RequestContext["admin"], "from"> {
  return isRecord(value) && typeof value.from === "function";
}

function toRouteClient(value: unknown): RequestContext["admin"] {
  if (!isRouteClientLike(value)) {
    throw new Error("fake_admin_shape_invalid");
  }
  return value as RequestContext["admin"];
}

async function parseResponsePayload(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error("response_payload_not_object");
  return payload;
}

class FakeQueryBuilder {
  #filters: FilterEntry[] = [];
  #operation: "select" | "update" | "insert" = "select";
  #payload: Record<string, unknown> | null = null;

  constructor(
    private readonly admin: FakeAdminClient,
    private readonly table: string,
  ) {}

  select(_columns: string): FakeQueryBuilder {
    this.#operation = "select";
    return this;
  }

  update(payload: Record<string, unknown>): FakeQueryBuilder {
    this.#operation = "update";
    this.#payload = payload;
    this.admin.offerUpdateAttempted = this.table === "mission_offers";
    return this;
  }

  insert(payload: Record<string, unknown>): Promise<QueryResult<null>> {
    this.admin.insertCalls.push({ table: this.table, payload });
    return Promise.resolve({ data: null, error: null });
  }

  eq(column: string, value: unknown): FakeQueryBuilder {
    this.#filters.push({ column, op: "eq", value });
    return this;
  }

  neq(column: string, value: unknown): FakeQueryBuilder {
    this.#filters.push({ column, op: "neq", value });
    return this;
  }

  single(): Promise<QueryResult<unknown>> {
    return this.#execute();
  }

  then<TResult1 = QueryResult<unknown>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<unknown>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.#execute().then(onfulfilled, onrejected);
  }

  #execute(): Promise<QueryResult<unknown>> {
    if (this.#operation === "update") {
      this.admin.updateCalls.push({
        table: this.table,
        payload: this.#payload ?? {},
        filters: [...this.#filters],
      });
      return Promise.resolve({ data: null, error: null });
    }
    if (this.table === "mission_offers") {
      if (!this.admin.scenario.offer) {
        return Promise.resolve({ data: null, error: { message: "not found" } });
      }
      return Promise.resolve({ data: this.admin.scenario.offer, error: null });
    }
    if (this.table === "mission_locations") {
      return Promise.resolve({
        data: { full_address: "1 Martin Place", suburb: "Sydney" },
        error: null,
      });
    }
    return Promise.resolve({ data: null, error: null });
  }
}

class FakeAdminClient {
  offerUpdateAttempted = false;
  updateCalls: UpdateCall[] = [];
  insertCalls: Array<{ table: string; payload: Record<string, unknown> }> = [];

  constructor(readonly scenario: Scenario) {}

  from(table: string): FakeQueryBuilder {
    return new FakeQueryBuilder(this, table);
  }
}

function makeOffer(overrides: Partial<OfferRow> = {}): OfferRow {
  return {
    id: "offer-1",
    status: "sent",
    mission_id: "mission-1",
    reoc_profile_id: "reoc-1",
    reoc_profiles: { owner_user_id: "operator-1", verified: true },
    ...overrides,
  };
}

function makeContext(scenario: Scenario): { ctx: RequestContext; admin: FakeAdminClient } {
  const admin = new FakeAdminClient(scenario);
  return {
    admin,
    ctx: {
      cors: {},
      admin: toRouteClient(admin),
      userClient: toRouteClient(admin),
      userId: scenario.userId,
      role: scenario.role,
    },
  };
}

describe("acceptOffer verified guard", () => {
  it("returns 403 operator_not_verified for an unverified owner and does not update the offer", async () => {
    const { ctx, admin } = makeContext({
      userId: "operator-1",
      role: "operator",
      offer: makeOffer({
        reoc_profiles: { owner_user_id: "operator-1", verified: false },
      }),
    });

    const response = await acceptOffer("offer-1", ctx);
    expect(response.status).toBe(403);
    const payload = await parseResponsePayload(response);
    expect(payload.code).toBe("operator_not_verified");
    expect(payload.error).toBe("Operator not verified");
    expect(payload.detail).toBeTruthy();
    expect(admin.offerUpdateAttempted).toBe(false);
    expect(admin.updateCalls).toEqual([]);
    expect(admin.insertCalls).toEqual([]);
  });

  it("proceeds for a verified owner with a sent offer", async () => {
    const { ctx, admin } = makeContext({
      userId: "operator-1",
      role: "operator",
      offer: makeOffer(),
    });

    const response = await acceptOffer("offer-1", ctx);
    expect(response.status).toBe(200);
    const payload = await parseResponsePayload(response);
    expect(payload.ok).toBe(true);
    expect(payload.missionId).toBe("mission-1");
    expect(admin.offerUpdateAttempted).toBe(true);
    const acceptUpdate = admin.updateCalls.find((call) => call.table === "mission_offers");
    expect(acceptUpdate).toBeTruthy();
    expect(acceptUpdate?.payload.status).toBe("accepted");
    expect(acceptUpdate?.filters).toEqual(
      expect.arrayContaining([
        { column: "id", op: "eq", value: "offer-1" },
        { column: "status", op: "eq", value: "sent" },
      ]),
    );
  });

  it("returns 403 Forbidden for a non-owner without running the CAS update", async () => {
    const { ctx, admin } = makeContext({
      userId: "other-operator",
      role: "operator",
      offer: makeOffer(),
    });

    const response = await acceptOffer("offer-1", ctx);
    expect(response.status).toBe(403);
    const payload = await parseResponsePayload(response);
    expect(payload.error).toBe("Forbidden");
    expect(payload.code).toBeUndefined();
    expect(admin.offerUpdateAttempted).toBe(false);
    expect(admin.updateCalls).toEqual([]);
  });
});
