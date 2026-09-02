import { json } from "../http.ts";
import { networkPriceCents, splitFromNetwork, suburbFromAddress } from "../pricing.ts";
import type { RequestContext } from "../client.ts";
import { applyFanOutReocQuery } from "../fanOutReocs.ts";

export async function createMission(
  req: Request,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, userClient, userId } = ctx;
  const body = await req.json();
  const durationMinutes = Number(body.durationMinutes ?? 60);
  const urgencyCode = String(body.urgency ?? "standard");
  const fullAddress = String(body.fullAddress ?? "1 Martin Place, Sydney NSW 2000");
  const suburb = String(body.suburb ?? suburbFromAddress(fullAddress));
  const categoryCode = String(body.categoryCode ?? "aerial_photo");
  // Description is optional free text; absence is a domain state, not a failure.
  const description = typeof body.description === "string" ? body.description : "";

  // Catalogue is readable by authenticated; prefer user-scoped client.
  const { data: urgency, error: uErr } = await userClient
    .from("urgency_tiers")
    .select("*")
    .eq("code", urgencyCode)
    .maybeSingle();
  if (uErr || !urgency) {
    return json({
      error: "Invalid urgency",
      detail: uErr?.message,
      code: urgencyCode,
    }, 400, cors);
  }

  const { data: category, error: cErr } = await userClient
    .from("mission_categories")
    .select("*")
    .eq("code", categoryCode)
    .maybeSingle();
  if (cErr || !category) {
    return json({ error: "Invalid category", detail: cErr?.message }, 400, cors);
  }

  const { data: pricing, error: pErr } = await userClient
    .from("pricing_configs")
    .select("*")
    .eq("is_active", true)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pErr || !pricing) {
    return json({ error: "No active pricing config", detail: pErr?.message }, 500, cors);
  }

  const equipmentFactor = Number(category.equipment_factor ?? 1);
  const network = networkPriceCents(
    durationMinutes,
    urgencyCode,
    equipmentFactor,
    pricing.base_rate_cents_per_hour,
  );
  const split = splitFromNetwork(network);

  const { data: mission, error: mErr } = await admin
    .from("missions")
    .insert({
      customer_id: userId,
      category_id: category.id,
      urgency_tier_id: urgency.id,
      pricing_config_id: pricing.id,
      status: "booked",
      duration_minutes: durationMinutes,
      equipment_factor: equipmentFactor,
      network_price_cents: network,
      flight_fee_cents: split.flightFeeCents,
      layer2_cents: split.layer2Cents,
      description,
    })
    .select("*")
    .single();
  if (mErr || !mission) {
    return json({ error: mErr?.message ?? "mission insert failed" }, 500, cors);
  }

  await admin.from("mission_locations").insert({
    mission_id: mission.id,
    suburb,
    full_address: fullAddress,
    lat: body.lat ?? -33.8688,
    lng: body.lng ?? 151.2093,
  });

  await admin.from("payments").insert({
    mission_id: mission.id,
    amount_cents: network,
    status: "mock_held",
    provider_payment_ref: `mock_${mission.id}`,
  });

  await admin.from("mission_status_events").insert({
    mission_id: mission.id,
    from_status: "draft",
    to_status: "booked",
    actor_id: userId,
    note: "mock pay hold",
  });

  // Fan-out to online verified ReOCs
  const { data: reocs } = await applyFanOutReocQuery(
    admin.from("reoc_profiles").select("id"),
  );

  const expiresAt = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
  if (reocs?.length) {
    await admin.from("mission_offers").insert(
      reocs.map((r) => ({
        mission_id: mission.id,
        reoc_profile_id: r.id,
        status: "sent",
        expires_at: expiresAt,
      })),
    );
    await admin
      .from("missions")
      .update({ status: "dispatched" })
      .eq("id", mission.id);
    await admin.from("mission_status_events").insert({
      mission_id: mission.id,
      from_status: "booked",
      to_status: "dispatched",
      actor_id: userId,
    });
  }

  // Customer response: single Network Price only
  return json({
    id: mission.id,
    status: reocs?.length ? "dispatched" : "booked",
    networkPriceCents: network,
    currency: "AUD",
    urgency: urgencyCode,
    suburb,
    durationMinutes,
  }, 200, cors);
}
