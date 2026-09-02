import { json } from "../http.ts";
import type { RequestContext } from "../client.ts";

interface OfferReocJoin {
  owner_user_id: unknown;
  verified: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readOfferReoc(offer: Record<string, unknown>): OfferReocJoin | null {
  const joined = offer.reoc_profiles;
  if (isRecord(joined)) {
    return {
      owner_user_id: joined.owner_user_id,
      verified: joined.verified,
    };
  }
  if (Array.isArray(joined) && joined.length > 0 && isRecord(joined[0])) {
    return {
      owner_user_id: joined[0].owner_user_id,
      verified: joined[0].verified,
    };
  }
  return null;
}

/**
 * First-to-accept dispatch. The conditional update on `status = 'sent'` is the
 * race guard: a second accepter finds no matching row and gets 409.
 * Unverified owners are refused before the CAS update.
 */
export async function acceptOffer(
  offerId: string,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, userId } = ctx;

  const { data: offer, error: oErr } = await admin
    .from("mission_offers")
    .select("*, reoc_profiles!inner(owner_user_id, verified)")
    .eq("id", offerId)
    .single();
  if (oErr || !offer || !isRecord(offer)) {
    return json({ error: "Offer not found" }, 404, cors);
  }
  const reoc = readOfferReoc(offer);
  if (!reoc || reoc.owner_user_id !== userId) {
    return json({ error: "Forbidden" }, 403, cors);
  }
  if (reoc.verified !== true) {
    console.info("[accept-offer]", "operator_offer_blocked_unverified", {
      offerId,
      userId,
    });
    return json({
      error: "Operator not verified",
      code: "operator_not_verified",
      detail: "Operator must be verified before accepting jobs",
    }, 403, cors);
  }
  if (offer.status !== "sent") {
    return json({ error: "Offer not open", status: offer.status }, 409, cors);
  }

  const { error: acceptErr } = await admin
    .from("mission_offers")
    .update({ status: "accepted", responded_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("status", "sent");
  if (acceptErr) {
    return json({ error: "Mission already taken", detail: acceptErr.message }, 409, cors);
  }

  await admin
    .from("missions")
    .update({
      status: "accepted",
      assigned_reoc_id: offer.reoc_profile_id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", offer.mission_id);

  await admin
    .from("mission_offers")
    .update({ status: "taken" })
    .eq("mission_id", offer.mission_id)
    .neq("id", offerId)
    .eq("status", "sent");

  await admin.from("mission_status_events").insert({
    mission_id: offer.mission_id,
    from_status: "dispatched",
    to_status: "accepted",
    actor_id: userId,
  });

  const { data: loc } = await admin
    .from("mission_locations")
    .select("*")
    .eq("mission_id", offer.mission_id)
    .single();

  const location = isRecord(loc) ? loc : null;

  return json({
    ok: true,
    missionId: offer.mission_id,
    fullAddress: location?.full_address,
    suburb: location?.suburb,
  }, 200, cors);
}
