import type { CustomerNotificationItem } from "@stravyx/types";

export const NOTIFICATIONS_LOAD_FAILED = "Could not load notifications";

export interface CustomerNotificationsRefresh {
  ready: true;
  error: string | null;
  notifications: CustomerNotificationItem[] | null;
}

function notificationsErrorMessage(reason: unknown): string {
  if (reason instanceof Error && reason.message !== "") {
    return reason.message;
  }
  return NOTIFICATIONS_LOAD_FAILED;
}

export function customerNotificationsRefreshFromSettled(
  result: PromiseSettledResult<{ notifications: CustomerNotificationItem[] }>,
): CustomerNotificationsRefresh {
  if (result.status === "fulfilled") {
    return {
      ready: true,
      error: null,
      notifications: result.value.notifications,
    };
  }
  return {
    ready: true,
    error: notificationsErrorMessage(result.reason),
    notifications: null,
  };
}
