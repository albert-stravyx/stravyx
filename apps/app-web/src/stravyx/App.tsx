"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LoginScreen } from "./components/LoginScreen";
import { AuthenticatedShell } from "./AuthenticatedShell";
import {
  Job,
  UrgencyTier,
  UrgencyPricing,
  URGENCY_TIERS,
} from "./types";
import { api } from "@/lib/api";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  categoryForService,
  customerMissionToJob,
  missionRowToJob,
} from "@/lib/mapMission";
import type { MissionRow } from "@/lib/mapMission";
import type { Session } from "@supabase/supabase-js";
import { notificationCopyForStatus, projectMeProfile, type AppRole, type CustomerNotificationItem, type MeProfile } from "@stravyx/types";
import { ApiError } from "@stravyx/api-client";
import { toast } from "sonner";
import { OPERATOR_NOT_VERIFIED_TOAST } from "@/lib/operatorVerificationCopy";
import { AccessPopup, ACCESS_STORAGE_KEY } from "./components/AccessPopup";
import { useOperatorJobSlot } from "@/lib/useOperatorJobSlot";
import {
  createFetchSequenceGate,
  isFetchResponseCurrent,
  advanceFetchSequenceGate,
} from "@/lib/fetchSequenceGate";
import {
  isSessionContinuationCurrent,
  resetSessionScopedState as applySessionScopedReset,
  shouldResetSessionScopedState,
  type CustomerScreen,
} from "@/lib/sessionScopedReset";
import {
  fireWebNotificationsForNewEvents,
} from "@/lib/customerNotificationToasts";
import {
  disableWebNotifications,
  enableWebNotifications,
  getWebNotificationSupport,
  readWebNotifyPref,
} from "@/lib/webNotificationPermission";
import {
  readWatermark,
  unreadCount,
  type NotificationWatermark,
} from "@/lib/customerNotificationUnread";
import { customerNotificationsRefreshFromSettled } from "@/lib/customerNotificationsRefresh";
import {
  refreshOperatorPoll,
  stampMeProfileAfterMutation,
} from "@/lib/operatorPollRefresh";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [roleReady, setRoleReady] = useState(false);
  const [role, setRole] = useState<AppRole>("customer");
  const [meProfile, setMeProfile] = useState<MeProfile | null>(null);
  const [customerScreen, setCustomerScreen] = useState<CustomerScreen>("home");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [offerByMission, setOfferByMission] = useState<Record<string, string>>({});
  const [currentCustomerJob, setCurrentCustomerJob] = useState<Job | null>(null);
  const operatorSlot = useOperatorJobSlot();
  const [loading, setLoading] = useState(false);
  const [urgencyTiers, setUrgencyTiers] = useState<Record<UrgencyTier, UrgencyPricing>>(URGENCY_TIERS);
  const [accessReady, setAccessReady] = useState(false);
  const [accessAccepted, setAccessAccepted] = useState(false);
  const [customerNotifications, setCustomerNotifications] = useState<CustomerNotificationItem[]>([]);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsReady, setNotificationsReady] = useState(false);
  const [notificationWatermark, setNotificationWatermark] = useState<NotificationWatermark | null>(null);
  const [webNotifyEnabled, setWebNotifyEnabled] = useState(false);
  const [webNotifyMessage, setWebNotifyMessage] = useState<string | null>(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(new Set());
  const notificationSeenIdsRef = useRef<Set<string>>(new Set());
  const hasSeededNotificationIdsRef = useRef(false);
  const webNotifyEnabledRef = useRef(false);
  const refreshSeqRef = useRef(0);
  const refreshGateRef = useRef(createFetchSequenceGate());
  const sessionUserIdRef = useRef<string | null>(null);

  const resetSessionScopedState = useCallback(() => {
    applySessionScopedReset({
      setRole,
      setMeProfile,
      setJobs,
      setAvailableJobs,
      setOfferByMission,
      setCurrentCustomerJob,
      setCustomerNotifications,
      setNotificationsError,
      setNotificationsReady,
      resetOperatorState: operatorSlot.resetOperatorState,
      setCustomerScreen,
      setWebNotifyEnabled,
      clearNotificationSessionState: () => {
        setWebNotifyMessage(null);
        setDismissedNotificationIds(new Set());
        notificationSeenIdsRef.current = new Set();
        hasSeededNotificationIdsRef.current = false;
      },
      invalidateInFlightRefreshes: () => {
        refreshGateRef.current = advanceFetchSequenceGate(refreshGateRef.current, refreshSeqRef.current);
      },
    });
  }, [operatorSlot.resetOperatorState]);

  const applySessionTransition = useCallback(
    (next: Session | null) => {
      const previousUserId = sessionUserIdRef.current;
      const nextUserId = next?.user?.id ?? null;
      if (shouldResetSessionScopedState(previousUserId, nextUserId)) {
        resetSessionScopedState();
      }
      sessionUserIdRef.current = nextUserId;
      setSession(next);
      setRoleReady(!next);
      setNotificationWatermark(nextUserId ? readWatermark(nextUserId) : null);
    },
    [resetSessionScopedState],
  );

  useEffect(() => {
    setAccessAccepted(window.localStorage.getItem(ACCESS_STORAGE_KEY) === "1");
    setAccessReady(true);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setAuthReady(true);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      applySessionTransition(data.session);
      setAuthReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      applySessionTransition(next);
    });
    return () => sub.subscription.unsubscribe();
  }, [applySessionTransition]);

  const refreshLists = useCallback(async (activeRole: AppRole) => {
    const fetchSeq = ++refreshSeqRef.current;
    try {
      if (activeRole === "customer") {
        const [missionsResult, notificationsResult] = await Promise.allSettled([
          api.listMissions(),
          api.listNotifications(),
        ]);

        if (isFetchResponseCurrent(refreshGateRef.current, fetchSeq)) {
          refreshGateRef.current = advanceFetchSequenceGate(refreshGateRef.current, fetchSeq);
          const notificationsRefresh =
            customerNotificationsRefreshFromSettled(notificationsResult);
          setNotificationsReady(notificationsRefresh.ready);
          setNotificationsError(notificationsRefresh.error);
          if (notificationsRefresh.notifications !== null) {
            const incoming = notificationsRefresh.notifications;
            setCustomerNotifications(incoming);
            if (!hasSeededNotificationIdsRef.current) {
              notificationSeenIdsRef.current = new Set(incoming.map((item) => item.id));
              hasSeededNotificationIdsRef.current = true;
            } else {
              fireWebNotificationsForNewEvents({
                incoming,
                previouslySeenIds: notificationSeenIdsRef.current,
                preferenceOn: webNotifyEnabledRef.current,
                permission: getWebNotificationSupport(),
                copy: notificationCopyForStatus,
              });
            }
          }
          if (missionsResult.status === "fulfilled") {
            const data = missionsResult.value;
            const rows: MissionRow[] = data.missions ?? [];
            const missions = rows.map(missionRowToJob);
            setJobs(missions);
            setCurrentCustomerJob((prev) => {
              if (!prev) return prev;
              const updated = missions.find((m) => m.id === prev.id);
              if (!updated) return prev;
              return {
                ...prev,
                ...updated,
                location: updated.location?.address
                  ? updated.location
                  : prev.location,
                serviceType: prev.serviceType || updated.serviceType,
                urgency: prev.urgency || updated.urgency,
                description: prev.description || updated.description,
                scheduledDate: prev.scheduledDate ?? updated.scheduledDate,
                scheduledTime: prev.scheduledTime ?? updated.scheduledTime,
              };
            });
            setAvailableJobs([]);
          }
        }

        if (missionsResult.status === "rejected") {
          throw missionsResult.reason;
        }
        return;
      }

      if (activeRole === "operator") {
        await refreshOperatorPoll({
          client: api, fetchSeq, gateRef: refreshGateRef,
          setMeProfile, setOfferByMission, setAvailableJobs, setJobs,
          applyOperatorRefresh: operatorSlot.applyOperatorRefresh,
        });
        return;
      }

      const data = await api.listMissions();
      if (!isFetchResponseCurrent(refreshGateRef.current, fetchSeq)) return;
      refreshGateRef.current = advanceFetchSequenceGate(refreshGateRef.current, fetchSeq);

      if (activeRole === "admin") {
        const rows: MissionRow[] = data.missions ?? [];
        const missions = rows.map(missionRowToJob);
        setJobs(missions);
        setAvailableJobs([]);
      }
    } catch (e) {
      console.error(e);
      // Avoid toast spam from the poll interval when the session is dead.
      if (e instanceof ApiError && e.status === 401) {
        toast.error("Session expired — please sign in again");
        await supabase.auth.signOut();
        return;
      }
      const message = e instanceof Error ? e.message : "Failed to load missions";
      toast.error(message);
    }
  }, []);

  useEffect(() => {
    if (!session) return;
    setRoleReady(false);
    let cancelled = false;
    let inFlight = false;
    const servingUserId = session.user.id;
    const continuationIsCurrent = () =>
      isSessionContinuationCurrent(servingUserId, sessionUserIdRef.current);
    const run = async (activeRole: AppRole) => {
      if (cancelled || inFlight) return;
      if (!continuationIsCurrent()) return;
      inFlight = true;
      try {
        await refreshLists(activeRole);
      } finally {
        inFlight = false;
      }
    };
    (async () => {
      try {
        const me = await api.me();
        if (cancelled || !continuationIsCurrent()) return;
        const r = (me.role ?? "customer") as AppRole;
        setRole(r);
        setMeProfile(
          me.profile ??
            projectMeProfile(null, {
              userId: me.userId,
              email: me.email,
              role: r,
            }),
        );
        await run(r);
        if (!cancelled && continuationIsCurrent()) setRoleReady(true);
      } catch (e) {
        console.error(e);
        if (e instanceof ApiError && e.status === 401) {
          toast.error("Session expired — please sign in again");
          await supabase.auth.signOut();
        }
        if (!cancelled && continuationIsCurrent()) setRoleReady(true);
      }
    })();
    const intervalMs =
      role === "customer" && customerScreen === "track" ? 2000 : 4000;
    const t = setInterval(() => {
      void run(role);
    }, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [session, role, customerScreen, refreshLists]);

  const handleLogin = async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      toast.error("Supabase env not configured");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Sign-out failed");
    }
  };

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;
    setWebNotifyEnabled(readWebNotifyPref(userId));
  }, [session?.user.id]);

  useEffect(() => {
    webNotifyEnabledRef.current = webNotifyEnabled;
  }, [webNotifyEnabled]);

  const handlePushToggle = useCallback(
    async (nextValue: boolean) => {
      const userId = session?.user.id;
      if (!userId) return;
      if (!nextValue) {
        disableWebNotifications(userId);
        setWebNotifyEnabled(false);
        setWebNotifyMessage(null);
        return;
      }

      const result = await enableWebNotifications(userId);
      setWebNotifyEnabled(result.preferenceOn);
      if (result.preferenceOn) {
        setWebNotifyMessage(null);
        return;
      }

      if (result.permission === "unsupported") {
        setWebNotifyMessage("Browser notifications are not available here.");
        return;
      }
      if (result.permission === "denied") {
        setWebNotifyMessage("Notifications are blocked in your browser settings.");
        return;
      }
      setWebNotifyMessage("Allow notifications in your browser to turn this on.");
    },
    [session?.user.id],
  );

  const unreadNotificationCount =
    session?.user.id
      ? unreadCount(
          customerNotifications.filter((item) => !dismissedNotificationIds.has(item.id)),
          notificationWatermark,
        )
      : 0;

  const handleUpdateUrgencyTiers = (tier: UrgencyTier, patch: Partial<UrgencyPricing>) => {
    setUrgencyTiers((prev) => ({ ...prev, [tier]: { ...prev[tier], ...patch } }));
  };

  const handleSubmitJob = async (jobData: Omit<Job, "id" | "status" | "createdAt"> & { serviceId?: string }) => {
    setLoading(true);
    try {
      const created = await api.createMission({
        durationMinutes: jobData.estimatedDuration,
        urgency: jobData.urgency,
        categoryCode: categoryForService(jobData.serviceId ?? "photography"),
        fullAddress: jobData.location.address,
        suburb: jobData.location.suburb?.trim() || jobData.location.address.split(",")[1]?.trim() || "Sydney",
        description: jobData.description,
        lat: jobData.location.lat,
        lng: jobData.location.lng,
      });
      const job = customerMissionToJob(
        {
          id: created.id,
          status: created.status,
          networkPriceCents: created.networkPriceCents,
          durationMinutes: created.durationMinutes,
          suburb: created.suburb,
        },
        {
          customerName: jobData.customerName,
          serviceType: jobData.serviceType,
          urgency: jobData.urgency,
          location: jobData.location,
          description: jobData.description,
        },
      );
      const withSchedule: Job = {
        ...job,
        scheduledDate: jobData.scheduledDate,
        scheduledTime: jobData.scheduledTime,
      };
      setCurrentCustomerJob(withSchedule);
      if (jobData.urgency === "scheduled") {
        setCustomerScreen("home");
        toast.success("Booking confirmed — we'll notify you when an operator accepts");
      } else {
        setCustomerScreen("track");
        toast.success(`Booked — Network Price $${(created.networkPriceCents / 100).toFixed(0)}`);
      }
      await refreshLists("customer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTrackJob = (job: Job) => {
    setCurrentCustomerJob(job);
    setCustomerScreen("track");
  };

  const handleAcceptJob = async (jobId: string) => {
    const offerId = offerByMission[jobId];
    if (!offerId) {
      toast.error("Offer not found");
      return;
    }
    try {
      const res = await api.acceptOffer(offerId);
      const job = availableJobs.find((j) => j.id === jobId);
      if (job) {
        const updated: Job = {
          ...job,
          status: "accepted",
          missionStatus: "accepted",
          location: {
            ...job.location,
            address: res.fullAddress ?? job.location.address,
          },
          acceptedAt: new Date(),
        };
        operatorSlot.setOperatorJobSlot(updated);
      }
      await refreshLists("operator");
      toast.success("Mission accepted");
    } catch (e) {
      if (e instanceof ApiError && e.code === "operator_not_verified") {
        toast.error(OPERATOR_NOT_VERIFIED_TOAST);
        return;
      }
      toast.error(e instanceof Error ? e.message : "Accept failed");
    }
  };

  const handleStartJob = async () => {
    const currentOperatorJob = operatorSlot.currentOperatorJob;
    if (!currentOperatorJob) return;
    try {
      await api.updateMissionStatus(currentOperatorJob.id, "allocated");
      const updated = { ...currentOperatorJob, status: "in_progress" as const, missionStatus: "allocated" as const };
      operatorSlot.setOperatorJobSlot(updated);
      await refreshLists("operator");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status update failed");
    }
  };

  const handleCompleteJob = async () => {
    const currentOperatorJob = operatorSlot.currentOperatorJob;
    if (!currentOperatorJob) return;
    try {
      await api.updateMissionStatus(currentOperatorJob.id, "flown");
      operatorSlot.recordCompletionPin(currentOperatorJob.id, refreshSeqRef.current);
      operatorSlot.setOperatorJobSlot({
        ...currentOperatorJob,
        status: "completed",
        missionStatus: "flown",
        completedAt: new Date(),
      });
      await refreshLists("operator");
      toast.success("Mission marked flown — upload files, then deliver to the customer");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Complete failed");
    }
  };

  const handleDeliverMission = async (missionId: string) => {
    try {
      const res = await api.deliverMission(missionId);
      operatorSlot.markDismissed(missionId, refreshSeqRef.current);
      const pinnedJob = operatorSlot.currentOperatorJobRef.current;
      if (pinnedJob && pinnedJob.id === missionId) operatorSlot.setOperatorJobSlot(null);
      toast.success(`Delivered ${res.releasedCount} file${res.releasedCount === 1 ? "" : "s"} to the customer`);
      await refreshLists("operator");
    } catch (e) {
      const message = e instanceof Error ? e.message : "Delivery failed";
      toast.error(message);
      throw e instanceof Error ? e : new Error(message);
    }
  };

  const handleDismissCurrentOperatorJob = () => {
    const currentOperatorJob = operatorSlot.currentOperatorJob;
    if (currentOperatorJob && currentOperatorJob.status === "completed" && currentOperatorJob.missionStatus === "delivered") {
      operatorSlot.markDismissed(currentOperatorJob.id, refreshSeqRef.current);
      operatorSlot.setOperatorJobSlot(null);
    }
  };

  const handleCustomerJobComplete = () => {
    setCurrentCustomerJob(null);
    setCustomerScreen("home");
    void refreshLists("customer");
  };

  if (!accessReady || !authReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#fafafa] text-[#737373]">
        Loading…
      </div>
    );
  }

  if (!accessAccepted) {
    return (
      <AccessPopup
        onAccept={() => {
          window.localStorage.setItem(ACCESS_STORAGE_KEY, "1");
          setAccessAccepted(true);
        }}
      />
    );
  }

  if (!session) {
    return <LoginScreen onLogin={handleLogin} onSignup={(input) => api.signup(input)} loading={loading} />;
  }

  if (!roleReady) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#fafafa] text-[#737373]">
        Loading dashboard…
      </div>
    );
  }

  return (
    <AuthenticatedShell
      role={role}
      customerScreen={customerScreen}
      jobs={jobs}
      availableJobs={availableJobs}
      currentCustomerJob={currentCustomerJob}
      currentOperatorJob={operatorSlot.currentOperatorJob}
      awaitingDeliveryJobs={operatorSlot.awaitingDeliveryJobs}
      urgencyTiers={urgencyTiers}
      session={session}
      meProfile={meProfile}
      customerNotifications={customerNotifications}
      notificationsReady={notificationsReady}
      notificationsError={notificationsError}
      unreadNotificationCount={unreadNotificationCount}
      notificationWatermark={notificationWatermark}
      dismissedNotificationIds={dismissedNotificationIds}
      webNotifyEnabled={webNotifyEnabled}
      webNotifyMessage={webNotifyMessage}
      onSubmitJob={handleSubmitJob}
      onTrackJob={handleTrackJob}
      onLogout={handleLogout}
      onNotificationWatermarkChange={setNotificationWatermark}
      onRetryNotifications={() => {
        void refreshLists("customer");
      }}
      onDismissNotification={(id) => {
        setDismissedNotificationIds((current) => new Set(current).add(id));
      }}
      onPushToggle={handlePushToggle}
      onCustomerJobComplete={handleCustomerJobComplete}
      onAcceptJob={handleAcceptJob}
      onStartJob={handleStartJob}
      onCompleteJob={handleCompleteJob}
      onDeliverMission={handleDeliverMission}
      onDismissCurrentOperatorJob={handleDismissCurrentOperatorJob}
      onMeProfileChange={(profile) => {
        stampMeProfileAfterMutation(refreshGateRef, refreshSeqRef, setMeProfile, profile);
      }}
      onUpdateUrgencyTiers={handleUpdateUrgencyTiers}
    />
  );
}
