// Live dashboard figures for customer/operator shells. Stats must come from
// the Job[] already held in App — never hardcoded $4,820 / 156 / 4.9 / $842.
// Import the `.ts` module only: no React, no DOM.
import { describe, expect, it } from "vitest";
import type { Job } from "../../apps/app-web/src/stravyx/types.ts";
import {
  CASH_OUT_PENDING_DOLLARS,
  UNSET_METRIC,
  customerDashboardStats,
  formatAudWhole,
  operatorDashboardStats,
  operatorEarn,
} from "../../apps/app-web/src/lib/dashboardStats.ts";

function makeJob(overrides: Partial<Job> & { id: string }): Job {
  return {
    id: overrides.id,
    customerId: "customer-1",
    customerName: "Ada Customer",
    status: "pending",
    serviceType: "mapping",
    urgency: "standard",
    location: { address: "1 Test St, Adelaide", lat: -34.93, lng: 138.6 },
    estimatedDuration: 30,
    flightFee: 400,
    totalPrice: 560,
    description: "Test mission",
    createdAt: new Date("2026-08-01T00:00:00Z"),
    ...overrides,
  };
}

describe("operatorEarn", () => {
  it("uses the existing Math.round(flightFee * 0.85) projector", () => {
    expect(operatorEarn({ flightFee: 400 })).toBe(Math.round(400 * 0.85));
    expect(operatorEarn({ flightFee: 340 })).toBe(Math.round(340 * 0.85));
  });
});

describe("customerDashboardStats", () => {
  it("sums totalPrice across the customer's live jobs", () => {
    const stats = customerDashboardStats([
      makeJob({ id: "a", totalPrice: 200 }),
      makeJob({ id: "b", totalPrice: 150 }),
    ]);
    expect(stats.totalSpent).toBe(350);
    expect(formatAudWhole(stats.totalSpent)).toBe("$350");
  });

  it("is honest zero / em dash when there are no jobs — not the retired $4,820 / 4.8 fiction", () => {
    const stats = customerDashboardStats([]);
    expect(stats.totalSpent).toBe(0);
    expect(formatAudWhole(stats.totalSpent)).toBe("$0");
    expect(stats.avgRating).toBe("—");
    expect(stats.avgRating).toBe(UNSET_METRIC);
    expect(formatAudWhole(stats.totalSpent)).not.toBe("$4,820");
    expect(stats.avgRating).not.toBe("4.8");
    expect(stats.avgRating).not.toBe("4.9");
  });
});

describe("operatorDashboardStats", () => {
  // Monday 24 Aug 2026 local — the week is Mon 24 … Sun 30.
  const now = new Date(2026, 7, 24, 12, 0, 0);

  it("counts completed live jobs as Jobs Done, not 156", () => {
    const stats = operatorDashboardStats(
      [
        makeJob({ id: "done-1", status: "completed", completedAt: new Date(2026, 7, 24, 8, 0, 0) }),
        makeJob({ id: "done-2", status: "completed", completedAt: new Date(2026, 7, 20, 8, 0, 0) }),
        makeJob({ id: "open", status: "accepted" }),
      ],
      now,
    );
    expect(stats.jobsDone).toBe(2);
    expect(stats.jobsDone).not.toBe(156);
  });

  it("sums today's completed-job operator earn with the existing 0.85 formula", () => {
    const today = makeJob({
      id: "today",
      status: "completed",
      flightFee: 500,
      completedAt: new Date(2026, 7, 24, 9, 0, 0),
    });
    const yesterday = makeJob({
      id: "yesterday",
      status: "completed",
      flightFee: 800,
      completedAt: new Date(2026, 7, 23, 9, 0, 0),
    });
    const stats = operatorDashboardStats([today, yesterday], now);
    expect(stats.todayEarn).toBe(Math.round(500 * 0.85));
    expect(formatAudWhole(stats.todayEarn)).toBe("$425");
    expect(operatorDashboardStats([], now).todayEarn).toBe(0);
    expect(formatAudWhole(0)).not.toBe("$340");
  });

  it("builds a Mon–Sun weekly chart from live completed jobs, with honest zeros", () => {
    const wed = makeJob({
      id: "wed",
      status: "completed",
      flightFee: 200,
      completedAt: new Date(2026, 7, 26, 10, 0, 0),
    });
    const stats = operatorDashboardStats([wed], now);
    expect(stats.weeklyEarnings).toHaveLength(7);
    expect(stats.weeklyEarnings.map((p) => p.day)).toEqual([
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
      "Sun",
    ]);
    expect(stats.weeklyEarnings[2]?.amount).toBe(Math.round(200 * 0.85));
    expect(stats.weeklyEarnings[0]?.amount).toBe(0);
    const empty = operatorDashboardStats([], now);
    expect(empty.weeklyEarnings.every((p) => p.amount === 0)).toBe(true);
    expect(empty.thisWeekEarn).toBe(0);
  });

  it("exposes em dash for rating and avg response, and $0 cash-out pending", () => {
    const stats = operatorDashboardStats([], now);
    expect(stats.rating).toBe("—");
    expect(stats.avgResponse).toBe("—");
    expect(stats.rating).toBe(UNSET_METRIC);
    expect(CASH_OUT_PENDING_DOLLARS).toBe(0);
    expect(stats.rating).not.toBe("4.9");
    expect(stats.avgResponse).not.toBe("2 min");
    expect(stats.jobsDone).not.toBe(156);
  });
});
