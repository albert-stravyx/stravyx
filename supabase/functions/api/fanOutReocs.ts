/**
 * Fan-out eligibility: online AND verified. Unverified ReOCs must never be selected.
 */

export const FAN_OUT_ONLINE = true;
export const FAN_OUT_VERIFIED = true;

export interface FanOutReocRow {
  id: string;
  online: unknown;
  verified: unknown;
}

export function isFanOutEligibleReoc(row: {
  online: unknown;
  verified: unknown;
}): boolean {
  return row.online === true && row.verified === true;
}

export function fanOutReocIds(rows: ReadonlyArray<FanOutReocRow>): string[] {
  return rows.filter(isFanOutEligibleReoc).map((row) => row.id);
}

export function applyFanOutReocQuery<
  T extends { eq: (column: string, value: boolean) => T },
>(query: T): T {
  return query.eq("online", FAN_OUT_ONLINE).eq("verified", FAN_OUT_VERIFIED);
}
