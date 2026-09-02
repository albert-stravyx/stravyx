import type { Job } from "../stravyx/types";

/**
 * True once a mission has been flown but not yet delivered to the customer.
 * `Job.status` collapses "flown" and "delivered" into the coarse
 * "completed" UI bucket, so `missionStatus` (the raw ERD status) is what
 * distinguishes the two here.
 */
export function isAwaitingDelivery(job: Job): boolean {
  return job.status === "completed" && job.missionStatus !== "delivered";
}

/**
 * Chooses which job should occupy the operator's sticky "Current Job" slot
 * on a FRESH pick — i.e. when nothing is already pinned there. Session
 * stickiness (keeping an already-pinned awaiting-delivery job in place) is
 * handled separately by `resolveOperatorSlot` below, called once per
 * accepted response by `applyOperatorRefresh` in `useOperatorJobSlot.ts` —
 * synchronously, never from inside a `setState` updater. `handleCompleteJob`
 * in App.tsx also pins an awaiting-delivery job directly (as an optimistic
 * update, before any refresh runs) — `resolveOperatorSlot` is what keeps that
 * pin intact once `refreshLists` next resolves.
 *
 * Awaiting-delivery jobs are deliberately excluded from this priority list.
 * Demo data accumulates flown-but-never-delivered missions over time; if any
 * of those could win a fresh pick, the oldest one would permanently occupy
 * the slot and a newly accepted mission would become unreachable there (a
 * flown card renders no Start/Mark Complete button). Awaiting-delivery
 * missions instead surface in the operator's "Awaiting delivery" queue
 * (see OperatorDashboardTab), where "View details" reaches them directly —
 * upload and Deliver stay reachable from there regardless of whether the
 * mission also happens to hold the sticky slot.
 */
export function pickLiveOperatorJob(jobs: Job[]): Job | null {
  return (
    jobs.find((j) => j.status === "in_progress") ??
    jobs.find((j) => j.status === "accepted") ??
    null
  );
}

export interface OperatorSlotInputs {
  /** Currently pinned "Current Job" slot value, or null if nothing is pinned. */
  prev: Job | null;
  /** Live candidates for this poll (accepted / in_progress / awaiting-delivery), before dismissal suppression. */
  eligible: Job[];
  /** Full mapped mission list for this poll — used only to refresh a pinned job that isn't itself a live candidate. */
  list: Job[];
  /** The fetch sequence number of the response producing `eligible`/`list`. */
  fetchSeq: number;
  /**
   * Mission id -> fetch sequence at the moment it was dismissed (delivered or
   * manually dismissed). A candidate is suppressed only when its id has a
   * record and this response's fetchSeq is at/before that record — such a
   * response may predate the dismissal persisting server-side. A response
   * from a later fetch is authoritative and may legitimately report the
   * mission live again.
   */
  dismissed: ReadonlyMap<string, number>;
  /**
   * Mission id -> fetch sequence recorded at the moment the slot most
   * recently became pinned on that mission while it was awaiting delivery
   * (either an optimistic local completion in `handleCompleteJob`, or this
   * resolver reconfirming an already-pinned mission from a server row).
   *
   * This is the authority watermark for an awaiting-delivery `prev`: a
   * response whose `fetchSeq` is at/before the recorded seq may predate the
   * pinned status persisting server-side and must NOT override `prev`
   * (protects the local completion from a stale `in_progress` echo). A
   * response whose `fetchSeq` is strictly greater started after the pin was
   * recorded and is therefore authoritative for that mission — if it now
   * shows the mission reverted (no longer awaiting delivery) or gone
   * entirely, that is the real state and must replace/release `prev`. This
   * mirrors `dismissed` exactly, one sequence watermark per mission id, and
   * exists because determinism under updater replay is a different property
   * from the pinned value ever becoming stale-proof against real server
   * change — a `prev` alone cannot tell "no fresher evidence yet" apart from
   * "server evidence says this is over".
   *
   * CALLER CONTRACT: this resolver may return a `pinnedAtSeqRefresh` for a
   * response older than the mission's current watermark (an older fetch can
   * still legitimately reconfirm the same awaiting-delivery row). The caller
   * MUST write every `pinnedAtSeqRefresh` through a monotonic recorder that
   * takes `max(existing, fetchSeq)` — see `recordPinnedAtSeq` in
   * `pinnedAtSeq.ts` — never a raw `map.set(id, fetchSeq)`. This resolver
   * does not, and cannot, enforce that itself: it only decides WHICH seq to
   * offer for a given response, not what the map ends up holding once
   * several responses' offers are applied in resolution order.
   */
  pinnedAtSeq: ReadonlyMap<string, number>;
}

