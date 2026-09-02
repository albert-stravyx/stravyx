/**
 * A tiny, React-free primitive enforcing that the operator slot's per-mission
 * "pinned-at" fetch-sequence watermark can never decrease, no matter which
 * caller writes to it or what order responses resolve in.
 *
 * Mirrors `FetchSequenceGate`'s philosophy (see `fetchSequenceGate.ts`):
 * correctness lives in a single recorder function, not in every call site
 * remembering to compare-and-swap. `resolveOperatorSlot` (in
 * `operatorJobSelection.ts`) can legitimately ask to reconfirm a mission's
 * pin from an OLDER, later-resolving response — a genuinely slower fetch
 * that still landed after "flown" persisted server-side. Naively writing
 * that response's `fetchSeq` would lower the watermark below a fresher pin,
 * reopening the exact window an in-between stale `in_progress` response
 * needs to look "authoritative" and erase a real local completion. Routing
 * every write through `recordPinnedAtSeq` closes that window unconditionally
 * — no caller, present or future, can regress a mission's watermark.
 */
export type PinnedAtSeqMap = ReadonlyMap<string, number>;

export function createPinnedAtSeqMap(): PinnedAtSeqMap {
  return new Map();
}

/**
 * Records (or reconfirms) a mission's pin watermark as
 * `max(existing, seq)`. This is the ONLY way any caller can affect the map,
 * so the watermark can never regress regardless of which response resolves
 * last or what sequence it tries to write.
 */
export function recordPinnedAtSeq(
  map: PinnedAtSeqMap,
  missionId: string,
  seq: number,
): PinnedAtSeqMap {
  const existing = map.get(missionId);
  if (existing !== undefined && existing >= seq) return map;
  const next = new Map(map);
  next.set(missionId, seq);
  return next;
}

/** Removes a mission's pin record (delivered, dismissed, or displaced from the slot). */
export function clearPinnedAtSeq(map: PinnedAtSeqMap, missionId: string): PinnedAtSeqMap {
  if (!map.has(missionId)) return map;
  const next = new Map(map);
  next.delete(missionId);
  return next;
}
