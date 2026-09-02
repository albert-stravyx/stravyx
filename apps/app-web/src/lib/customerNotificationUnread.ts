import type { CustomerNotificationItem } from "@stravyx/types";

export interface NotificationWatermark {
  createdAt: string;
  id: string;
}

export function watermarkStorageKey(userId: string): string {
  return `stravyx.notifications.seenAt:${userId}`;
}

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

function isNotificationWatermark(
  value: unknown,
): value is NotificationWatermark {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.createdAt === "string" && typeof candidate.id === "string"
  );
}

export function readWatermark(
  userId: string,
  storage?: Storage,
): NotificationWatermark | null {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return null;
  const raw = resolvedStorage.getItem(watermarkStorageKey(userId));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isNotificationWatermark(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export function writeWatermark(
  userId: string,
  watermark: NotificationWatermark,
  storage?: Storage,
): void {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return;
  resolvedStorage.setItem(watermarkStorageKey(userId), JSON.stringify(watermark));
}

function compareByCreatedAtThenId(
  left: Pick<CustomerNotificationItem, "createdAt" | "id">,
  right: Pick<CustomerNotificationItem, "createdAt" | "id">,
): number {
  if (left.createdAt > right.createdAt) return 1;
  if (left.createdAt < right.createdAt) return -1;
  if (left.id > right.id) return 1;
  if (left.id < right.id) return -1;
  return 0;
}

export function isUnread(
  item: CustomerNotificationItem,
  watermark: NotificationWatermark | null,
): boolean {
  if (!watermark) return true;
  return compareByCreatedAtThenId(item, watermark) > 0;
}

export function watermarkFromNewest(
  items: CustomerNotificationItem[],
): NotificationWatermark | null {
  if (items.length === 0) return null;
  const newest = items.reduce((currentNewest, candidate) => {
    return compareByCreatedAtThenId(candidate, currentNewest) > 0
      ? candidate
      : currentNewest;
  });
  return { createdAt: newest.createdAt, id: newest.id };
}

export function persistWatermarkFromNewest(
  userId: string,
  items: CustomerNotificationItem[],
  storage?: Storage,
): NotificationWatermark | null {
  const watermark = watermarkFromNewest(items);
  if (!watermark) return null;
  writeWatermark(userId, watermark, storage);
  return watermark;
}

export function unreadCount(
  items: CustomerNotificationItem[],
  watermark: NotificationWatermark | null,
): number {
  return items.filter((item) => isUnread(item, watermark)).length;
}
