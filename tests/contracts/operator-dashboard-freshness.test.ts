import { describe, expect, it } from "vitest";
import type { Job } from "../../apps/app-web/src/stravyx/types.ts";
import {
  resolveOperatorSlot,
  isAwaitingDelivery,
} from "../../apps/app-web/src/lib/operatorJobSelection.ts";
import {
  createFetchSequenceGate,
  isFetchResponseCurrent,
  advanceFetchSequenceGate,
} from "../../apps/app-web/src/lib/fetchSequenceGate.ts";
import {
  createPinnedAtSeqMap,
  recordPinnedAtSeq,
} from "../../apps/app-web/src/lib/pinnedAtSeq.ts";

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

describe("fetchSequenceGate (shared by refreshLists and the media list panel)", () => {
  it("rejects a response from an earlier-started fetch once a later-started fetch's response has been applied", () => {
    let gate = createFetchSequenceGate();
    gate = advanceFetchSequenceGate(gate, 5); // response for fetchSeq 5 already applied
    expect(isFetchResponseCurrent(gate, 3)).toBe(false); // an earlier-started fetch (seq 3) resolving late
    expect(isFetchResponseCurrent(gate, 5)).toBe(false); // the same response is never re-applied
    expect(isFetchResponseCurrent(gate, 6)).toBe(true); // a genuinely later fetch is still current
  });

  it("never regresses the watermark when an older seq is advanced to after a newer one applied", () => {
    let gate = createFetchSequenceGate();
    gate = advanceFetchSequenceGate(gate, 5);
    gate = advanceFetchSequenceGate(gate, 2);
    expect(gate.lastAppliedSeq).toBe(5);
  });

  it("HIGH 4: rejects an older media-list response after a delete invalidates every in-flight request", () => {
    let gate = createFetchSequenceGate();
    // A list request (seq 1) is in flight when a delete succeeds. The delete
    // invalidates every request started up to the current counter (still 1 —
    // no new request has started yet), before the reload below begins.
    const inFlightListSeq = 1;
    gate = advanceFetchSequenceGate(gate, inFlightListSeq);
    // The in-flight request's response arrives late and must be rejected —
    // applying it would re-add the just-deleted row.
    expect(isFetchResponseCurrent(gate, inFlightListSeq)).toBe(false);
    // The delete's own reload starts a fresh, higher-seq request, which is
    // still current and may apply normally.
    const reloadSeq = 2;
    expect(isFetchResponseCurrent(gate, reloadSeq)).toBe(true);
    gate = advanceFetchSequenceGate(gate, reloadSeq);
    // The stale seq-1 response is rejected even after the reload applies.
    expect(isFetchResponseCurrent(gate, inFlightListSeq)).toBe(false);
  });
});

