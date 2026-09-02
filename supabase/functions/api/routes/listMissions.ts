import { json } from "../http.ts";
import type { RequestContext } from "../client.ts";

/**
 * Role-projected mission list. Each branch returns only the fields that role is
 * permitted to see — the money firewall is enforced here, not in the client.
 */
export async function listMissions(ctx: RequestContext): Promise<Response> {
  const { cors, admin, userId, role } = ctx;

  if (role === "admin") {
    const { data, error } = await admin
      .from("missions")
      .select("*, mission_locations(*), urgency_tiers(code)")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error || !data) {
      return json({
        error: "Failed to load missions",
        detail: error?.message ?? "no_rows_returned",
      }, 500, cors);
    }
    const rows = data.map((m) => ({
      missionId: m.id,
      status: m.status,
      networkPriceCents: m.network_price_cents,
      flightFeeCents: m.flight_fee_cents,
      layer2Cents: m.layer2_cents,
      operatorEarnCents: Math.round(Number(m.flight_fee_cents) * 0.85),
      platformFeeCents:
        Number(m.flight_fee_cents) -
        Math.round(Number(m.flight_fee_cents) * 0.85),
      fullAddress: m.mission_locations?.full_address,
      suburb: m.mission_locations?.suburb,
      urgency: m.urgency_tiers?.code ?? "standard",
      durationMinutes: m.duration_minutes,
      description: m.description,
      createdAt: m.created_at,
    }));
    return json({ missions: rows }, 200, cors);
  }

  if (role === "operator") {
    const { data: reoc } = await admin
      .from("reoc_profiles")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();
    if (!reoc) return json({ offers: [] }, 200, cors);
    const { data: offers, error } = await admin
      .from("mission_offers")
      .select(
        "*, missions(*, mission_locations(*), urgency_tiers(code))",
      )
      .eq("reoc_profile_id", reoc.id)
      .in("status", ["sent", "accepted"])
      .order("offered_at", { ascending: false });
    if (error || !offers) {
      return json({
        error: "Failed to load offers",
        detail: error?.message ?? "no_rows_returned",
      }, 500, cors);
    }
    const acceptedCustomerIds = [
      ...new Set(
        offers.flatMap((o) => {
          if (o.status !== "accepted") return [];
          const customerId = o.missions?.customer_id;
          return typeof customerId === "string" && customerId.length > 0
            ? [customerId]
            : [];
        }),
      ),
    ];
    const profilesByCustomerId = new Map<
      string,
      { full_name: string | null; email: string | null }
    >();
    if (acceptedCustomerIds.length > 0) {
      const { data: profiles, error: profileError } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", acceptedCustomerIds);
      if (profileError) {
        return json({
          error: "Failed to load customer profiles",
          detail: profileError.message,
        }, 500, cors);
      }
      if (!profiles) {
        return json({
          error: "Failed to load customer profiles",
          detail: "no_rows_returned",
        }, 500, cors);
      }
      for (const profile of profiles) {
        if (typeof profile.id !== "string" || profile.id.length === 0) continue;
        profilesByCustomerId.set(profile.id, {
          full_name: typeof profile.full_name === "string" ? profile.full_name : null,
          email: typeof profile.email === "string" ? profile.email : null,
        });
      }
    }
    const projected = offers.map((o) => {
      const m = o.missions;
      const accepted = o.status === "accepted";
      const base = {
        offerId: o.id,
        missionId: m.id,
        status: o.status,
        missionStatus: m.status,
        suburb: m.mission_locations?.suburb,
        earnCents: Math.round(Number(m.flight_fee_cents) * 0.85),
        currency: "AUD",
        urgency: m.urgency_tiers?.code ?? "standard",
        urgencyTierId: m.urgency_tier_id,
        description: m.description,
        durationMinutes: m.duration_minutes,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      };
      if (accepted) {
        const customerId = typeof m.customer_id === "string" ? m.customer_id : "";
        const profile = profilesByCustomerId.get(customerId);
        const customerName = customerNameFromProfile(
          profile?.full_name,
          profile?.email,
        );
        return {
          ...base,
          fullAddress: m.mission_locations?.full_address,
          ...(customerName ? { customerName } : {}),
        };
      }
      return base;
    });
    return json({ offers: projected }, 200, cors);
  }

  // customer
  const { data, error } = await admin
    .from("missions")
    .select(
      "id, status, network_price_cents, duration_minutes, description, created_at, updated_at, mission_locations(suburb, full_address), urgency_tiers(code)",
    )
    .eq("customer_id", userId)
    .order("created_at", { ascending: false });
  if (error || !data) {
    return json({
      error: "Failed to load missions",
      detail: error?.message ?? "no_rows_returned",
    }, 500, cors);
  }
  return json({
    missions: data.map((m) => ({
      id: m.id,
      status: m.status,
      networkPriceCents: m.network_price_cents,
      currency: "AUD",
      durationMinutes: m.duration_minutes,
      description: m.description,
      suburb: m.mission_locations?.suburb,
      fullAddress: m.mission_locations?.full_address,
      urgency: m.urgency_tiers?.code ?? "standard",
      createdAt: m.created_at,
      updatedAt: m.updated_at,
    })),
  }, 200, cors);
}

/**
 * Keep in sync with packages/types `customerDisplayNameFromProfile`.
 * Never attach email itself to the operator payload.
 */
function customerNameFromProfile(
  fullName: string | null | undefined,
  email: string | null | undefined,
): string | null {
  const fromName = typeof fullName === "string" ? fullName.trim() : "";
  if (fromName.length > 0) {
    return fromName;
  }
  const trimmedEmail = typeof email === "string" ? email.trim() : "";
  const separator = trimmedEmail.indexOf("@");
  if (separator > 0) {
    const localPart = trimmedEmail.slice(0, separator);
    if (localPart.length > 0) {
      return localPart;
    }
  }
  return null;
}
