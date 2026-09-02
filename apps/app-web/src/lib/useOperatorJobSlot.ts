"use client";

import { useCallback, useRef, useState, type MutableRefObject } from "react";
import type { Job } from "../stravyx/types";
import { isAwaitingDelivery, resolveOperatorSlot } from "./operatorJobSelection";
import {
  clearPinnedAtSeq,
  createPinnedAtSeqMap,
  recordPinnedAtSeq,
  type PinnedAtSeqMap,
} from "./pinnedAtSeq";

export interface ApplyOperatorRefreshInput {
  /** Full mapped mission list for this poll (used to refresh a pinned job that isn't itself a live candidate). */
  list: Job[];
  /** The fetch sequence number of the response producing `list`. */
  fetchSeq: number;
}

export interface UseOperatorJobSlotResult {
  currentOperatorJob: Job | null;
  awaitingDeliveryJobs: Job[];
  /**
   * Mirrors `currentOperatorJob` so a caller that already closed over a
   * stale render (e.g. after an `await`) can read the latest slot value
   * synchronously. Every write goes through `setOperatorJobSlot`, so this
   * ref can never drift from the state it mirrors.
   */
  currentOperatorJobRef: MutableRefObject<Job | null>;
  /** Single write path for the slot — see the hook's doc comment for why this matters for HIGH A and HIGH B. */
  setOperatorJobSlot: (next: Job | null) => void;
  /** Applies one `refreshLists` response: resolves the slot and the awaiting-delivery queue together, from one `resolveOperatorSlot` call. */
  applyOperatorRefresh: (input: ApplyOperatorRefreshInput) => void;
  /** Records the fetch sequence in flight at the moment of an optimistic local completion (`handleCompleteJob`). */
  recordCompletionPin: (missionId: string, seq: number) => void;
  /**
   * Marks a mission dismissed (delivered or manually dismissed) as of `seq`.
   * Atomically updates all three pieces of state this hook owns for that
   * mission: records the dismissal watermark, releases its pin record, and
   * removes it from `awaitingDeliveryJobs` so the queue doesn't depend on a
   * subsequent `applyOperatorRefresh` succeeding.
   */
  markDismissed: (missionId: string, seq: number) => void;
  /** Clears all operator-slot state and bookkeeping (logout). */
  resetOperatorState: () => void;
}

/**
 * Owns the operator dashboard's sticky "Current Job" slot and "Awaiting
 * delivery" queue: the ref-mirrored slot value, the per-mission dismissal
 * and pin watermarks, and the resolve-once application of one
 * `refreshLists` response.
 *
 * PURE RELOCATION of the structure `senior-frontend-reviewer` closed off in
 * `App.tsx`:
 * - HIGH A: `applyOperatorRefresh` computes `resolveOperatorSlot` exactly
 *   once and applies BOTH the slot and the queue from that single result —
 *   no value is ever assigned inside a `setState` updater and read outside
 *   it. `currentOperatorJobRef` (kept in lockstep by `setOperatorJobSlot`)
 *   is what lets this function read the latest slot value synchronously.
 * - HIGH B: `recordCompletionPin` and the refresh-reconfirm write inside
 *   `applyOperatorRefresh` both go through `recordPinnedAtSeq`, the single
 *   monotonic recorder — the pin watermark can never regress no matter
 *   which response resolves last.
 * - LOW (displaced pin): `setOperatorJobSlot` clears the outgoing mission's
 *   pin record whenever the slot moves to a DIFFERENT mission id, so the
 *   map cannot accumulate entries for missions no longer occupying (or
 *   contending for) the slot. Guarded to a mission-id change so
 *   `handleCompleteJob`'s own record-pin-then-set-slot sequence for the
 *   SAME mission is never clobbered.
 *
 * `App.tsx` consumes this hook instead of owning the refs/state directly;
 * nothing about the reviewed mechanics changed in the move.
 */
