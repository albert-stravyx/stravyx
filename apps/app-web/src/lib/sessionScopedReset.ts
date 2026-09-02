import type { Job } from "../stravyx/types";
import type { AppRole, CustomerNotificationItem, MeProfile } from "@stravyx/types";

export type CustomerScreen = "home" | "track";

/**
 * Decides whether an auth session transition must clear session-scoped
 * state. Reset iff the two ids differ — sign-out (`user → null`), login
 * (`null → user`), and one user's session being replaced by a different
 * user's without an intervening null (`onAuthStateChange` never guarantees
 * one). Login is a reset, not hydration: a new session must start from
 * known-clean defaults even if a stale write path left leftover role or
 * lists. `false` only when the ids are the same: `null → null`, or the
 * SAME user's session being replaced (token refresh, user-metadata update)
 * — resetting there would needlessly drop in-progress state for no actual
 * session change.
 *
 * Pulled out of `App.tsx`'s `applySessionTransition` as a plain,
 * dependency-free predicate so the exact decision boundary — the part most
 * likely to regress — is unit-testable without React, Supabase, or a DOM.
 */
export function shouldResetSessionScopedState(
  previousUserId: string | null,
  nextUserId: string | null,
): boolean {
  return previousUserId !== nextUserId;
}

/**
 * Whether an async poll-effect continuation started for `expectedUserId`
 * may still write session-scoped state. `currentUserId` is
 * `sessionUserIdRef.current` — written synchronously in
 * `applySessionTransition` **before** `setSession`, so it is the source of
 * truth even before the effect's cleanup flips `cancelled`. False after
 * sign-out (`currentUserId` is `null`) and after user replacement.
 *
 * `cancelled` stays as the unmount guard; this is the sync invalidation
 * that cleanup cannot provide. Do not replace this with a second generation
 * counter: the ref already changes on sign-out and on user replacement.
 */
export function isSessionContinuationCurrent(
  expectedUserId: string,
  currentUserId: string | null,
): boolean {
  return currentUserId === expectedUserId;
}

/**
 * One function per piece of session-scoped state `App.tsx` owns, plus the
 * operator slot's own reset and a way to invalidate every in-flight
 * `refreshLists` fetch that started before this reset. `resetSessionScopedState`
 * is parameterised on these rather than closing over `App.tsx`'s actual
 * `useState`/`useRef` values so the reset SEQUENCE is testable with plain
 * spies — no React render, no Supabase client, no DOM.
 *
 * `invalidateInFlightRefreshes` must NOT zero the freshness gate back to
 * `{ lastAppliedSeq: 0 }` — that was a HIGH finding (see
 * `docs/KNOWN_ISSUES.md`): a pre-reset in-flight fetch's response would then
 * satisfy `isFetchResponseCurrent` against the zeroed gate and apply the
 * previous user's missions/offers into the new session. The caller must
 * instead advance the gate to the current `refreshSeqRef` value via
 * `advanceFetchSequenceGate` (never a hand-constructed gate literal), so
 * every fetch started up to and including this moment is marked stale while
 * the new session's first fetch — whose `fetchSeq` is strictly greater,
 * because that counter is never reset — still passes.
 */
export interface SessionScopedStateSetters {
  setRole: (role: AppRole) => void;
  setMeProfile: (profile: MeProfile | null) => void;
  setJobs: (jobs: Job[]) => void;
  setAvailableJobs: (jobs: Job[]) => void;
  setOfferByMission: (map: Record<string, string>) => void;
  setCurrentCustomerJob: (job: Job | null) => void;
  setCustomerNotifications: (notifications: CustomerNotificationItem[]) => void;
  setNotificationsError: (message: string | null) => void;
  setNotificationsReady: (ready: boolean) => void;
  resetOperatorState: () => void;
  setCustomerScreen: (screen: CustomerScreen) => void;
  setWebNotifyEnabled: (enabled: boolean) => void;
  clearNotificationSessionState: () => void;
  invalidateInFlightRefreshes: () => void;
}

/**
 * The single reset authority for everything scoped to one auth session:
 * role, `/me` profile, both mission lists, the operator-offer map, the live
 * customer job, the operator slot (queue + pin bookkeeping), the active
 * customer screen, and every in-flight `refreshLists` fetch that predates
 * this reset. Called from `App.tsx`'s `applySessionTransition` whenever
 * `shouldResetSessionScopedState` is true, and from nowhere else — see
 * `docs/KNOWN_ISSUES.md` for the duplication (session transition vs. the
 * logout button each keeping their own copy) this replaces.
 */
export function resetSessionScopedState(setters: SessionScopedStateSetters): void {
  setters.setRole("customer");
  setters.setMeProfile(null);
  setters.setJobs([]);
  setters.setAvailableJobs([]);
  setters.setOfferByMission({});
  setters.setCurrentCustomerJob(null);
  setters.setCustomerNotifications([]);
  setters.setNotificationsError(null);
  setters.setNotificationsReady(false);
  setters.resetOperatorState();
  setters.setCustomerScreen("home");
  setters.setWebNotifyEnabled(false);
  setters.clearNotificationSessionState();
  setters.invalidateInFlightRefreshes();
}
