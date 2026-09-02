import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerNotificationItem } from "@stravyx/types";
import {
  isUnread,
  persistWatermarkFromNewest,
  readWatermark,
  unreadCount,
  watermarkFromNewest,
  watermarkStorageKey,
  writeWatermark,
} from "../../apps/app-web/src/lib/customerNotificationUnread.ts";
import { diffNewNotificationIds } from "../../apps/app-web/src/lib/customerNotificationToasts.ts";
import {
  enableWebNotifications,
  getWebNotificationSupport,
  readWebNotifyPref,
} from "../../apps/app-web/src/lib/webNotificationPermission.ts";

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

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe("customer notification unread helpers", () => {
  it("computes unread and watermark using createdAt then id ordering", () => {
    const newer = makeItem("b", "2026-08-23T12:00:00.000Z");
    const older = makeItem("a", "2026-08-23T11:00:00.000Z");

    expect(isUnread(newer, null)).toBe(true);
    expect(
      isUnread(newer, {
        createdAt: older.createdAt,
        id: older.id,
      }),
    ).toBe(true);
    expect(
      isUnread(older, {
        createdAt: newer.createdAt,
        id: newer.id,
      }),
    ).toBe(false);

    const watermark = watermarkFromNewest([newer, older]);
    expect(watermark).toEqual({
      createdAt: newer.createdAt,
      id: newer.id,
    });
    expect(unreadCount([newer, older], watermark)).toBe(0);
    expect(
      unreadCount([newer, older], {
        createdAt: older.createdAt,
        id: older.id,
      }),
    ).toBe(1);
  });

  it("persists and reads watermark by user key", () => {
    const storage = new MemoryStorage();
    writeWatermark(
      "user-1",
      { createdAt: "2026-08-23T12:00:00.000Z", id: "abc" },
      storage,
    );

    expect(storage.getItem(watermarkStorageKey("user-1"))).toBe(
      "{\"createdAt\":\"2026-08-23T12:00:00.000Z\",\"id\":\"abc\"}",
    );
    expect(readWatermark("user-1", storage)).toEqual({
      createdAt: "2026-08-23T12:00:00.000Z",
      id: "abc",
    });
  });

  it("mark-all-read helper writes newest watermark, persists it, and yields unreadCount 0", () => {
    const storage = new MemoryStorage();
    const newer = makeItem("b", "2026-08-23T12:00:00.000Z");
    const older = makeItem("a", "2026-08-23T11:00:00.000Z");
    const items = [newer, older];

    expect(unreadCount(items, readWatermark("user-1", storage))).toBe(2);

    const returned = persistWatermarkFromNewest("user-1", items, storage);

    expect(returned).toEqual({
      createdAt: newer.createdAt,
      id: newer.id,
    });
    expect(unreadCount(items, returned)).toBe(0);
    expect(readWatermark("user-1", storage)).toEqual(returned);
    expect(storage.getItem(watermarkStorageKey("user-1"))).toBe(
      JSON.stringify(returned),
    );
  });

  it("mark-all-read helper does not write when there are no items", () => {
    const storage = new MemoryStorage();

    expect(persistWatermarkFromNewest("user-1", [], storage)).toBeNull();
    expect(readWatermark("user-1", storage)).toBeNull();
    expect(storage.getItem(watermarkStorageKey("user-1"))).toBeNull();
  });

  it("diffs only unseen ids in newest-first order", () => {
    const newer = makeItem("b", "2026-08-23T12:00:00.000Z");
    const older = makeItem("a", "2026-08-23T11:00:00.000Z");
    const seen = new Set(["a"]);

    expect(diffNewNotificationIds([newer, older], seen).map((item) => item.id)).toEqual(["b"]);
  });
});

describe("web notification permission helper", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unsupported when Notification API is absent", () => {
    expect(getWebNotificationSupport()).toBe("unsupported");
  });

  it("enables preference when permission is granted", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn(async () => "granted"),
    });

    const result = await enableWebNotifications("user-1");

    expect(result.preferenceOn).toBe(true);
    expect(result.permission).toBe("granted");
    expect(readWebNotifyPref("user-1", storage)).toBe(true);
  });

  it("keeps preference off when permission is denied", async () => {
    const storage = new MemoryStorage();
    vi.stubGlobal("window", { localStorage: storage });
    vi.stubGlobal("Notification", {
      permission: "default",
      requestPermission: vi.fn(async () => "denied"),
    });

    const result = await enableWebNotifications("user-1");

    expect(result.preferenceOn).toBe(false);
    expect(result.permission).toBe("denied");
    expect(readWebNotifyPref("user-1", storage)).toBe(false);
  });
});
