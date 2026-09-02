import type { AppRole, CustomerNotificationItem, MeProfile } from "@stravyx/types";
import type { Session } from "@supabase/supabase-js";
import { CustomerHome } from "./components/customer/CustomerHome";
import { TrackJob } from "./components/customer/TrackJob";
import { OperatorDashboard } from "./components/operator/OperatorDashboard";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { Job, UrgencyTier, UrgencyPricing } from "./types";
import type { NotificationWatermark } from "@/lib/customerNotificationUnread";
import type { CustomerScreen } from "@/lib/sessionScopedReset";

export interface AuthenticatedShellProps {
  role: AppRole;
  customerScreen: CustomerScreen;
  jobs: Job[];
  availableJobs: Job[];
  currentCustomerJob: Job | null;
  currentOperatorJob: Job | null;
  awaitingDeliveryJobs: Job[];
  urgencyTiers: Record<UrgencyTier, UrgencyPricing>;
  session: Session;
  meProfile: MeProfile | null;
  customerNotifications: CustomerNotificationItem[];
  notificationsReady: boolean;
  notificationsError: string | null;
  unreadNotificationCount: number;
  notificationWatermark: NotificationWatermark | null;
  dismissedNotificationIds: ReadonlySet<string>;
  webNotifyEnabled: boolean;
  webNotifyMessage: string | null;
  onSubmitJob: (job: Omit<Job, "id" | "status" | "createdAt"> & { serviceId?: string }) => void;
  onTrackJob: (job: Job) => void;
  onLogout: () => void;
  onNotificationWatermarkChange: (watermark: NotificationWatermark) => void;
  onRetryNotifications: () => void;
  onDismissNotification: (id: string) => void;
  onPushToggle: (nextValue: boolean) => Promise<void>;
  onCustomerJobComplete: () => void;
  onAcceptJob: (jobId: string) => void;
  onStartJob: () => void;
  onCompleteJob: () => void;
  onDeliverMission: (missionId: string) => Promise<void> | void;
  onDismissCurrentOperatorJob: () => void;
  onMeProfileChange: (profile: MeProfile) => void;
  onUpdateUrgencyTiers: (tier: UrgencyTier, patch: Partial<UrgencyPricing>) => void;
}

export function AuthenticatedShell({
  role,
  customerScreen,
  jobs,
  availableJobs,
  currentCustomerJob,
  currentOperatorJob,
  awaitingDeliveryJobs,
  urgencyTiers,
  session,
  meProfile,
  customerNotifications,
  notificationsReady,
  notificationsError,
  unreadNotificationCount,
  notificationWatermark,
  dismissedNotificationIds,
  webNotifyEnabled,
  webNotifyMessage,
  onSubmitJob,
  onTrackJob,
  onLogout,
  onNotificationWatermarkChange,
  onRetryNotifications,
  onDismissNotification,
  onPushToggle,
  onCustomerJobComplete,
  onAcceptJob,
  onStartJob,
  onCompleteJob,
  onDeliverMission,
  onDismissCurrentOperatorJob,
  onMeProfileChange,
  onUpdateUrgencyTiers,
}: AuthenticatedShellProps) {
  return (
    <div className="fixed inset-0 overflow-hidden">
      {role === "customer" && (
        <>
          {customerScreen === "home" && (
            <CustomerHome
              onSubmitJob={onSubmitJob}
              onTrackJob={onTrackJob}
              onLogout={onLogout}
              jobs={jobs}
              urgencyTiers={urgencyTiers}
              userId={session.user.id}
              meProfile={meProfile}
              notifications={customerNotifications}
              notificationsReady={notificationsReady}
              notificationsError={notificationsError}
              unreadNotifications={unreadNotificationCount}
              notificationWatermark={notificationWatermark}
              onNotificationWatermarkChange={onNotificationWatermarkChange}
              onRetryNotifications={onRetryNotifications}
              onDismissNotification={onDismissNotification}
              dismissedNotificationIds={dismissedNotificationIds}
              pushEnabled={webNotifyEnabled}
              onPushToggle={onPushToggle}
              pushMessage={webNotifyMessage}
            />
          )}
          {customerScreen === "track" && currentCustomerJob && (
            <TrackJob job={currentCustomerJob} onLeaveTrack={onCustomerJobComplete} />
          )}
        </>
      )}

      {role === "operator" && (
        <OperatorDashboard
          availableJobs={availableJobs}
          recentJobs={jobs.filter((j) => j.status === "completed")}
          meProfile={meProfile}
          onAcceptJob={onAcceptJob}
          currentJob={currentOperatorJob || undefined}
          awaitingDeliveryJobs={awaitingDeliveryJobs}
          onStartJob={onStartJob}
          onCompleteJob={onCompleteJob}
          onDeliverMission={onDeliverMission}
          onDismissCurrentJob={onDismissCurrentOperatorJob}
          onMeProfileChange={onMeProfileChange}
          onLogout={onLogout}
        />
      )}

      {role === "admin" && (
        <AdminDashboard jobs={jobs} urgencyTiers={urgencyTiers} onUpdateTier={onUpdateUrgencyTiers} />
      )}
    </div>
  );
}
