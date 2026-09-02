import {
  DEFAULT_BASE_RATE_CENTS_PER_HOUR,
  URGENCY_MULTIPLIERS,
  type CustomerQuote,
  type QuoteInput,
} from "./models";

/**
 * Network Price = base_rate ($/hr) × equipment_factor × urgency × duration_hours.
 * Stored/returned as integer cents. Customer sees only networkPriceCents.
 */
export function calculateNetworkPrice(input: QuoteInput): CustomerQuote {
  const base = input.baseRateCentsPerHour ?? DEFAULT_BASE_RATE_CENTS_PER_HOUR;
  const equipment = input.equipmentFactor ?? 1;
  const multiplier = URGENCY_MULTIPLIERS[input.urgency];
  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    throw new Error("durationMinutes must be a positive number");
  }
  const hours = input.durationMinutes / 60;
  const networkPriceCents = Math.round(base * equipment * multiplier * hours);
  return {
    networkPriceCents,
    currency: "AUD",
    durationMinutes: input.durationMinutes,
    urgency: input.urgency,
  };
}

/** Layer 1 flight fee ≈ 70% of network; operator earns 85% of flight fee. */
export function splitFromNetworkPrice(networkPriceCents: number) {
  const flightFeeCents = Math.round(networkPriceCents / 1.4);
  const layer2Cents = networkPriceCents - flightFeeCents;
  const operatorEarnCents = Math.round(flightFeeCents * 0.85);
  const platformFeeCents = flightFeeCents - operatorEarnCents;
  return { flightFeeCents, layer2Cents, operatorEarnCents, platformFeeCents };
}
