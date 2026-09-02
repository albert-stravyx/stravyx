import { describe, expect, it } from "vitest";
import { offerToJob } from "../../apps/app-web/src/lib/mapMission.ts";
import { operatorDashboardStats } from "../../apps/app-web/src/lib/dashboardStats.ts";

const lastMonthCreated = "2026-07-01T10:00:00.000Z";
const lastMonthUpdated = "2026-07-15T18:30:00.000Z";

function completedOffer(overrides: Record<string, unknown> = {}) {
  return {
    offerId: "offer-1",
    missionId: "mission-1",
    status: "accepted",
    missionStatus: "delivered",
    suburb: "Bondi",
    earnCents: 34000,
    createdAt: lastMonthCreated,
    updatedAt: lastMonthUpdated,
    ...overrides,
  };
}

describe("offerToJob timestamps", () => {
  it("maps mission createdAt/updatedAt instead of stamping now", () => {
    const before = Date.now();
    const job = offerToJob(completedOffer());

    expect(job.createdAt.toISOString()).toBe(lastMonthCreated);
    expect(job.completedAt?.toISOString()).toBe(lastMonthUpdated);
    expect(job.completedAt?.getTime()).toBeLessThan(before);
    expect(job.createdAt.getTime()).toBeLessThan(before);
  });

  it("does not treat a last-month delivered mission as today's earn", () => {
    const now = new Date(2026, 7, 24, 12, 0, 0);
    const job = offerToJob(completedOffer({ earnCents: 42500 }));
    const stats = operatorDashboardStats([job], now);

    expect(stats.todayEarn).toBe(0);
    expect(stats.thisWeekEarn).toBe(0);
    expect(stats.thisMonthEarn).toBe(0);
    expect(stats.jobsDone).toBe(1);
    expect(stats.weeklyEarnings.every((point) => point.amount === 0)).toBe(true);
  });

  it("leaves completedAt unset for open offers", () => {
    const job = offerToJob(
      completedOffer({
        status: "sent",
        missionStatus: "dispatched",
      }),
    );
    expect(job.status).toBe("pending");
    expect(job.completedAt).toBeUndefined();
    expect(job.createdAt.toISOString()).toBe(lastMonthCreated);
  });

  it("does not stamp now when timestamps are missing", () => {
    const now = new Date(2026, 7, 24, 12, 0, 0);
    const job = offerToJob(
      completedOffer({
        createdAt: undefined,
        updatedAt: undefined,
        earnCents: 42500,
      }),
    );
    expect(job.createdAt.getTime()).toBe(0);
    expect(job.completedAt).toBeUndefined();
    const stats = operatorDashboardStats([job], now);
    expect(stats.todayEarn).toBe(0);
    expect(stats.thisWeekEarn).toBe(0);
    expect(stats.thisMonthEarn).toBe(0);
  });
});
