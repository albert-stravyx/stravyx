import type { RequestContext } from "../client.ts";
import { json } from "../http.ts";
import { loadReocForCaller, logCredentialError, parseJsonBody } from "./operatorCredentialsShared.ts";

export async function setOperatorAvailability(
  req: Request,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, role, userId } = ctx;
  if (role !== "operator") {
    return json({
      error: "Forbidden",
      code: "forbidden",
      detail: "Only operators can change availability",
    }, 403, cors);
  }

  const body = await parseJsonBody(req);
  if (!body) {
    return json({
      error: "Invalid request body",
      code: "invalid_body",
      detail: "Expected a JSON object body",
    }, 400, cors);
  }
  if (typeof body.online !== "boolean") {
    return json({
      error: "Invalid availability",
      code: "invalid_availability",
      detail: "online must be a boolean",
    }, 400, cors);
  }

  const loaded = await loadReocForCaller(ctx);
  if (!loaded.ok) return loaded.response;
  const reoc = loaded.reoc;
  if (!reoc.verified) {
    return json({
      error: "Operator is not verified",
      code: "operator_not_verified",
      detail: "Go online after a Stravyx admin verifies your credentials",
    }, 403, cors);
  }

  const { data, error } = await admin
    .from("reoc_profiles")
    .update({ online: body.online })
    .eq("id", reoc.id)
    .eq("owner_user_id", userId)
    .eq("verified", true)
    .select("id, online");
  if (error) {
    logCredentialError("availability_update_failed", { reocId: reoc.id }, error);
    return json({
      error: "Failed to update availability",
      code: "availability_update_failed",
    }, 500, cors);
  }
  if (!Array.isArray(data) || data.length === 0) {
    return json({
      error: "Operator is not verified",
      code: "operator_not_verified",
      detail: "Go online after a Stravyx admin verifies your credentials",
    }, 403, cors);
  }
  const updated = data[0];
  const online = Boolean(
    updated && typeof updated === "object" && "online" in updated && updated.online === true,
  );

  return json({
    ok: true,
    reocId: reoc.id,
    online,
  }, 200, cors);
}
