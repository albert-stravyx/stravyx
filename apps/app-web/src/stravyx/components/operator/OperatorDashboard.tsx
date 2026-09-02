import { useEffect, useState } from "react";
import { Job } from "../../types";
import { Logo } from "../Logo";
import { OperatorJobDetails } from "./OperatorJobDetails";
import { Tab, TABS, TabBar, AvailabilityToggle } from "./OperatorShared";
import { DashboardTab } from "./OperatorDashboardTab";
import { ActivityTab } from "./OperatorActivityTab";
import { VerificationTab } from "./OperatorVerificationTab";
import { ProfileTab } from "./OperatorProfileTab";
import type { MeProfile } from "@stravyx/types";
import { displayOrUnset } from "@/lib/shellProfile";
import { operatorDashboardStats, operatorEarn } from "@/lib/dashboardStats";
import { isOperatorVerified } from "@/lib/operatorVerificationCopy";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { ApiError } from "@stravyx/api-client";

interface OperatorDashboardProps {
  availableJobs: Job[];
  /** Completed missions for Activity → Recent Jobs */
  recentJobs?: Job[];
  meProfile: MeProfile | null;
  onAcceptJob: (jobId: string) => void;
  currentJob?: Job;
  /** Flown-not-delivered jobs, for the "Awaiting delivery" queue. May include `currentJob`. */
  awaitingDeliveryJobs?: Job[];
  onStartJob?: () => void;
  onCompleteJob?: () => void;
  onDeliverMission?: (missionId: string) => Promise<void> | void;
  /** Clears the sticky current job in App once a delivered job's details are dismissed. */
  onDismissCurrentJob?: () => void;
  onMeProfileChange?: (profile: MeProfile) => void;
  onLogout?: () => void;
}

// ─── Root component ───────────────────────────────────────────────────────────

