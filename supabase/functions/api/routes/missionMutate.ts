import { json } from "../http.ts";
import {
  assertCanMutateMission,
  canTransitionDemoMissionStatus,
  isDemoStatusTransition,
} from "../missionAuthz.ts";
import type { RequestContext } from "../client.ts";

export async function advanceMissionStatus(
  missionId: string,
  req: Request,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, userId, role } = ctx;

  const body = await req.json();
  const toStatus = String(body.status);
  if (!isDemoStatusTransition(toStatus)) {
    return json({ error: "Invalid status transition for demo" }, 400, cors);
  }
  if (toStatus === "delivered") {
    return json({
      error: "Delivered status must use dedicated deliver endpoint",
      code: "use_deliver_endpoint",
      detail: "Call POST /missions/:id/deliver to release confirmed media and deliver",
    }, 409, cors);
  }
  const { data: mission } = await admin
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();
  if (!mission) return json({ error: "Not found" }, 404, cors);
  if (!canTransitionDemoMissionStatus(String(mission.status), toStatus)) {
    return json({
      error: "Invalid mission status transition",
      code: "invalid_status_transition",
      detail: "Mission can only transition to delivered from flown",
      fromStatus: mission.status,
      toStatus,
    }, 409, cors);
  }

  const denied = await assertCanMutateMission(admin, mission, userId, role, cors);
  if (denied) return denied;

  await admin
    .from("missions")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", missionId);
  await admin.from("mission_status_events").insert({
    mission_id: missionId,
    from_status: mission.status,
    to_status: toStatus,
    actor_id: userId,
  });
  return json({ ok: true, missionId, status: toStatus }, 200, cors);
}