describe("resolveOperatorSlot", () => {
  it("HIGH 1: suppresses a mission dismissed at/after this response's fetch seq from both the slot and the awaiting-delivery queue", () => {
    const missionA = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });

    // Dismissed (delivered) at seq 5. A response from a fetch that started
    // at or before seq 5 may predate the delivery persisting server-side.
    const dismissed = new Map([["mission-a", 5]]);

    const staleResult = resolveOperatorSlot({
      prev: null,
      eligible: [missionA],
      list: [missionA],
      fetchSeq: 5,
      dismissed,
      pinnedAtSeq: new Map(),
    });
    expect(staleResult.liveAfterDismissal).toEqual([]);
    expect(staleResult.next).toBeNull();
    expect(staleResult.liveAfterDismissal.some(isAwaitingDelivery)).toBe(false);

    // A genuinely later fetch (seq 6) is authoritative and may report the
    // mission live again — suppression only protects against staleness.
    const freshResult = resolveOperatorSlot({
      prev: null,
      eligible: [missionA],
      list: [missionA],
      fetchSeq: 6,
      dismissed,
      pinnedAtSeq: new Map(),
    });
    expect(freshResult.liveAfterDismissal).toEqual([missionA]);
  });

  it("HIGH 1: a delivered mission cannot resurrect in the sticky slot either, even if it was previously pinned", () => {
    const missionA = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });
    const prevPinned = missionA; // slot was pinned on this mission while awaiting delivery
    const dismissed = new Map([["mission-a", 5]]);

    const result = resolveOperatorSlot({
      prev: prevPinned,
      eligible: [missionA],
      list: [missionA],
      fetchSeq: 5,
      dismissed,
      pinnedAtSeq: new Map(),
    });
    // Suppressed for this response: falls through to the "completed, not
    // delivered per this stale row" branch, but since it's not visible in
    // liveAfterDismissal it cannot come from `stillOpen` — result keeps prev
    // pinned only via the completed/non-delivered fallback, never reappears
    // in the queue derivation.
    expect(result.liveAfterDismissal).toEqual([]);
    expect(result.liveAfterDismissal.some(isAwaitingDelivery)).toBe(false);
  });

  it("HIGH 2: keeps the completed/awaiting-delivery slot unchanged when the matched row is a stale in_progress report", () => {
    const pinned = makeJob({
      id: "mission-a",
      status: "completed",
      missionStatus: "flown",
      completedAt: new Date("2024-01-02T00:00:00Z"),
    });
    // A poll started before "Mark Complete" resolves afterwards, still
    // reporting the pre-complete in_progress status for the same mission.
    const staleRow = makeJob({ id: "mission-a", status: "in_progress", missionStatus: "allocated" });
    // The pin was recorded when the fetch counter stood at seq 10 — this
    // response's fetch (also seq 10, i.e. in flight at pin time) started
    // at/before it, so it is not authoritative.
    const pinnedAtSeq = new Map([["mission-a", 10]]);

    const result = resolveOperatorSlot({
      prev: pinned,
      eligible: [staleRow],
      list: [staleRow],
      fetchSeq: 10,
      dismissed: new Map(),
      pinnedAtSeq,
    });

    // Upload + Deliver stay reachable: status/missionStatus must remain
    // "completed"/"flown", never overwritten by the stale row.
    expect(result.next).toEqual(pinned);
    expect(result.next?.status).toBe("completed");
    expect(result.next?.missionStatus).toBe("flown");
  });

  it("HIGH 2 (control): adopts the matched row when it genuinely is still awaiting delivery", () => {
    const pinned = makeJob({
      id: "mission-a",
      status: "completed",
      missionStatus: "flown",
      scheduledDate: "2024-02-01",
    });
    const freshRow = makeJob({
      id: "mission-a",
      status: "completed",
      missionStatus: "flown",
      customerName: "Updated Name",
    });

    const result = resolveOperatorSlot({
      prev: pinned,
      eligible: [freshRow],
      list: [freshRow],
      fetchSeq: 10,
      dismissed: new Map(),
      pinnedAtSeq: new Map(),
    });

    expect(result.next?.customerName).toBe("Updated Name");
    expect(result.next?.scheduledDate).toBe("2024-02-01"); // schedule fields stay session-sticky
    // Reconfirming the pin from server data refreshes the authority
    // watermark to this response's fetchSeq.
    expect(result.pinnedAtSeqRefresh).toBe("mission-a");
  });

  it("releases the slot once the pinned job's own record reports delivered", () => {
    // A delivered mission never appears in `eligible` (isAwaitingDelivery
    // excludes it upstream); this exercises the fallback that releases the
    // slot when `prev` itself already carries missionStatus "delivered".
    const deliveredPrev = makeJob({ id: "mission-a", status: "completed", missionStatus: "delivered" });

    const result = resolveOperatorSlot({
      prev: deliveredPrev,
      eligible: [],
      list: [],
      fetchSeq: 10,
      dismissed: new Map(),
      pinnedAtSeq: new Map(),
    });

    expect(result.next).toBeNull();
  });

  // --- Round 3 HIGH B: an optimistic flown pin must eventually be
  // releasable by an authoritative server response, without letting a
  // stale (pre-completion) response erase it. These three cases pin the
  // resolver's authority contract using the fetch sequence recorded at the
  // moment of the local completion ("pinned-at-seq"), the same mechanism
  // already used for the dismissal map.
  it("HIGH B: authoritative cancellation releases a locally-completed slot when the mission is later absent entirely", () => {
    // Mission locally completed (optimistically pinned) while the fetch
    // counter stood at seq 10 (i.e. the pin is "as of seq 10").
    const locallyCompleted = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });
    const pinnedAtSeq = new Map([["mission-a", 10]]);

    // A response from a fetch started AFTER the pin (seq 11) that no longer
    // lists the mission at all (cancelled/reassigned) must be authoritative
    // and release the slot — not keep replaying a Deliver that can only fail.
    const result = resolveOperatorSlot({
      prev: locallyCompleted,
      eligible: [],
      list: [],
      fetchSeq: 11,
      dismissed: new Map(),
      pinnedAtSeq,
    });

    expect(result.next).toBeNull();
    // The stale pin record must be cleared so the map cannot grow stale entries.
    expect(result.pinnedAtSeqClears).toEqual(["mission-a"]);
  });

  it("HIGH B: authoritative reversion adopts the server row instead of the stale local completion", () => {
    const locallyCompleted = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });
    const pinnedAtSeq = new Map([["mission-a", 10]]);
    // A response from AFTER the pin reports the mission genuinely reverted
    // (e.g. an admin/ops correction) to accepted — not awaiting delivery.
    const revertedRow = makeJob({ id: "mission-a", status: "accepted", missionStatus: "accepted" });

    const result = resolveOperatorSlot({
      prev: locallyCompleted,
      eligible: [revertedRow],
      list: [revertedRow],
      fetchSeq: 11,
      dismissed: new Map(),
      pinnedAtSeq,
    });

    // The real state must surface so Start/Mark Complete return — the slot
    // must not keep showing a Deliver button for a mission the server no
    // longer considers flown.
    expect(result.next).toEqual(revertedRow);
    expect(result.pinnedAtSeqClears).toEqual(["mission-a"]);
  });

  it("HIGH B (regression guard): a stale in_progress row from at/before the pin seq still cannot erase the local completion", () => {
    const locallyCompleted = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });
    const staleRow = makeJob({ id: "mission-a", status: "in_progress", missionStatus: "allocated" });
    // Pin recorded at seq 10; this response's fetch (seq 9) started before
    // the pin, so it may simply predate "flown" persisting server-side.
    const pinnedAtSeq = new Map([["mission-a", 10]]);

    // This response is from a fetch that started at/before the pin — it may
    // simply predate "flown" persisting server-side, so it must NOT be
    // treated as authoritative (this is the round-2 guard and must keep
    // holding once HIGH B's authority check is added).
    const result = resolveOperatorSlot({
      prev: locallyCompleted,
      eligible: [staleRow],
      list: [staleRow],
      fetchSeq: 9,
      dismissed: new Map(),
      pinnedAtSeq,
    });

    expect(result.next).toEqual(locallyCompleted);
    expect(result.pinnedAtSeqClears).toEqual([]);
  });

  // Pre-fix evidence (captured, not committed as a permanently-failing
  // test): with the round-3 caller pattern — `pinnedAtSeqRef.current.set(id,
  // fetchSeq)` unconditionally, matching step (b) below via a raw
  // `Map.set()` instead of `recordPinnedAtSeq` — this exact three-response
  // sequence fails with:
  //   AssertionError: expected { status: 'in_progress', missionStatus:
  //   'allocated', ... } to deeply equal { status: 'completed',
  //   missionStatus: 'flown', ... }
  // i.e. the reconfirm at fetchSeq 5 lowers the watermark from 10 to 5, so
  // the stale in_progress response at fetchSeq 7 (7 > 5) is wrongly treated
  // as authoritative and erases the local completion — the original HIGH B
  // defect resurrected through the reconfirmation path. `resolveOperatorSlot`
  // itself is unchanged; only the caller-side write must become monotonic.
  it("HIGH B round 3: the monotonic recorder holds the watermark at the higher seq, so a late-resolving stale reconfirm cannot reopen the erasure window", () => {
    const locallyCompleted = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });
    let pinnedAtSeq = createPinnedAtSeqMap();
    pinnedAtSeq = recordPinnedAtSeq(pinnedAtSeq, "mission-a", 10); // (a)

    const reconfirmRow = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });
    const resultB = resolveOperatorSlot({
      prev: locallyCompleted,
      eligible: [reconfirmRow],
      list: [reconfirmRow],
      fetchSeq: 5,
      dismissed: new Map(),
      pinnedAtSeq,
    }); // (b)
    expect(resultB.pinnedAtSeqRefresh).toBe("mission-a");
    // The fix: every pin write flows through the monotonic recorder, which
    // refuses to lower the watermark below the existing 10.
    pinnedAtSeq = recordPinnedAtSeq(pinnedAtSeq, resultB.pinnedAtSeqRefresh!, 5);
    expect(pinnedAtSeq.get("mission-a")).toBe(10);

    const staleRow = makeJob({ id: "mission-a", status: "in_progress", missionStatus: "allocated" });
    const resultC = resolveOperatorSlot({
      prev: resultB.next,
      eligible: [staleRow],
      list: [staleRow],
      fetchSeq: 7,
      dismissed: new Map(),
      pinnedAtSeq,
    }); // (c)

    // fetchSeq 7 <= watermark 10 — correctly still not authoritative.
    expect(resultC.next).toEqual(resultB.next);
  });

  it("LOW: setOperatorJobSlot-style displacement clears the outgoing mission's pin (via clearPinnedAtSeq)", () => {
    // Exercises the same primitive `useOperatorJobSlot`'s displaced-pin
    // clearing relies on, at the resolver/pin-map layer: once a different
    // mission is live, the old awaiting-delivery mission's pin record must
    // not be left behind to accumulate.
    const awaitingDelivery = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });
    let pinnedAtSeq = createPinnedAtSeqMap();
    pinnedAtSeq = recordPinnedAtSeq(pinnedAtSeq, "mission-a", 3);

    // An authoritative later fetch shows mission-a cancelled and a new
    // mission accepted — resolveOperatorSlot must report mission-a's pin
    // as one to clear.
    const newMission = makeJob({ id: "mission-b", status: "accepted", missionStatus: "accepted" });
    const result = resolveOperatorSlot({
      prev: awaitingDelivery,
      eligible: [newMission],
      list: [newMission],
      fetchSeq: 4,
      dismissed: new Map(),
      pinnedAtSeq,
    });

    expect(result.next).toEqual(newMission);
    expect(result.pinnedAtSeqClears).toEqual(["mission-a"]);
  });

  it("HIGH A: the resolved slot and the awaiting-delivery queue emerge from ONE transition call over the same inputs", () => {
    // A single response containing both a live (in_progress) mission and an
    // unrelated awaiting-delivery mission. One `resolveOperatorSlot`
    // invocation must produce a slot resolution AND a queue that both
    // reflect these inputs — not a queue read from a separate, possibly
    // still-default/empty value assigned by a caller-side side effect.
    //
    // This pure-function test pins the atomic (slot + queue, one call)
    // contract the caller must rely on. It deliberately does NOT cover
    // React's update-queue scheduling that produced the actual HIGH A defect
    // (a `let` assigned inside a `setState` updater and read immediately
    // after in caller code) — that is covered against the real hook by
    // `operator-job-slot-hook.test.ts`, which runs under happy-dom and fails
    // if the updater-side-effect pattern is reintroduced.
    const liveMission = makeJob({ id: "mission-b", status: "in_progress", missionStatus: "allocated" });
    const awaitingMission = makeJob({ id: "mission-a", status: "completed", missionStatus: "flown" });

    const result = resolveOperatorSlot({
      prev: null,
      eligible: [liveMission, awaitingMission],
      list: [liveMission, awaitingMission],
      fetchSeq: 1,
      dismissed: new Map(),
      pinnedAtSeq: new Map(),
    });

    expect(result.next).toEqual(liveMission);
    expect(result.liveAfterDismissal).toEqual([liveMission, awaitingMission]);
    expect(result.liveAfterDismissal.filter(isAwaitingDelivery)).toEqual([awaitingMission]);
  });
});
