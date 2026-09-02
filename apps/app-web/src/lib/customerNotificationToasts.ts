import type { CustomerNotificationItem } from "@stravyx/types";
import type { notificationCopyForStatus } from "@stravyx/types";
import type { WebNotificationSupport } from "./webNotificationPermission";

export function diffNewNotificationIds(
  incoming: CustomerNotificationItem[],
  previouslySeenIds: ReadonlySet<string>,
): CustomerNotificationItem[] {
  return incoming.filter((item) => !previouslySeenIds.has(item.id));
}

export function fireWebNotificationsForNewEvents(input: {
  incoming: CustomerNotificationItem[];
  previouslySeenIds: Set<string>;
  preferenceOn: boolean;
  permission: WebNotificationSupport;
  copy: typeof notificationCopyForStatus;
}): void {
  const newItems = diffNewNotificationIds(input.incoming, input.previouslySeenIds);
  for (const item of newItems) {
    if (input.preferenceOn && input.permission === "granted") {
      const copy = input.copy(item.toStatus, item.suburb);
      try {
        new Notification(copy.title, { body: copy.body });
      } catch (error) {
        console.error("web_notifications_permission_failed", error);
      }
    }
    input.previouslySeenIds.add(item.id);
  }
}
