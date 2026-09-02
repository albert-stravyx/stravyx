import { describe, expect, it } from "vitest";
import type { CustomerNotificationItem } from "@stravyx/types";
import {
  NOTIFICATIONS_LOAD_FAILED,
  customerNotificationsRefreshFromSettled,
} from "../../apps/app-web/src/lib/customerNotificationsRefresh.ts";

function makeItem(
  id: string,
  createdAt: string,
): CustomerNotificationItem {
  return {
    id,
    missionId: "mission-1",
    suburb: "Richmond",
    toStatus: "accepted",
    createdAt,
  };
}

describe("customerNotificationsRefreshFromSettled", () => {
  it("maps a fulfilled notifications result to ready with the payload", () => {
    const notifications = [
      makeItem("b", "2026-08-23T12:00:00.000Z"),
      makeItem("a", "2026-08-23T11:00:00.000Z"),
    ];
    const result: PromiseSettledResult<{ notifications: CustomerNotificationItem[] }> = {
      status: "fulfilled",
      value: { notifications },
    };

    expect(customerNotificationsRefreshFromSettled(result)).toEqual({
      ready: true,
      error: null,
      notifications,
    });
  });

  it("maps a rejected Error to ready with that error message and no payload", () => {
    const result: PromiseSettledResult<{ notifications: CustomerNotificationItem[] }> = {
      status: "rejected",
      reason: new Error("notifications unavailable"),
    };

    expect(customerNotificationsRefreshFromSettled(result)).toEqual({
      ready: true,
      error: "notifications unavailable",
      notifications: null,
    });
  });

  it("maps a rejected non-Error to ready with a clear fallback and no payload", () => {
    const result: PromiseSettledResult<{ notifications: CustomerNotificationItem[] }> = {
      status: "rejected",
      reason: "timeout",
    };

    expect(customerNotificationsRefreshFromSettled(result)).toEqual({
      ready: true,
      error: NOTIFICATIONS_LOAD_FAILED,
      notifications: null,
    });
  });

  it("maps a rejected Error with an empty message to the fallback, not a blank error", () => {
    const result: PromiseSettledResult<{ notifications: CustomerNotificationItem[] }> = {
      status: "rejected",
      reason: new Error(""),
    };

    expect(customerNotificationsRefreshFromSettled(result)).toEqual({
      ready: true,
      error: NOTIFICATIONS_LOAD_FAILED,
      notifications: null,
    });
  });
});
