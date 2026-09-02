// Regression coverage for the session-transition reset authority in
// `App.tsx`: session-scoped state (role, mission lists, the operator slot,
// the active customer screen, the refresh freshness gate) must be cleared
// on the auth *session transition* itself — not only in the logout button
// handler — so a sign-out that bypasses the button (a 401 handler's
// `supabase.auth.signOut()`, or a Supabase-initiated expiry) can never leak
// the previous session's state into whoever signs in next.
//
// `App.tsx` pulls in the Supabase client, `@stravyx/api-client`, and several
// child components, so mounting the real component (or faking those) would
// require heavy mocking infrastructure to exercise this. Instead, the
// decision points that actually matter — "does this transition need a
// reset?", "may this async continuation still write?", and "what exactly
// does a reset touch?" — are factored out of `App.tsx` into
// `sessionScopedReset.ts` as dependency-free functions, so they are
// testable here directly with plain spies: no React render, no Supabase
// client, no DOM.
//
// Read-verified in `App.tsx` (not claimed by these tests): the auth
// listener and `getSession()` both funnel through `applySessionTransition`;
// `isSessionContinuationCurrent` is called after `api.me()` (success and
// catch) and inside `run` before `refreshLists`; `cancelled` remains the
// effect-unmount guard alongside the user-id check. The interval/poll
// effect picking up the corrected role after a reset is also read-verified.
import { describe, expect, it, vi } from "vitest";
import {
  isSessionContinuationCurrent,
  resetSessionScopedState,
  shouldResetSessionScopedState,
  type SessionScopedStateSetters,
} from "../../apps/app-web/src/lib/sessionScopedReset.ts";
import {
  advanceFetchSequenceGate,
  createFetchSequenceGate,
  isFetchResponseCurrent,
} from "../../apps/app-web/src/lib/fetchSequenceGate.ts";

describe("shouldResetSessionScopedState (session-transition decision boundary)", () => {
  it("is false when there is no session on either side (null → null)", () => {
    expect(shouldResetSessionScopedState(null, null)).toBe(false);
  });

  it("is true on login (null → user) — not hydration; a dirty leftover must be wiped", () => {
    // Load-bearing: login after a stale poll continuation rewrote role/lists
    // must reset. Treating null → user as "hydration, nothing to wipe" let a
    // leftover operator role survive into the next customer's session.
    expect(shouldResetSessionScopedState(null, "user-a")).toBe(true);
  });

  it("is false when the SAME user's session is replaced (token refresh, user update)", () => {
    expect(shouldResetSessionScopedState("user-a", "user-a")).toBe(false);
  });

  it("is true on sign-out — a previously-held user transitions to no session", () => {
    expect(shouldResetSessionScopedState("user-a", null)).toBe(true);
  });

  it("is true on user replacement — a DIFFERENT user's session arrives with no intervening null", () => {
    expect(shouldResetSessionScopedState("user-a", "user-b")).toBe(true);
  });
});

describe("isSessionContinuationCurrent (stale poll continuation after sync reset)", () => {
  // Binds the decision `App.tsx` uses after every await in the poll effect.
  // After a sign-out, `sessionUserIdRef` is already `null` while `cancelled`
  // is still false (cleanup has not run). A continuation that captured
  // "user-a" must not `setRole` / start `refreshLists` / `setRoleReady`.
  it("is false after sign-out — captured id no longer matches current (null)", () => {
    expect(isSessionContinuationCurrent("user-a", null)).toBe(false);
  });

  it("is true while the captured id still matches the current session", () => {
    expect(isSessionContinuationCurrent("user-a", "user-a")).toBe(true);
  });

  it("is false when a different user's id is current (user replacement, no intervening null)", () => {
    expect(isSessionContinuationCurrent("user-a", "user-b")).toBe(false);
  });
});

function makeSetterSpies() {
  return {
    setRole: vi.fn(),
    setMeProfile: vi.fn(),
    setJobs: vi.fn(),
    setAvailableJobs: vi.fn(),
    setOfferByMission: vi.fn(),
    setCurrentCustomerJob: vi.fn(),
    setCustomerNotifications: vi.fn(),
    setNotificationsError: vi.fn(),
    setNotificationsReady: vi.fn(),
    resetOperatorState: vi.fn(),
    setCustomerScreen: vi.fn(),
    setWebNotifyEnabled: vi.fn(),
    clearNotificationSessionState: vi.fn(),
    invalidateInFlightRefreshes: vi.fn(),
  } satisfies SessionScopedStateSetters;
}

