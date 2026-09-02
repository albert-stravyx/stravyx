import { describe, expect, it } from "vitest";
import {
  assertNoLeak,
  notificationCopyForStatus,
  type CustomerNotificationItem,
} from "@stravyx/types";
import type { RequestContext } from "../../supabase/functions/api/client.ts";
import { listCustomerNotifications } from "../../supabase/functions/api/routes/notifications.ts";

interface QueryError {
  message: string;
}

interface MissionLocationRow {
  suburb: string | null;
}

interface MissionJoinRow {
  customer_id: string;
  mission_locations: MissionLocationRow | MissionLocationRow[] | null;
}

interface EventRow {
  id?: string;
  mission_id?: string;
  to_status?: string;
  created_at?: string;
  missions?: MissionJoinRow | MissionJoinRow[] | null;
}

interface QueryState {
  selectArg: string | null;
  eqArgs: Array<[string, unknown]>;
  orderArgs: Array<[string, { ascending: boolean }]>;
  limitArg: number | null;
}

interface QueryResult {
  data: EventRow[] | null;
  error: QueryError | null;
}

interface Scenario {
  role: "customer" | "operator" | "admin";
  userId: string;
  rows: EventRow[];
  queryError: QueryError | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

class FakeNotificationsQuery {
  #eqFilters: Array<[string, unknown]> = [];
  #orderClauses: Array<[string, { ascending: boolean }]> = [];
  #limit: number | null = null;
  #selectArg: string | null = null;

  constructor(private readonly admin: FakeAdminClient) {}

  select(columns: string): this {
    this.#selectArg = columns;
    return this;
  }

  eq(column: string, value: unknown): this {
    this.#eqFilters.push([column, value]);
    return this;
  }

  order(column: string, options: { ascending: boolean }): this {
    this.#orderClauses.push([column, options]);
    return this;
  }