export function OperatorDashboard({
  availableJobs, recentJobs = [], meProfile, onAcceptJob, currentJob, awaitingDeliveryJobs = [], onStartJob, onCompleteJob, onDeliverMission, onDismissCurrentJob, onMeProfileChange, onLogout,
}: OperatorDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [availabilityBusy, setAvailabilityBusy] = useState(false);
  const [detailsJobId, setDetailsJobId] = useState<string | null>(null);
  const operatorVerified = isOperatorVerified(meProfile?.verified);
  const online = operatorVerified && meProfile?.online === true;

  const handleAvailabilityChange = async (nextOnline: boolean) => {
    if (!operatorVerified || !meProfile || availabilityBusy) return;
    setAvailabilityBusy(true);
    try {
      const result = await api.setOperatorAvailability({ online: nextOnline });
      onMeProfileChange?.({ ...meProfile, online: result.online });
    } catch (error) {
      const unverified = error instanceof ApiError && error.code === "operator_not_verified";
      toast.error(
        unverified
          ? "A Stravyx admin must verify your credentials before you can go online."
          : error instanceof Error ? error.message : "Could not update availability",
      );
    } finally {
      setAvailabilityBusy(false);
    }
  };

  // Resolved fresh every render so polling updates (new job objects from
  // App) flow straight into an open details screen without a stale copy.
  const detailsJob: Job | undefined =
    detailsJobId === null
      ? undefined
      : currentJob?.id === detailsJobId
        ? currentJob
        : awaitingDeliveryJobs.find((j) => j.id === detailsJobId);

  // If the job backing an open details screen disappears from every source
  // (e.g. delivered and dropped from the awaiting-delivery list by another
  // client, or dismissed), close it rather than leaving a stale reference.
  useEffect(() => {
    if (detailsJobId !== null && !detailsJob) {
      setDetailsJobId(null);
    }
  }, [detailsJobId, detailsJob]);

  const queueJobs = awaitingDeliveryJobs.filter((j) => j.id !== currentJob?.id);

  const recentRows = recentJobs.map((j) => ({
    id: j.id,
    service: j.serviceType,
    location: j.location.address,
    date: j.completedAt
      ? j.completedAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
      : j.createdAt.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" }),
    earn: operatorEarn(j),
    status: j.status,
    duration: j.estimatedDuration,
  }));
  const dashboard = operatorDashboardStats(recentJobs, new Date());
  const todayIndex = (new Date().getDay() + 6) % 7;
  const highlightDay = dashboard.weeklyEarnings[todayIndex]?.day;

  if (detailsJobId !== null && detailsJob) {
    return (
      <OperatorJobDetails
        job={detailsJob}
        onStartJob={onStartJob}
        onCompleteJob={onCompleteJob}
        onDeliverMission={onDeliverMission}
        onDelivered={() => setDetailsJobId(null)}
        onClose={() => {
          setDetailsJobId(null);
          // Closing a delivered current job releases the sticky slot so
          // polling can surface a later active job. Flown (awaiting
          // delivery) stays sticky so View details / Deliver remain
          // reachable. Successful delivers already clear/dismiss the slot
          // themselves (see onDelivered above / App's handleDeliverMission);
          // this only guards a manual close of an already-delivered job.
          if (
            currentJob &&
            detailsJob.id === currentJob.id &&
            currentJob.status === "completed" &&
            currentJob.missionStatus === "delivered"
          ) {
            onDismissCurrentJob?.();
          }
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[#fafafa] flex flex-col overflow-hidden">
      {/* Top header */}
      <div className="flex-shrink-0 bg-white border-b border-[#e8e8e8] px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo className="h-10 md:h-14" />
          <div className="hidden md:block h-8 w-px bg-[#e8e8e8]" />
          <div className="hidden md:block">
            <p className="text-[15px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>Operator Dashboard</p>
            <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{displayOrUnset(meProfile?.fullName)}</p>
          </div>
        </div>
        <AvailabilityToggle
          online={online}
          onChange={handleAvailabilityChange}
          disabled={!operatorVerified || availabilityBusy}
        />
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop sidebar nav */}
        <div className="hidden md:flex w-[200px] flex-shrink-0 flex-col bg-white border-r border-[#e8e8e8] px-3 py-5 gap-1">
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-h-0 overflow-y-auto px-4 md:px-6 py-5 pb-24 md:pb-6">
          {activeTab === "dashboard" && (
            <DashboardTab
              online={online}
              availableJobs={availableJobs}
              currentJob={currentJob}
              awaitingDeliveryJobs={queueJobs}
              stats={dashboard}
              canAccept={operatorVerified}
              verificationBlocked={!operatorVerified}
              onGoToVerification={() => setActiveTab("verification")}
              onAcceptJob={onAcceptJob}
              onOpenJobDetails={(jobId) => setDetailsJobId(jobId ?? currentJob?.id ?? null)}
              onStartJob={onStartJob}
              onCompleteJob={onCompleteJob}
            />
          )}
          {activeTab === "activity" && (
            <ActivityTab
              recentJobs={recentRows}
              weeklyEarnings={dashboard.weeklyEarnings}
              thisWeekEarn={dashboard.thisWeekEarn}
              thisMonthEarn={dashboard.thisMonthEarn}
              highlightDay={highlightDay}
            />
          )}
          {activeTab === "verification" && <VerificationTab meProfile={meProfile} />}
          {activeTab === "profile" && <ProfileTab online={online} onOnlineChange={handleAvailabilityChange} availabilityLocked={!operatorVerified || availabilityBusy} onLogout={onLogout} meProfile={meProfile} />}
        </div>
      </div>

      {/* Mobile bottom tab bar — desktop nav is already in the sidebar above */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#e8e8e8] flex z-30" style={{ paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
        {TABS.map(({ id, label, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button key={id} onClick={() => setActiveTab(id)} className="flex-1 flex flex-col items-center gap-1 py-3">
              <Icon size={22} style={{ color: isActive ? "#5cb89c" : "#b0b0b0" }} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: isActive ? 600 : 400, color: isActive ? "#5cb89c" : "#b0b0b0" }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
