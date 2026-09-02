import { describe, expect, it } from "vitest";
import {
  applyFanOutReocQuery,
  fanOutReocIds,
  FAN_OUT_ONLINE,
  FAN_OUT_VERIFIED,
  isFanOutEligibleReoc,
} from "../../supabase/functions/api/fanOutReocs.ts";

class FakeReocQuery {
  readonly eqCalls: Array<{ column: string; value: boolean }> = [];

  eq(column: string, value: boolean): this {
    this.eqCalls.push({ column, value });
    return this;
  }
}

describe("fan-out verified ReOC selection", () => {
  it("keeps the query filter online=true and verified=true", () => {
    const query = new FakeReocQuery();
    const filtered = applyFanOutReocQuery(query);
    expect(filtered).toBe(query);
    expect(query.eqCalls).toEqual([
      { column: "online", value: FAN_OUT_ONLINE },
      { column: "verified", value: FAN_OUT_VERIFIED },
    ]);
    expect(FAN_OUT_ONLINE).toBe(true);
    expect(FAN_OUT_VERIFIED).toBe(true);
  });

  it("does not select unverified or offline ReOC ids", () => {
    const selected = fanOutReocIds([
      { id: "pending-docs", online: true, verified: false },
      { id: "pending-review", online: false, verified: false },
      { id: "rejected", online: true, verified: false },
      { id: "offline-verified", online: false, verified: true },
      { id: "demo-verified", online: true, verified: true },
    ]);
    expect(selected).toEqual(["demo-verified"]);
    expect(selected).not.toContain("pending-docs");
    expect(selected).not.toContain("pending-review");
    expect(selected).not.toContain("rejected");
  });

  it("treats only strict true/true as eligible", () => {
    expect(isFanOutEligibleReoc({ online: true, verified: true })).toBe(true);
    expect(isFanOutEligibleReoc({ online: true, verified: "true" })).toBe(false);
    expect(isFanOutEligibleReoc({ online: 1, verified: true })).toBe(false);
    expect(isFanOutEligibleReoc({ online: true, verified: null })).toBe(false);
  });
});