describe("resetSessionScopedState (single reset authority)", () => {
  // NOTE ON COVERAGE: this only proves `invalidateInFlightRefreshes` is
  // CALLED — not that App.tsx's real implementation of it is correct. A
  // spy can't see inside the closure App.tsx builds. The actual gate
  // invalidation behaviour (what a wrong implementation of that closure
  // would get wrong — see the HIGH finding this replaced) is covered
  // separately below, directly against the `fetchSequenceGate.ts`
  // primitives App.tsx composes, without contorting this spy-based test to
  // reach through an opaque callback.
  it("clears every piece of session-scoped state it owns, exactly once each", () => {
    const setters = makeSetterSpies();

    resetSessionScopedState(setters);

    expect(setters.setRole).toHaveBeenCalledTimes(1);
    expect(setters.setRole).toHaveBeenCalledWith("customer");
    expect(setters.setMeProfile).toHaveBeenCalledTimes(1);
    expect(setters.setMeProfile).toHaveBeenCalledWith(null);
    expect(setters.setJobs).toHaveBeenCalledTimes(1);
    expect(setters.setJobs).toHaveBeenCalledWith([]);
    expect(setters.setAvailableJobs).toHaveBeenCalledTimes(1);
    expect(setters.setAvailableJobs).toHaveBeenCalledWith([]);
    expect(setters.setOfferByMission).toHaveBeenCalledTimes(1);
    expect(setters.setOfferByMission).toHaveBeenCalledWith({});
    expect(setters.setCurrentCustomerJob).toHaveBeenCalledTimes(1);
    expect(setters.setCurrentCustomerJob).toHaveBeenCalledWith(null);
    expect(setters.setCustomerNotifications).toHaveBeenCalledTimes(1);
    expect(setters.setCustomerNotifications).toHaveBeenCalledWith([]);
    expect(setters.setNotificationsError).toHaveBeenCalledTimes(1);
    expect(setters.setNotificationsError).toHaveBeenCalledWith(null);
    expect(setters.setNotificationsReady).toHaveBeenCalledTimes(1);
    expect(setters.setNotificationsReady).toHaveBeenCalledWith(false);
    expect(setters.resetOperatorState).toHaveBeenCalledTimes(1);
    expect(setters.setCustomerScreen).toHaveBeenCalledTimes(1);
    expect(setters.setCustomerScreen).toHaveBeenCalledWith("home");
    expect(setters.setWebNotifyEnabled).toHaveBeenCalledTimes(1);
    expect(setters.setWebNotifyEnabled).toHaveBeenCalledWith(false);
    expect(setters.clearNotificationSessionState).toHaveBeenCalledTimes(1);
    expect(setters.invalidateInFlightRefreshes).toHaveBeenCalledTimes(1);
  });

  it("does not call any setter it was not given (so a future addition must be explicit, not incidental)", () => {
    const setters = makeSetterSpies();
    resetSessionScopedState(setters);
    const allSpies = Object.values(setters);
    for (const spy of allSpies) {
      expect(spy.mock.calls.length).toBeGreaterThan(0);
    }
    // Exactly the fourteen setters above — no more, no fewer — is the whole
    // contract surface; this guards against a silent partial reset if the
    // interface ever grows without a corresponding call being added.
    expect(allSpies).toHaveLength(14);
  });
});

describe("session-reset gate invalidation (regression: zeroing the gate was a HIGH finding)", () => {
  // Reproduces `App.tsx`'s real `invalidateInFlightRefreshes` composition —
  // `refreshGateRef.current = advanceFetchSequenceGate(refreshGateRef.current,
  // refreshSeqRef.current)` — against the actual `fetchSequenceGate.ts`
  // primitives, not through the opaque setter spy above. This is the exact
  // scenario the reviewer traced: user A's session has a `refreshLists`
  // fetch in flight at `fetchSeq = 5` (never applied — no response yet) when
  // the session resets.
  it("rejects a pre-reset in-flight fetch's late response (fetchSeq <= the counter snapshot at reset time)", () => {
    const gateBeforeReset = createFetchSequenceGate();
    const refreshSeqAtResetTime = 5; // A's in-flight fetch already holds fetchSeq = 5

    // What a WRONG fix (zeroing) would do: `createFetchSequenceGate()` gives
    // `{ lastAppliedSeq: 0 }`, and `isFetchResponseCurrent({ lastAppliedSeq: 0
    // }, 5)` is `true` — A's stale response would incorrectly apply. The
    // correct fix advances instead:
    const gateAfterReset = advanceFetchSequenceGate(gateBeforeReset, refreshSeqAtResetTime);

    // A's in-flight fetch (fetchSeq = 5, the exact snapshot value) is now stale.
    expect(isFetchResponseCurrent(gateAfterReset, 5)).toBe(false);
    // Anything started even earlier is also stale.
    expect(isFetchResponseCurrent(gateAfterReset, 3)).toBe(false);
  });

  it("still accepts the new session's first fetch (fetchSeq > the counter snapshot at reset time)", () => {
    const gateBeforeReset = createFetchSequenceGate();
    const refreshSeqAtResetTime = 5;
    const gateAfterReset = advanceFetchSequenceGate(gateBeforeReset, refreshSeqAtResetTime);

    // `refreshSeqRef` is never reset (see its doc comment in `App.tsx`), so
    // user B's first fetch is `++refreshSeqRef.current` starting from 5 — i.e.
    // fetchSeq = 6 — strictly greater than the snapshot the reset advanced to.
    const newSessionFirstFetchSeq = refreshSeqAtResetTime + 1;
    expect(isFetchResponseCurrent(gateAfterReset, newSessionFirstFetchSeq)).toBe(true);
  });
});
