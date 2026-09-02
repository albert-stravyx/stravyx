export type WebNotificationSupport =
  | "unsupported"
  | NotificationPermission;

function resolveStorage(storage?: Storage): Storage | null {
  if (storage) return storage;
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function webNotifyPrefKey(userId: string): string {
  return `stravyx.webNotify.enabled:${userId}`;
}

export function readWebNotifyPref(userId: string, storage?: Storage): boolean {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return false;
  return resolvedStorage.getItem(webNotifyPrefKey(userId)) === "1";
}

export function writeWebNotifyPref(
  userId: string,
  enabled: boolean,
  storage?: Storage,
): void {
  const resolvedStorage = resolveStorage(storage);
  if (!resolvedStorage) return;
  if (enabled) {
    resolvedStorage.setItem(webNotifyPrefKey(userId), "1");
    return;
  }
  resolvedStorage.removeItem(webNotifyPrefKey(userId));
}

export function getWebNotificationSupport(): WebNotificationSupport {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission;
}

export async function enableWebNotifications(userId: string): Promise<{
  preferenceOn: boolean;
  permission: WebNotificationSupport;
}> {
  const support = getWebNotificationSupport();
  if (support === "unsupported" || support === "denied") {
    writeWebNotifyPref(userId, false);
    return { preferenceOn: false, permission: support };
  }

  if (support === "granted") {
    writeWebNotifyPref(userId, true);
    return { preferenceOn: true, permission: support };
  }

  try {
    const nextPermission = await Notification.requestPermission();
    const preferenceOn = nextPermission === "granted";
    writeWebNotifyPref(userId, preferenceOn);
    return { preferenceOn, permission: nextPermission };
  } catch {
    writeWebNotifyPref(userId, false);
    return { preferenceOn: false, permission: "default" };
  }
}

export function disableWebNotifications(userId: string): void {
  writeWebNotifyPref(userId, false);
}
