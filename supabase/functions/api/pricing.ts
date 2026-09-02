const URGENCY: Record<string, number> = {
  scheduled: 0.85,
  standard: 1.0,
  urgent: 1.35,
  immediate: 2.25,
};

export function networkPriceCents(
  durationMinutes: number,
  urgency: string,
  equipmentFactor = 1,
  baseRate = 25000,
) {
  const mult = URGENCY[urgency];
  if (!mult) throw new Error(`Unknown urgency: ${urgency}`);
  if (durationMinutes <= 0) throw new Error("durationMinutes must be positive");
  return Math.round(baseRate * equipmentFactor * mult * (durationMinutes / 60));
}

export function splitFromNetwork(network: number) {
  const flightFeeCents = Math.round(network / 1.4);
  const layer2Cents = network - flightFeeCents;
  const operatorEarnCents = Math.round(flightFeeCents * 0.85);
  const platformFeeCents = flightFeeCents - operatorEarnCents;
  return { flightFeeCents, layer2Cents, operatorEarnCents, platformFeeCents };
}

export function suburbFromAddress(full: string) {
  const parts = full.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[1]!;
  return parts[0] ?? "Sydney";
}
