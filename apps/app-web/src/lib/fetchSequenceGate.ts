/**
 * A tiny, React-free primitive for rejecting out-of-order async responses.
 *
 * Each request captures a monotonically increasing `fetchSeq` at the moment
 * it starts (before awaiting anything). The gate remembers the highest
 * `fetchSeq` whose response has actually been applied to state. A response
 * is only current — and safe to apply — if its `fetchSeq` is greater than
 * that watermark; once a later-started fetch's response has been applied,
 * every response from an earlier-started fetch is permanently stale,
 * regardless of resolution order.
 *
 * `advanceFetchSequenceGate` also doubles as an explicit invalidation: a
 * caller can advance the gate to the current sequence counter (without a
 * response in hand) to mark every already-in-flight request as stale ahead
 * of starting a fresh one — e.g. right after a mutation succeeds, before
 * reloading a list, so an older list request that resolves late can never
 * re-apply data the mutation just invalidated.
 *
 * Reused by both `App.tsx`'s `refreshLists` poll and `MissionArtifacts.tsx`'s
 * per-panel `loadExisting`.
 */
export interface FetchSequenceGate {
  readonly lastAppliedSeq: number;
}

export function createFetchSequenceGate(): FetchSequenceGate {
  return { lastAppliedSeq: 0 };
}

export function isFetchResponseCurrent(gate: FetchSequenceGate, fetchSeq: number): boolean {
  return fetchSeq > gate.lastAppliedSeq;
}

export function advanceFetchSequenceGate(gate: FetchSequenceGate, seq: number): FetchSequenceGate {
  return seq > gate.lastAppliedSeq ? { lastAppliedSeq: seq } : gate;
}
