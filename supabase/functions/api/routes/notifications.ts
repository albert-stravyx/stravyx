import { json } from "../http.ts";
import type { RequestContext } from "../client.ts";

interface NotificationLocationRow {
  suburb?: unknown;
}

interface NotificationMissionRow {
  customer_id?: unknown;
  mission_locations?: NotificationLocationRow | NotificationLocationRow[] | null;
}

interface NotificationEventRow {
  id?: unknown;
  mission_id?: unknown;
  to_status?: unknown;
  created_at?: unknown;
  missions?: NotificationMissionRow | NotificationMissionRow[] | null;
}

function normalizeSuburb(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function firstMission(missions: NotificationEventRow["missions"]): NotificationMissionRow | null {
  if (!missions) {
    return null;
  }
  if (Array.isArray(missions)) {
    return missions[0] ?? null;
  }
  return missions;
}

function firstLocation(
  locations: NotificationMissionRow["mission_locations"],
): NotificationLocationRow | null {
  if (!locations) {
    return null;
  }
  if (Array.isArray(locations)) {
    return locations[0] ?? null;
  }
  return locations;
}

export async function listCustomerNotifications(ctx: RequestContext): Promise<Response> {
  const { cors, admin, userId, role } = ctx;

  if (role !== "customer") {
    return json({
      error: "Forbidden",
      code: "forbidden_notifications_role",
      detail: "Notifications are for customers only",
    }, 403, cors);
  }

  const { data, error } = await admin
    .from("mission_status_events")
    .select(
      "id, mission_id, to_status, created_at, missions!inner(customer_id, mission_locations(suburb))",
    )
    .eq("missions.customer_id", userId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);

  if (error) {
    return json({
      error: "Failed to load notifications",
      code: "notifications_query_failed",
      detail: error.message,
    }, 500, cors);
  }

  const notifications: Array<{
    id: string;
    missionId: string;
    suburb: string | null;
    toStatus: string;
    createdAt: string;
  }> = [];

  for (const candidate of Array.isArray(data) ? data : []) {
    const row = candidate as NotificationEventRow;
    if (
      typeof row.id !== "string" ||
      typeof row.mission_id !== "string" ||
      typeof row.to_status !== "string" ||
      typeof row.created_at !== "string"
    ) {
      console.error("[notifications-route]", "notifications_row_invalid", {
        rowId: typeof row.id === "string" ? row.id : null,
      });
      continue;
    }

    const mission = firstMission(row.missions);
    const location = firstLocation(mission?.mission_locations);
    notifications.push({
      id: row.id,
      missionId: row.mission_id,
      suburb: normalizeSuburb(location?.suburb),
      toStatus: row.to_status,
      createdAt: row.created_at,
    });
  }

  return json({ notifications }, 200, cors);
}
