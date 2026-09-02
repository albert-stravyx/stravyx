import type { CustomerNotificationItem, MeProfile } from "@stravyx/types";
import { useState } from "react";
import { Logo } from "../Logo";
import { BookingPage } from "./BookingPage";
import { AllServicesPage } from "./AllServicesPage";
import { JobHistory } from "./JobHistory";
import { NotificationsScreen } from "./NotificationsScreen";
import { AccountScreen } from "./AccountScreen";
import { Job, UrgencyTier, UrgencyPricing } from "../../types";
import { Tab } from "./customerHomeData";
import { DesktopSidebar } from "./CustomerDesktopSidebar";
import { MobileTabBar } from "./CustomerMobileTabBar";
import { HomeFeed } from "./CustomerHomeFeed";
import type { NotificationWatermark } from "@/lib/customerNotificationUnread";
import { customerDashboardStats } from "@/lib/dashboardStats";
import { shellInitials } from "@/lib/shellProfile";

interface CustomerHomeProps {
  onSubmitJob: (job: Omit<Job, "id" | "status" | "createdAt"> & { serviceId?: string }) => void;
  onTrackJob: (job: Job) => void;
  onLogout: () => void;
  jobs: Job[];
  urgencyTiers: Record<UrgencyTier, UrgencyPricing>;
  userId: string;
  meProfile: MeProfile | null;
  notifications: CustomerNotificationItem[];
  notificationsReady: boolean;
  notificationsError: string | null;
  unreadNotifications: number;
  notificationWatermark: NotificationWatermark | null;
  onNotificationWatermarkChange: (watermark: NotificationWatermark) => void;
  onRetryNotifications: () => void;
  onDismissNotification: (id: string) => void;
  dismissedNotificationIds: ReadonlySet<string>;
  pushEnabled: boolean;
  onPushToggle: (nextValue: boolean) => Promise<void>;
  pushMessage: string | null;
}

export function CustomerHome({
  onSubmitJob,
  onTrackJob,
  onLogout,
  jobs,
  urgencyTiers,
  userId,
  meProfile,
  notifications,
  notificationsReady,
  notificationsError,
  unreadNotifications,
  notificationWatermark,
  onNotificationWatermarkChange,
  onRetryNotifications,
  onDismissNotification,
  dismissedNotificationIds,
  pushEnabled,
  onPushToggle,
  pushMessage,
}: CustomerHomeProps) {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showBooking, setShowBooking] = useState(false);
  const [bookingService, setBookingService] = useState<string | undefined>(undefined);
  const [showServices, setShowServices] = useState(false);

  const activeJob = jobs.some((j) => ["pending", "accepted", "in_progress"].includes(j.status));
  const pendingJobs = jobs.filter((j) => j.status === "pending").length;
  const customerStats = customerDashboardStats(jobs);
  const initials = shellInitials(meProfile);

  const handleBook = (serviceId?: string) => {
    setBookingService(serviceId);
    setShowBooking(true);
  };
  const handleSubmit = (job: Omit<Job, "id" | "status" | "createdAt">) => {
    onSubmitJob(job);
    setShowBooking(false);
  };

  return (
    <div className="fixed inset-0 flex bg-[#fafafa]">

      {/* ── DESKTOP SIDEBAR ───────────────────────────── */}
      <DesktopSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onBook={handleBook}
        onLogout={onLogout}
        pendingCount={pendingJobs}
        unreadNotifications={unreadNotifications}
        urgencyTiers={urgencyTiers}
        meProfile={meProfile}
      />

      {/* ── MAIN CONTENT AREA ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">

        {/* Mobile header (home tab only) */}
        {activeTab === "home" && (
          <div className="md:hidden bg-white border-b border-[#e8e8e8] px-4 py-3 flex items-center justify-between flex-shrink-0 z-10">
            <Logo className="h-14" />
            <div className="flex items-center gap-2">
              {activeJob && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8f5f0] rounded-full">
                  <span className="w-2 h-2 rounded-full bg-[#5cb89c] animate-pulse" />
                  <span className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d6b53" }}>Active</span>
                </div>
              )}
              <div className="w-9 h-9 bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-full flex items-center justify-center">
                <span className="text-white text-[13px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>{initials}</span>
              </div>
            </div>
          </div>
        )}

        {/* Desktop page title (non-home tabs) */}
        {activeTab !== "home" && (
          <div className="hidden md:block bg-white border-b border-[#e8e8e8] px-8 py-4 flex-shrink-0">
            <h1 className="text-[22px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              {activeTab === "jobs" ? "My Jobs" : activeTab === "notifications" ? "Notifications" : "Account"}
            </h1>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 flex min-h-0 overflow-hidden relative">
          {/* Home tab → feed */}
          {activeTab === "home" && (
            <HomeFeed onBook={handleBook} onTrackJob={onTrackJob} onViewServices={() => setShowServices(true)} activeJob={activeJob} jobs={jobs} meProfile={meProfile} />
          )}

          {/* Other tabs → full content screens */}
          {activeTab === "jobs" && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <JobHistory jobs={jobs} onTrackJob={onTrackJob} />
            </div>
          )}
          {activeTab === "notifications" && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <NotificationsScreen
                userId={userId}
                notifications={notifications}
                notificationsReady={notificationsReady}
                notificationsError={notificationsError}
                watermark={notificationWatermark}
                onWatermarkChange={onNotificationWatermarkChange}
                onRetry={onRetryNotifications}
                onDismiss={onDismissNotification}
                dismissedIds={dismissedNotificationIds}
              />
            </div>
          )}
          {activeTab === "account" && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AccountScreen
                onLogout={onLogout}
                pushEnabled={pushEnabled}
                onPushToggle={onPushToggle}
                pushMessage={pushMessage}
                meProfile={meProfile}
                stats={customerStats}
              />
            </div>
          )}

        </div>

        {/* Mobile Bottom Tab Bar */}
        <MobileTabBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadNotifications={unreadNotifications}
        />
      </div>

      {/* All Services Browse Page */}
      {showServices && (
        <AllServicesPage
          onBack={() => setShowServices(false)}
          onBook={(serviceId) => {
            setShowServices(false);
            handleBook(serviceId || undefined);
          }}
        />
      )}

      {/* Full-screen Booking Page */}
      {showBooking && (
        <BookingPage
          onBack={() => setShowBooking(false)}
          onSubmit={handleSubmit}
          preselectedService={bookingService}
          urgencyTiers={urgencyTiers}
        />
      )}
    </div>
  );
}
