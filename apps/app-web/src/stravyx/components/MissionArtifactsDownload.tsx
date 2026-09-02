"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Lock, RefreshCw } from "lucide-react";
import type { MissionMediaListItem } from "@stravyx/api-client";
import { api } from "../../lib/api";
import { categoryFor, errorMessage, formatBytes } from "../../lib/missionMediaFormat";
import {
  createFetchSequenceGate,
  isFetchResponseCurrent,
  advanceFetchSequenceGate,
} from "../../lib/fetchSequenceGate";
import { isLatestInFlightFetch } from "../../lib/isLatestInFlightFetch";
import { DisplayRow, GroupedRows } from "./MissionMediaRows";

// ─── Download panel (customer + operator post-delivery) ──────────────────────

interface DownloadPanelProps {
  missionId: string;
  /**
   * Download mode only. When this becomes true (mission delivered), reload
   * the list so newly released files appear. Optional: omitted at call sites
   * that already mount after delivery. Upload mode never receives this.
   */
  released?: boolean;
}

export function DownloadPanel({ missionId, released }: DownloadPanelProps) {
  const [media, setMedia] = useState<MissionMediaListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mediaSeqRef = useRef(0);
  const mediaGateRef = useRef(createFetchSequenceGate());

  const load = useCallback(async () => {
    const fetchSeq = ++mediaSeqRef.current;
    setLoading(true);
    setError(null);
    try {
      const { media: items } = await api.listMissionMedia(missionId);
      if (!isFetchResponseCurrent(mediaGateRef.current, fetchSeq)) return;
      mediaGateRef.current = advanceFetchSequenceGate(mediaGateRef.current, fetchSeq);
      setMedia(items);
    } catch (e) {
      if (!isFetchResponseCurrent(mediaGateRef.current, fetchSeq)) return;
      mediaGateRef.current = advanceFetchSequenceGate(mediaGateRef.current, fetchSeq);
      setError(errorMessage(e, "Failed to load your files"));
    } finally {
      if (isLatestInFlightFetch(fetchSeq, mediaSeqRef.current)) {
        setLoading(false);
      }
    }
  }, [missionId]);

  useEffect(() => {
    void load();
  }, [load, released]);

  const rows: DisplayRow[] = (media ?? []).map((m) => ({
    key: m.id,
    name: m.originalName ?? "Untitled file",
    sizeLabel: formatBytes(m.byteSize),
    category: categoryFor(m.originalName),
    badge: { label: "Delivered", tone: "success" },
    downloadUrl: m.downloadUrl,
  }));

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
          Mission Artifacts
        </h3>
        <div className="flex items-center gap-2">
          <span
            className="text-[12px] px-2 py-0.5 rounded-full"
            style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, backgroundColor: "#f5f5f5", color: "#737373" }}
          >
            {rows.length} file{rows.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={() => void load()}
            aria-label="Refresh download links"
            disabled={loading}
            className="p-1 rounded-full hover:bg-[#f5f5f5] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-[#b0b0b0]" : "text-[#737373]"} />
          </button>
        </div>
      </div>

      <p className="text-[11px] mb-3 flex items-center gap-1.5" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
        <Lock size={11} />
        Download links expire a few minutes after loading — refresh if a link stops working.
      </p>

      {error && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-[10px]" role="alert" style={{ backgroundColor: "#fff5f0" }}>
          <AlertCircle size={14} className="text-[#d85a30] mt-0.5 flex-shrink-0" />
          <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#a03a1a" }}>
            {error}
          </p>
        </div>
      )}

      {loading && media === null && (
        <p className="text-[13px] text-center py-4 flex items-center justify-center gap-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
          <Loader2 size={14} className="animate-spin" /> Loading files…
        </p>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-[13px] text-center py-4" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
          No files delivered yet.
        </p>
      )}

      {rows.length > 0 && <GroupedRows rows={rows} />}
    </div>
  );
}