export interface OperatorSlotResult {
  /** The value the sticky "Current Job" slot should hold after this response. */
  next: Job | null;
  /**
   * `eligible` after the same per-mission dismissal suppression applied to
   * the slot decision. Callers must derive the "Awaiting delivery" queue
   * from this (not from an unfiltered mission list) so a mission dismissed
   * at/after this response's fetch seq can never resurface there either.
   */
  liveAfterDismissal: Job[];
  /**
   * Mission ids whose `pinnedAtSeq` record the caller should delete — the
   * pin was just released (authoritative reversion/cancellation) or the
   * mission left the awaiting-delivery state, so keeping the record would
   * only let the map grow stale entries.
   */
  pinnedAtSeqClears: string[];
  /**
   * A mission id the caller should offer to the monotonic recorder (see
   * `recordPinnedAtSeq`) at this response's `fetchSeq` — set when the slot
   * adopts/reconfirms an awaiting-delivery row from server data. This
   * `fetchSeq` is NOT guaranteed to be newer than the mission's current
   * watermark (an older, later-resolving fetch can still reconfirm the same
   * row); the recorder — not this resolver — is what keeps the watermark
   * from ever regressing.
   */
  pinnedAtSeqRefresh: string | null;
}

const NO_PIN_CHANGE = { pinnedAtSeqClears: [] as string[], pinnedAtSeqRefresh: null };

/**
 * Resolves the operator's sticky "Current Job" slot for one `refreshLists`
 * response, applying the same dismissal suppression the "Awaiting delivery"
 * queue derivation must also use, plus the pinned-at-seq authority check for
 * an awaiting-delivery `prev`. Pure and React-free so the out-of-order guard
 * (a stale, earlier-started response), the awaiting-delivery spread guard (a
 * stale row that still reports `in_progress`), and the pin-release authority
 * rules are all directly testable without mounting `App`.
 *
 * Callers MUST compute this once per response and use both `next` and
 * `liveAfterDismissal` from that single result — never derive one from a
 * separately-read value, since only this function has all three inputs
 * (dismissal suppression, live candidates, and pin authority) in scope at
 * once.
 */
export function resolveOperatorSlot({
  prev,
  eligible,
  list,
  fetchSeq,
  dismissed,
  pinnedAtSeq,
}: OperatorSlotInputs): OperatorSlotResult {
  const liveAfterDismissal = eligible.filter((j) => {
    const dismissedSeq = dismissed.get(j.id);
    return dismissedSeq === undefined || fetchSeq > dismissedSeq;
  });
  const live = pickLiveOperatorJob(liveAfterDismissal);

  if (prev && isAwaitingDelivery(prev)) {
    const stillOpen = liveAfterDismissal.find((j) => j.id === prev.id);

    if (stillOpen && isAwaitingDelivery(stillOpen)) {
      // Server reconfirms the same awaiting-delivery mission. Refresh the
      // pin so the authority watermark tracks this latest confirmed
      // evidence rather than the (possibly much older) original pin.
      return {
        next: {
          ...prev,
          ...stillOpen,
          scheduledDate: prev.scheduledDate,
          scheduledTime: prev.scheduledTime,
        },
        liveAfterDismissal,
        pinnedAtSeqClears: [],
        pinnedAtSeqRefresh: prev.id,
      };
    }

    // `prev` is no longer reported as awaiting delivery by this response
    // (reverted, cancelled, or reassigned). Whether that's trustworthy
    // depends on when this fetch started relative to the pin: a fetch that
    // started at/before the pin may simply predate the "flown" status
    // persisting server-side and must not erase a fresh local completion.
    // Only a fetch that started AFTER the pin is authoritative for this
    // mission.
    const pinnedSeq = pinnedAtSeq.get(prev.id);
    const isAuthoritative = pinnedSeq === undefined || fetchSeq > pinnedSeq;

    if (!isAuthoritative) {
      return { next: prev, liveAfterDismissal, ...NO_PIN_CHANGE };
    }

    if (stillOpen) {
      // Present but genuinely reverted (e.g. back to accepted/allocated) —
      // adopt the real server row so Start/Mark Complete return, and
      // release the pin since this mission is no longer awaiting delivery.
      return { next: stillOpen, liveAfterDismissal, pinnedAtSeqClears: [prev.id], pinnedAtSeqRefresh: null };
    }

    // Absent entirely (cancelled/reassigned) — release the pin to whatever
    // else is live, or nothing, rather than showing a Deliver that can
    // only fail.
    return { next: live ?? null, liveAfterDismissal, pinnedAtSeqClears: [prev.id], pinnedAtSeqRefresh: null };
  }

  if (prev?.status === "completed") {
    // Reachable only when `prev.missionStatus === "delivered"` (otherwise
    // `isAwaitingDelivery(prev)` above would be true) — delivered jobs
    // never keep the slot so a fresh accepted/in_progress mission (or
    // nothing) can take over.
    return { next: live ?? null, liveAfterDismissal, ...NO_PIN_CHANGE };
  }

  if (live) return { next: live, liveAfterDismissal, ...NO_PIN_CHANGE };

  if (prev) {
    const updated = list.find((j) => j.id === prev.id);
    if (updated) {
      return {
        next: {
          ...prev,
          ...updated,
          scheduledDate: prev.scheduledDate,
          scheduledTime: prev.scheduledTime,
        },
        liveAfterDismissal,
        ...NO_PIN_CHANGE,
      };
    }
  }

  return { next: null, liveAfterDismissal, ...NO_PIN_CHANGE };
}