export function useOperatorJobSlot(): UseOperatorJobSlotResult {
  const [currentOperatorJob, setCurrentOperatorJobState] = useState<Job | null>(null);
  const [awaitingDeliveryJobs, setAwaitingDeliveryJobs] = useState<Job[]>([]);

  // Tracks every completed mission the operator has dismissed this session, each
  // with the fetch sequence at its own dismiss time (mission id -> seq). Per-id
  // records so a later dismissal of a different mission never drops protection
  // for an earlier one still awaiting a delayed response. For a given id,
  // responses from fetches started at/before its recorded sequence may predate
  // that mission's "flown" status persisting, so they're suppressed for it.
  // Later fetches are trusted as authoritative: the demo API does not enforce
  // forward-only status transitions, so if a later response reports that mission
  // live again, that is a genuine server-side re-activation and must surface.
  const dismissedCompletedJobsRef = useRef<Map<string, number>>(new Map());
  // Mission id -> fetch sequence recorded at the moment the operator slot most
  // recently became pinned on that mission while it was awaiting delivery (set
  // by `recordCompletionPin`, refreshed by `applyOperatorRefresh` whenever
  // `resolveOperatorSlot` reconfirms the pin from a server row). Every write
  // flows through `recordPinnedAtSeq`/`clearPinnedAtSeq` — see `pinnedAtSeq.ts`
  // for why the watermark must never regress.
  const pinnedAtSeqRef = useRef<PinnedAtSeqMap>(createPinnedAtSeqMap());
  const currentOperatorJobRef = useRef<Job | null>(null);

  const setOperatorJobSlot = useCallback((next: Job | null) => {
    const prev = currentOperatorJobRef.current;
    if (prev && prev.id !== next?.id) {
      pinnedAtSeqRef.current = clearPinnedAtSeq(pinnedAtSeqRef.current, prev.id);
    }
    currentOperatorJobRef.current = next;
    setCurrentOperatorJobState(next);
  }, []);

  const applyOperatorRefresh = useCallback(
    ({ list, fetchSeq }: ApplyOperatorRefreshInput) => {
      const liveCandidates = list.filter(
        (j) => j.status === "accepted" || j.status === "in_progress" || isAwaitingDelivery(j),
      );
      // Computed ONCE, synchronously, from `currentOperatorJobRef` (never
      // from a `setState` functional-updater closure): a value smuggled out
      // of a `setState` updater is only safe to read once React has
      // actually applied that update — with a pending queue the updater
      // runs at render time instead, so a read immediately after
      // registering it can observe a stale/default value. Reading a plain
      // ref has no such queuing semantics.
      const resolved = resolveOperatorSlot({
        prev: currentOperatorJobRef.current,
        eligible: liveCandidates,
        list,
        fetchSeq,
        dismissed: dismissedCompletedJobsRef.current,
        pinnedAtSeq: pinnedAtSeqRef.current,
      });
      setOperatorJobSlot(resolved.next);
      for (const id of resolved.pinnedAtSeqClears) {
        pinnedAtSeqRef.current = clearPinnedAtSeq(pinnedAtSeqRef.current, id);
      }
      if (resolved.pinnedAtSeqRefresh) {
        pinnedAtSeqRef.current = recordPinnedAtSeq(pinnedAtSeqRef.current, resolved.pinnedAtSeqRefresh, fetchSeq);
      }
      setAwaitingDeliveryJobs(resolved.liveAfterDismissal.filter(isAwaitingDelivery));
    },
    [setOperatorJobSlot],
  );

  const recordCompletionPin = useCallback((missionId: string, seq: number) => {
    pinnedAtSeqRef.current = recordPinnedAtSeq(pinnedAtSeqRef.current, missionId, seq);
  }, []);

  const markDismissed = useCallback((missionId: string, seq: number) => {
    dismissedCompletedJobsRef.current.set(missionId, seq);
    pinnedAtSeqRef.current = clearPinnedAtSeq(pinnedAtSeqRef.current, missionId);
    // Remove the mission from the queue immediately rather than waiting on a
    // future `applyOperatorRefresh` — that refresh can throw, sign the user
    // out, or lose the freshness-gate race to a concurrently-started poll,
    // in which case it never runs and the delivered mission would otherwise
    // linger in "Awaiting delivery" showing a Deliver action that can only
    // fail. This is local-only removal: it does not touch the dismissal
    // watermark's re-activation contract, so a later, genuinely authoritative
    // `applyOperatorRefresh` can still re-add this mission via
    // `resolveOperatorSlot`'s `liveAfterDismissal` if the server reports it
    // flown again.
    setAwaitingDeliveryJobs((prev) => prev.filter((j) => j.id !== missionId));
  }, []);

  const resetOperatorState = useCallback(() => {
    setOperatorJobSlot(null);
    setAwaitingDeliveryJobs([]);
    dismissedCompletedJobsRef.current = new Map();
    pinnedAtSeqRef.current = createPinnedAtSeqMap();
  }, [setOperatorJobSlot]);

  return {
    currentOperatorJob,
    awaitingDeliveryJobs,
    currentOperatorJobRef,
    setOperatorJobSlot,
    applyOperatorRefresh,
    recordCompletionPin,
    markDismissed,
    resetOperatorState,
  };
}
