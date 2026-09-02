import { Bell, MapPin, RotateCw, Trash2 } from "lucide-react";
import { useMemo } from "react";
import type { CustomerNotificationItem } from "@stravyx/types";
import { notificationCopyForStatus } from "@stravyx/types";
import {
  isUnread,
  persistWatermarkFromNewest,
  unreadCount,
  type NotificationWatermark,
} from "@/lib/customerNotificationUnread";

interface NotificationsScreenProps {
  userId: string;
  notifications: CustomerNotificationItem[];
  notificationsReady: boolean;
  notificationsError: string | null;
  watermark: NotificationWatermark | null;
  onWatermarkChange: (watermark: NotificationWatermark) => void;
  onRetry: () => void;
  onDismiss: (id: string) => void;
  dismissedIds: ReadonlySet<string>;
}

function relativeTimeLabel(createdAt: string): string {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp)) return "just now";
  const elapsedMs = Date.now() - timestamp;
  if (elapsedMs < 60_000) return "just now";
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function NotificationsScreen({
  userId,
  notifications,
  notificationsReady,
  notificationsError,
  watermark,
  onWatermarkChange,
  onRetry,
  onDismiss,
  dismissedIds,
}: NotificationsScreenProps) {
  const visibleNotifications = useMemo(
    () => notifications.filter((item) => !dismissedIds.has(item.id)),
    [dismissedIds, notifications],
  );

  const unread = unreadCount(visibleNotifications, watermark);
  const groups = [
    {
      label: "New",
      items: visibleNotifications.filter((item) => isUnread(item, watermark)),
    },
    {
      label: "Earlier",
      items: visibleNotifications.filter((item) => !isUnread(item, watermark)),
    },
  ].filter((group) => group.items.length > 0);

  const markAllRead = () => {
    const newest = persistWatermarkFromNewest(userId, visibleNotifications);
    if (!newest) return;
    onWatermarkChange(newest);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafafa]">
      <div className="px-4 md:px-8 pt-6 pb-24">
        {/* Mobile heading */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <div>
            <h1 className="text-[26px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              Notifications
            </h1>
            {unread > 0 && (
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
                {unread} unread
              </p>
            )}
          </div>
          {unread > 0 && (
            <button onClick={markAllRead} className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#5cb89c", fontWeight: 600 }}>
              Mark all read
            </button>
          )}
        </div>

        {/* Desktop header row */}
        <div className="hidden md:flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {unread > 0 && (
              <span className="px-3 py-1 rounded-full text-[13px]" style={{ backgroundColor: "#e8f5f0", color: "#2d6b53", fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>
                {unread} new
              </span>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="px-4 py-2 bg-white border border-[#e8e8e8] rounded-[10px] text-[13px] hover:border-[#5cb89c] transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
            >
              Mark all read
            </button>
          )}
        </div>

        {notificationsError ? (
          <div className="mb-4 rounded-[12px] border border-[#f2d0d0] bg-[#fff7f7] p-4">
            <p
              className="text-[13px]"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#8f2f2f" }}
            >
              {notificationsError}
            </p>
            <button
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-[8px] border border-[#e8baba] bg-white px-3 py-1.5 text-[12px]"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#8f2f2f", fontWeight: 600 }}
            >
              <RotateCw size={12} />
              Retry
            </button>
          </div>
        ) : null}

        {/* Notification groups */}
        {groups.map((group) => (
          <div key={group.label} className="mb-6">
            <p
              className="text-[11px] mb-3"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.07em" }}
            >
              {group.label}
            </p>

            {/* MOBILE: cards */}
            <div className="md:hidden space-y-2">
              {group.items.map((notif) => {
                const copy = notificationCopyForStatus(notif.toStatus, notif.suburb);
                const unreadItem = isUnread(notif, watermark);
                return (
                  <div key={notif.id} className="bg-white rounded-[14px] border border-[#e8e8e8] p-4 flex items-start gap-3 relative">
                    {unreadItem && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-[#5cb89c]" />}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e8f5f0" }}>
                      <MapPin size={17} style={{ color: "#5cb89c" }} />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-[13px] mb-0.5" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: unreadItem ? 700 : 500, color: "#2d2d2d" }}>
                        {copy.title}
                      </p>
                      <p className="text-[12px] leading-relaxed mb-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                        {copy.body}
                      </p>
                      <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
                        {relativeTimeLabel(notif.createdAt)}
                      </p>
                    </div>
                    <button
                      onClick={() => onDismiss(notif.id)}
                      className="p-1.5 hover:bg-[#f5f5f5] rounded-full transition-colors"
                      aria-label={`Dismiss notification ${copy.title}`}
                    >
                      <Trash2 size={13} className="text-[#c0c0c0] hover:text-[#e05555] transition-colors" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP: table-like rows */}
            <div className="hidden md:block bg-white rounded-[14px] border border-[#e8e8e8] overflow-hidden">
              {group.items.map((notif, i) => {
                const copy = notificationCopyForStatus(notif.toStatus, notif.suburb);
                const unreadItem = isUnread(notif, watermark);
                return (
                  <div
                    key={notif.id}
                    className={`flex items-start gap-4 px-5 py-4 hover:bg-[#fafafa] transition-colors ${i < group.items.length - 1 ? "border-b border-[#f4f4f4]" : ""}`}
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "#e8f5f0" }}>
                      <MapPin size={17} style={{ color: "#5cb89c" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: unreadItem ? 700 : 500, color: "#2d2d2d" }}>
                              {copy.title}
                            </p>
                            {unreadItem && <span className="w-2 h-2 rounded-full bg-[#5cb89c] flex-shrink-0" />}
                          </div>
                          <p className="text-[13px] leading-relaxed" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                            {copy.body}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[12px] whitespace-nowrap" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
                            {relativeTimeLabel(notif.createdAt)}
                          </span>
                          <button
                            onClick={() => onDismiss(notif.id)}
                            className="p-1.5 hover:bg-[#f5f5f5] rounded-full transition-colors"
                            aria-label={`Dismiss notification ${copy.title}`}
                          >
                            <Trash2 size={13} className="text-[#c0c0c0] hover:text-[#e05555] transition-colors" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {!notificationsReady && !notificationsError && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
              Loading updates...
            </p>
          </div>
        )}

        {notificationsReady && !notificationsError && visibleNotifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-[#f0f0f0] rounded-full flex items-center justify-center mb-4">
              <Bell size={28} className="text-[#c0c0c0]" />
            </div>
            <p className="text-[18px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}>
              No job updates yet
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>All caught up</p>
          </div>
        )}
      </div>
    </div>
  );
}
