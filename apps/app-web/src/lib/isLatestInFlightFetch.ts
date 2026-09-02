/**
 * Loading-clear gate for overlapping fetches.
 *
 * Compare this request's `fetchSeq` to the latest *started* sequence
 * (e.g. `mediaSeqRef.current`), not `FetchSequenceGate.lastAppliedSeq`.
 * `lastAppliedSeq` is the last *applied payload*; a stale `finally` must
 * not clear loading while a newer request is still in flight.
 */
export function isLatestInFlightFetch(
  fetchSeq: number,
  latestInFlightSeq: number,
): boolean {
  return fetchSeq === latestInFlightSeq;
}
