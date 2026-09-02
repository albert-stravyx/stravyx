// @vitest-environment happy-dom
//
// Hook-level contract for the HIGH A fix: `useOperatorJobSlot` must resolve
// the sticky "Current Job" slot AND the "Awaiting delivery" queue from ONE
// `resolveOperatorSlot` call, using a ref (not a value smuggled out of a
// `setState` updater) — even while an update is already pending on the same
// hook. A pure-function test on `resolveOperatorSlot` alone (see
// `operator-dashboard-freshness.test.ts`) cannot exercise React's actual
// update-queue scheduling; this file mounts the real hook with
// `@testing-library/react`'s `renderHook` (`happy-dom` DOM environment,
// scoped to this file only via the docblock above) to do that.
import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { Job } from "../../apps/app-web/src/stravyx/types.ts";
import { useOperatorJobSlot } from "../../apps/app-web/src/lib/useOperatorJobSlot.ts";

function makeJob(overrides: Partial<Job> & { id: string }): Job {
  return {
    id: overrides.id,
    customerId: "customer-1",
    customerName: "Ada Customer",
    status: "accepted",
    serviceType: "mapping",
    urgency: "standard",
    location: { address: "1 Test St, Sydney", lat: -33.87, lng: 151.21 },
    estimatedDuration: 30,
    flightFee: 10_000,
    totalPrice: 12_000,
    description: "Test mission",
    createdAt: new Date("2024-01-01T00:00:00Z"),
    ...overrides,
  };
}

describe("useOperatorJobSlot (HIGH A hook-level contract)", () => {
  it("resolves the slot and the awaiting-delivery queue correctly from ONE refresh, even while a slot update is already pending on the hook", () => {
    const { result } = renderHook(() => useOperatorJobSlot());

    const initialAccepted = makeJob({ id: "mission-c", status: "accepted", missionStatus: "accepted" });
    const liveMission = makeJob({ id: "mission-b", status: "in_progress", missionStatus: "allocated" });
    const awaitingMission = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });

    act(() => {
      // (1) Dispatch a slot update first. This schedules a pending update
      // on the hook's fiber — the exact condition under which React skips
      // its eager-updater optimization for any subsequent `setState` call
      // in the same synchronous batch (see `useOperatorJobSlot`'s HIGH A
      // doc comment): a value assigned inside a LATER functional updater
      // would not actually be computed until render, so reading it
      // immediately after registering it (the old, buggy pattern) would
      // observe a stale/default value.
      result.current.setOperatorJobSlot(initialAccepted);
      // (2) Apply a refresh containing a live mission plus an unrelated
      // awaiting-delivery mission, in the SAME act, while (1)'s update is
      // still pending/unflushed.
      result.current.applyOperatorRefresh({
        list: [liveMission, awaitingMission],
        fetchSeq: 1,
      });
    });

    // Both must reflect this single refresh's inputs — not a queue read
    // from a separate, possibly still-default/empty value.
    expect(result.current.currentOperatorJob).toEqual(liveMission);
    expect(result.current.awaitingDeliveryJobs).toEqual([awaitingMission]);
  });
});

describe("useOperatorJobSlot markDismissed (queue atomicity regression)", () => {
  it("removes the mission from awaitingDeliveryJobs immediately, with NO further applyOperatorRefresh applied", () => {
    const { result } = renderHook(() => useOperatorJobSlot());

    const awaitingMission = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });
    const otherAwaiting = makeJob({ id: "mission-z", status: "completed", missionStatus: "flown" });

    // Populate the queue the same way `refreshLists` would: one accepted
    // `applyOperatorRefresh` response containing two awaiting-delivery
    // missions.
    act(() => {
      result.current.applyOperatorRefresh({
        list: [awaitingMission, otherAwaiting],
        fetchSeq: 1,
      });
    });
    expect(result.current.awaitingDeliveryJobs).toEqual([awaitingMission, otherAwaiting]);

    // Simulate `handleDeliverMission`'s real failure mode: the delivery API
    // call succeeded and `markDismissed` ran, but the subsequent
    // `refreshLists("operator")` never got applied (network failure, 401
    // early-return, or lost the freshness-gate race to a concurrent poll).
    // No further `applyOperatorRefresh` call happens here at all.
    act(() => {
      result.current.markDismissed("mission-a", 1);
    });

    // The delivered mission must be gone from the queue even though no
    // refresh ever ran — this is what fails on pre-fix code, since
    // `markDismissed` only touched the dismissal watermark and the pin map,
    // never `awaitingDeliveryJobs`.
    expect(result.current.awaitingDeliveryJobs).toEqual([otherAwaiting]);
  });

  it("still allows genuine re-activation: a later response (fetchSeq > dismissal seq) that reports the mission flown again re-adds it", () => {
    const { result } = renderHook(() => useOperatorJobSlot());

    const awaitingMission = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });

    act(() => {
      result.current.applyOperatorRefresh({ list: [awaitingMission], fetchSeq: 1 });
    });
    expect(result.current.awaitingDeliveryJobs).toEqual([awaitingMission]);

    act(() => {
      result.current.markDismissed("mission-a", 2);
    });
    expect(result.current.awaitingDeliveryJobs).toEqual([]);

    // A later fetch (started after the dismissal, fetchSeq > 2) is
    // authoritative per the dismissal design: the demo API does not enforce
    // forward-only transitions, so if it genuinely still/again reports the
    // mission as flown-not-delivered, that must surface — the local removal
    // above must not be a permanent suppression.
    act(() => {
      result.current.applyOperatorRefresh({ list: [awaitingMission], fetchSeq: 3 });
    });
    expect(result.current.awaitingDeliveryJobs).toEqual([awaitingMission]);
  });
});