  limit(value: number): Promise<QueryResult> {
    this.#limit = value;
    this.admin.lastQuery = {
      selectArg: this.#selectArg,
      eqArgs: [...this.#eqFilters],
      orderArgs: [...this.#orderClauses],
      limitArg: this.#limit,
    };

    if (this.admin.scenario.queryError) {
      return Promise.resolve({ data: null, error: this.admin.scenario.queryError });
    }

    let rows = [...this.admin.scenario.rows];
    for (const [column, value] of this.#eqFilters) {
      if (column === "missions.customer_id") {
        rows = rows.filter((row) => {
          const mission = Array.isArray(row.missions) ? row.missions[0] : row.missions;
          return mission?.customer_id === value;
        });
      }
    }

    rows.sort((left, right) => {
      for (const [column, options] of this.#orderClauses) {
        const leftValue = column === "created_at" ? left.created_at ?? "" : left.id ?? "";
        const rightValue = column === "created_at" ? right.created_at ?? "" : right.id ?? "";
        if (leftValue === rightValue) {
          continue;
        }
        const direction = options.ascending ? 1 : -1;
        return leftValue > rightValue ? direction : -direction;
      }
      return 0;
    });

    const limitedRows = this.#limit === null ? rows : rows.slice(0, this.#limit);
    return Promise.resolve({ data: limitedRows, error: null });
  }
}

class FakeAdminClient {
  fromCalls: string[] = [];
  lastQuery: QueryState | null = null;

  constructor(readonly scenario: Scenario) {}

  from(table: string): FakeNotificationsQuery {
    this.fromCalls.push(table);
    return new FakeNotificationsQuery(this);
  }
}

function asRouteClient(value: unknown): RequestContext["admin"] {
  if (!isRecord(value) || typeof value.from !== "function") {
    throw new Error("fake_admin_shape_invalid");
  }
  return value as RequestContext["admin"];
}

function makeContext(scenario: Scenario): { admin: FakeAdminClient; ctx: RequestContext } {
  const admin = new FakeAdminClient(scenario);
  const routeClient = asRouteClient(admin);
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

async function parsePayload(response: Response): Promise<Record<string, unknown>> {
  const payload: unknown = await response.json();
  if (!isRecord(payload)) {
    throw new Error("response_payload_not_object");
  }
  return payload;
}

describe("customer notifications contracts", () => {
  it("maps copy strings exactly for known/unknown statuses and suburb variants", () => {
    expect(notificationCopyForStatus("booked", "Richmond")).toEqual({
      title: "Job booked",
      body: "Your job in Richmond is booked.",
    });
    expect(notificationCopyForStatus("dispatched", "Richmond")).toEqual({
      title: "Finding an operator",
      body: "We're matching an operator for your job in Richmond.",
    });
    expect(notificationCopyForStatus("accepted", "Richmond")).toEqual({
      title: "Operator assigned",
      body: "An operator has accepted your job in Richmond.",
    });
    expect(notificationCopyForStatus("allocated", "Richmond")).toEqual({
      title: "Operator on the way",
      body: "Your operator is heading to Richmond.",
    });
    expect(notificationCopyForStatus("flown", "Richmond")).toEqual({
      title: "Flight complete",
      body: "The flight for your job in Richmond is complete.",
    });
    expect(notificationCopyForStatus("delivered", "Richmond")).toEqual({
      title: "Your data is ready",
      body: "Deliverables for your job in Richmond are ready to view.",
    });
    expect(notificationCopyForStatus("dispatched", null)).toEqual({
      title: "Finding an operator",
      body: "We're matching an operator for your job.",
    });
    expect(notificationCopyForStatus("accepted", "").body).toBe(
      "An operator has accepted your job.",
    );
    expect(notificationCopyForStatus("draft", null).title).toBe("Job update");
    expect(notificationCopyForStatus("something-else", "Richmond")).toEqual({
      title: "Job update",
      body: "There's an update on your job in Richmond.",
    });
    expect(JSON.stringify(notificationCopyForStatus("accepted", "Richmond"))).not.toMatch(
      /\$|cents|Network Price|flight fee/i,
    );
  });

  it("keeps projected notification fields leak-free", () => {
    const item: CustomerNotificationItem = {
      id: "event-1",
      missionId: "mission-1",
      suburb: "Richmond",
      toStatus: "accepted",
      createdAt: "2026-08-23T02:00:00.000Z",
    };

    assertNoLeak("customer", item);
    expect(Object.keys(item).sort()).toEqual([
      "createdAt",
      "id",
      "missionId",
      "suburb",
      "toStatus",
    ]);
    expect(() => assertNoLeak("customer", { ...item, flightFeeCents: 1 })).toThrow(
      /flightFeeCents/,
    );
    const blob = JSON.stringify(item);
    expect(blob).not.toMatch(
      /networkPriceCents|flightFeeCents|layer2Cents|operatorEarnCents|fullAddress|from_status|actor_id/,
    );
  });

  it("returns 403 for operator/admin and does not query", async () => {
    for (const role of ["operator", "admin"] as const) {
      const { admin, ctx } = makeContext({
        role,
        userId: "user-1",
        rows: [],
        queryError: null,
      });

      const response = await listCustomerNotifications(ctx);
      expect(response.status).toBe(403);
      const payload = await parsePayload(response);
      expect(payload.error).toBe("Forbidden");
      expect(payload.code).toBe("forbidden_notifications_role");
      expect(payload.detail).toBe("Notifications are for customers only");
      expect(admin.fromCalls).toEqual([]);
    }
  });

  it("returns customer notifications newest-first with suburb mapping and customer filter", async () => {
    const { ctx, admin } = makeContext({
      role: "customer",
      userId: "customer-user-1",
      queryError: null,
      rows: [
        {
          id: "older-id",
          mission_id: "mission-older",
          to_status: "booked",
          created_at: "2026-08-23T01:00:00.000Z",
          missions: {
            customer_id: "customer-user-1",
            mission_locations: null,
          },
        },
        {
          id: "newer-id",
          mission_id: "mission-new",
          to_status: "accepted",
          created_at: "2026-08-23T02:00:00.000Z",
          missions: {
            customer_id: "customer-user-1",
            mission_locations: { suburb: "Richmond" },
          },
        },
        {
          id: "other-customer-id",
          mission_id: "mission-other",
          to_status: "allocated",
          created_at: "2026-08-23T03:00:00.000Z",
          missions: {
            customer_id: "customer-user-2",
            mission_locations: { suburb: "Adelaide" },
          },
        },
      ],
    });

    const response = await listCustomerNotifications(ctx);
    expect(response.status).toBe(200);
    const payload = await parsePayload(response);
    expect(Array.isArray(payload.notifications)).toBe(true);
    if (!Array.isArray(payload.notifications)) {
      throw new Error("notifications_not_array");
    }
    expect(payload.notifications).toHaveLength(2);
    expect(payload.notifications[0]).toEqual({
      id: "newer-id",
      missionId: "mission-new",
      suburb: "Richmond",
      toStatus: "accepted",
      createdAt: "2026-08-23T02:00:00.000Z",
    });
    expect(payload.notifications[1]).toEqual({
      id: "older-id",
      missionId: "mission-older",
      suburb: null,
      toStatus: "booked",
      createdAt: "2026-08-23T01:00:00.000Z",
    });
    expect(payload.notifications[0]).not.toHaveProperty("title");
    expect(payload.notifications[0]).not.toHaveProperty("fullAddress");
    expect(payload.notifications.map((item) => (item as { id: string }).id)).not.toContain(
      "other-customer-id",
    );
    assertNoLeak("customer", payload.notifications[0]);
    expect(admin.fromCalls).toEqual(["mission_status_events"]);
    expect(admin.lastQuery?.eqArgs).toContainEqual(["missions.customer_id", "customer-user-1"]);
    expect(admin.lastQuery?.limitArg).toBe(50);
    expect(admin.lastQuery?.orderArgs[0]).toEqual(["created_at", { ascending: false }]);
    expect(admin.lastQuery?.orderArgs[1]).toEqual(["id", { ascending: false }]);
  });

  it("returns 500 query failure and no notifications field", async () => {
    const { ctx } = makeContext({
      role: "customer",
      userId: "customer-user-1",
      rows: [],
      queryError: { message: "boom" },
    });

    const response = await listCustomerNotifications(ctx);
    expect(response.status).toBe(500);
    const payload = await parsePayload(response);
    expect(payload.code).toBe("notifications_query_failed");
    expect(payload.notifications).toBeUndefined();
  });

  it("returns empty notifications array when no rows", async () => {
    const { ctx } = makeContext({
      role: "customer",
      userId: "customer-user-1",
      rows: [],
      queryError: null,
    });

    const response = await listCustomerNotifications(ctx);
    expect(response.status).toBe(200);
    const payload = await parsePayload(response);
    expect(payload.notifications).toEqual([]);
  });

  it("skips invalid rows without failing the full list", async () => {
    const { ctx } = makeContext({
      role: "customer",
      userId: "customer-user-1",
      queryError: null,
      rows: [
        {
          id: "valid-id",
          mission_id: "mission-valid",
          to_status: "accepted",
          created_at: "2026-08-23T02:00:00.000Z",
          missions: {
            customer_id: "customer-user-1",
            mission_locations: { suburb: "Richmond" },
          },
        },
        {
          id: "missing-status",
          mission_id: "mission-missing",
          created_at: "2026-08-23T01:00:00.000Z",
          missions: {
            customer_id: "customer-user-1",
            mission_locations: { suburb: "Richmond" },
          },
        },
      ],
    });

    const response = await listCustomerNotifications(ctx);
    expect(response.status).toBe(200);
    const payload = await parsePayload(response);
    expect(payload.notifications).toEqual([
      {
        id: "valid-id",
        missionId: "mission-valid",
        suburb: "Richmond",
        toStatus: "accepted",
        createdAt: "2026-08-23T02:00:00.000Z",
      },
    ]);
  });
});
