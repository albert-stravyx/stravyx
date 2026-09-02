"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Upload, AlertCircle, Loader2, RotateCcw,
} from "lucide-react";
import { ApiError, type MissionMediaListItem } from "@stravyx/api-client";
import { api } from "@/lib/api";
import { ARTIFACT_CATEGORIES } from "../types";
import { DisplayRow, GroupedRows } from "./MissionMediaRows";
import { DownloadPanel } from "./MissionArtifactsDownload";
import { categoryFor, errorMessage, formatBytes } from "@/lib/missionMediaFormat";
import {
  createFetchSequenceGate,
  isFetchResponseCurrent,
  advanceFetchSequenceGate,
} from "@/lib/fetchSequenceGate";

const ALL_EXTENSIONS = Object.values(ARTIFACT_CATEGORIES).flatMap((c) => c.extensions);
const ACCEPT_ATTR = ALL_EXTENSIONS.map((e) => `.${e}`).join(",");

/** Supabase Storage standard (non-resumable) upload cap for MVP. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;

/** How long an armed "confirm delete?" affordance stays armed before reverting. */
const DELETE_CONFIRM_MS = 4000;

/**
 * Maps a failed delete's stable `ApiError.code` to an operator-facing
 * message and recovery action. Anything without a recognised code (network
 * failure, unmapped server code, etc.) falls back to the raw error message —
 * still readable, just not friendly-worded.
 */
function describeDeleteError(e: unknown): { message: string; shouldRefresh: boolean } {
  if (e instanceof ApiError) {
    switch (e.code) {
      case "media_already_released":
        return {
          message: "This file has been delivered to the customer and can no longer be deleted.",
          shouldRefresh: true,
        };
      case "media_not_deletable":
        return {
          message: "This file was just delivered or removed — refreshing the list.",
          shouldRefresh: true,
        };
      case "forbidden_media_delete_uploader":
        return {
          message: "Only the operator who uploaded this file (or an admin) can delete it.",
          shouldRefresh: false,
        };
      default:
        // Unmapped code from a server version this client doesn't have a
        // friendly message for yet: prefer the structured `detail` over the
        // raw `API <status> <path>: <body>` envelope when present, since
        // `detail` is meant to be operator-readable.
        return { message: e.detail ?? errorMessage(e, "Delete failed — try again"), shouldRefresh: false };
    }
  }
  return { message: errorMessage(e, "Delete failed — try again"), shouldRefresh: false };
}

async function putFileToSignedUrl(signedUrl: string, file: File): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload to storage failed (HTTP ${res.status})`);
  }
}

// ─── Upload panel (operator) ──────────────────────────────────────────────────

type UploadStep = "upload" | "confirm";
type UploadState = "in_progress" | "error" | "done";

interface UploadItem {
  clientId: string;
  file: File;
  mediaId?: string;
  step: UploadStep;
  state: UploadState;
  error?: string;
}

interface UploadPanelProps {
  missionId: string;
  onMediaCountChange?: (confirmedCount: number) => void;
}

function UploadPanel({ missionId, onMediaCountChange }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rejectedNames, setRejectedNames] = useState<string[]>([]);
  const [tooLargeNames, setTooLargeNames] = useState<string[]>([]);
  const [existingMedia, setExistingMedia] = useState<MissionMediaListItem[]>([]);
  const [existingLoading, setExistingLoading] = useState(true);
  const [existingError, setExistingError] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  // Per-panel request sequence for `loadExisting`: a list request started
  // before a successful delete can otherwise resolve after it and re-add
  // the deleted row (and its confirmed count). `mediaSeqRef` mints a new
  // seq per call; `mediaGateRef` remembers the highest seq already applied
  // so an older response — or one explicitly invalidated by a delete — is
  // dropped regardless of resolution order.
  const mediaSeqRef = useRef(0);
  const mediaGateRef = useRef(createFetchSequenceGate());

  const updateUpload = useCallback((clientId: string, patch: Partial<UploadItem>) => {
    setUploads((prev) => prev.map((u) => (u.clientId === clientId ? { ...u, ...patch } : u)));
  }, []);

  const runConfirm = useCallback(
    async (clientId: string, mediaId: string, file: File) => {
      updateUpload(clientId, { step: "confirm", state: "in_progress", error: undefined });
      try {
        await api.confirmUpload(missionId, mediaId, {
          byteSize: file.size,
          contentType: file.type || undefined,
          originalName: file.name,
        });
        updateUpload(clientId, { state: "done" });
      } catch (e) {
        updateUpload(clientId, { state: "error", error: errorMessage(e, "Could not confirm the upload") });
      }
    },
    [missionId, updateUpload],
  );

  const runUpload = useCallback(
    async (item: UploadItem) => {
      // Clear any stale mediaId from a previous failed attempt — a fresh
      // upload always mints a new signed URL and a new media record.
      updateUpload(item.clientId, { step: "upload", state: "in_progress", error: undefined, mediaId: undefined });
      try {
        const { mediaId, upload } = await api.getUploadUrl(missionId, {
          filename: item.file.name,
          contentType: item.file.type || undefined,
        });
        updateUpload(item.clientId, { mediaId });
        await putFileToSignedUrl(upload.signedUrl, item.file);
        await runConfirm(item.clientId, mediaId, item.file);
      } catch (e) {
        updateUpload(item.clientId, { state: "error", error: errorMessage(e, "Upload failed") });
      }
    },
    [missionId, runConfirm, updateUpload],
  );

  const loadExisting = useCallback(async () => {
    const fetchSeq = ++mediaSeqRef.current;
    setExistingLoading(true);
    try {
      const { media } = await api.listMissionMedia(missionId);
      if (!isFetchResponseCurrent(mediaGateRef.current, fetchSeq)) return;
      mediaGateRef.current = advanceFetchSequenceGate(mediaGateRef.current, fetchSeq);
      setExistingMedia(media);
      setExistingError(null);
    } catch (e) {
      if (!isFetchResponseCurrent(mediaGateRef.current, fetchSeq)) return;
      mediaGateRef.current = advanceFetchSequenceGate(mediaGateRef.current, fetchSeq);
      setExistingError(errorMessage(e, "Failed to load previously uploaded files"));
    } finally {
      setExistingLoading(false);
    }
  }, [missionId]);

  useEffect(() => {
    void loadExisting();
  }, [loadExisting]);

  // Reconcile session uploads against the server's existing-media list on
  // every `loadExisting()` refresh (initial load, "Retry loading files",
  // post-delete, or any future caller) — not just the one triggered by
  // delete. Once a session upload's media id shows up in `existingMedia`,
  // the server copy is authoritative and the local upload entry is dropped
  // so the file isn't rendered (and double-counted in `confirmedCount`)
  // twice.
  useEffect(() => {
    const existingIds = new Set(existingMedia.map((m) => m.id));
    setUploads((prev) => {
      const next = prev.filter((u) => !(u.state === "done" && u.mediaId && existingIds.has(u.mediaId)));
      return next.length === prev.length ? prev : next;
    });
  }, [existingMedia]);

  const confirmedCount =
    existingMedia.filter((item) => item.confirmedAt).length +
    uploads.filter((u) => u.state === "done").length;
  useEffect(() => {
    onMediaCountChange?.(confirmedCount);
  }, [confirmedCount, onMediaCountChange]);

  // Two-step delete confirm state, keyed by row key (media id or upload
  // clientId). Kept separate from `existingMedia`/`uploads` since it's
  // ephemeral UI state, not server data.
  const [armedDeleteKey, setArmedDeleteKey] = useState<string | null>(null);
  const [deletingKeys, setDeletingKeys] = useState<Set<string>>(new Set());
  const [deleteErrors, setDeleteErrors] = useState<Record<string, string>>({});
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const disarmDelete = useCallback(() => {
    if (armTimerRef.current) {
      clearTimeout(armTimerRef.current);
      armTimerRef.current = null;
    }
    setArmedDeleteKey(null);
  }, []);

  useEffect(() => () => {
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
  }, []);

  const armDelete = useCallback((key: string) => {
    if (armTimerRef.current) clearTimeout(armTimerRef.current);
    setArmedDeleteKey(key);
    armTimerRef.current = setTimeout(() => {
      setArmedDeleteKey((current) => (current === key ? null : current));
    }, DELETE_CONFIRM_MS);
  }, []);

  const runDelete = useCallback(
    async (key: string, mediaId: string, source: "existing" | "upload") => {
      disarmDelete();
      setDeletingKeys((prev) => new Set(prev).add(key));
      setDeleteErrors((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      try {
        const result = await api.deleteMissionMedia(missionId, mediaId);
        // HTTP 200 is always a successful delete under the current contract,
        // even when `cleanup` is present — the row is gone either way (or
        // was already gone: the route is idempotent and reports
        // `media_already_absent` rather than 404 for a re-delete/race).
        // Neither case is an operator-facing error; log for diagnostics only.
        if (result.cleanup) {
          console.warn(
            `Media ${mediaId} delete result for mission ${missionId}: ${result.cleanup.code} — ${result.cleanup.detail}`,
          );
        }
        // Invalidate any list request already in flight (started before this
        // delete resolved) so it can never re-add this row if it resolves
        // after the reload below — HIGH 4 protection lives in `loadExisting`
        // itself, but this closes the window between "delete succeeded" and
        // "the next loadExisting call starts".
        mediaGateRef.current = advanceFetchSequenceGate(mediaGateRef.current, mediaSeqRef.current);
        if (source === "existing") {
          setExistingMedia((prev) => prev.filter((m) => m.id !== mediaId));
        } else {
          setUploads((prev) => prev.filter((u) => u.mediaId !== mediaId));
        }
        void loadExisting();
      } catch (e) {
        const { message, shouldRefresh } = describeDeleteError(e);
        setDeleteErrors((prev) => ({ ...prev, [key]: message }));
        // media_already_released / media_not_deletable: a retry can never
        // succeed, so refresh the list so the row's delete control disappears
        // (or the row itself clears) instead of leaving a dead-end control.
        if (shouldRefresh) {
          void loadExisting();
        }
      } finally {
        setDeletingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [missionId, loadExisting, disarmDelete],
  );

  function handleDeleteClick(key: string, mediaId: string, source: "existing" | "upload") {
    if (armedDeleteKey === key) {
      void runDelete(key, mediaId, source);
    } else {
      armDelete(key);
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    const accepted: File[] = [];
    const bad: string[] = [];
    const large: string[] = [];
    files.forEach((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALL_EXTENSIONS.includes(ext)) {
        bad.push(f.name);
        return;
      }
      if (f.size > MAX_FILE_BYTES) {
        large.push(f.name);
        return;
      }
      accepted.push(f);
    });
    setRejectedNames(bad);
    setTooLargeNames(large);
    if (accepted.length === 0) return;
    const items: UploadItem[] = accepted.map((file) => ({
      clientId: `up-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file,
      step: "upload",
      state: "in_progress",
    }));
    setUploads((prev) => [...prev, ...items]);
    items.forEach((item) => void runUpload(item));
  }

  function retry(item: UploadItem) {
    // `step` (not the mere presence of mediaId) tells us which half failed:
    // mediaId is set right after getUploadUrl succeeds, before the PUT even
    // starts, so a failed PUT still leaves mediaId populated. Only advancing
    // to the "confirm" step means the PUT itself has already succeeded.
    if (item.step === "confirm" && item.mediaId) {
      void runConfirm(item.clientId, item.mediaId, item.file);
      return;
    }
    // The PUT failed (or never started) — signed upload URLs are single-use
    // and time-limited, so redo the whole sequence with a fresh one rather
    // than reusing a URL that may already be consumed or expired.
    void runUpload(item);
  }

  const existingRows: DisplayRow[] = existingMedia.map((m) => {
    const key = m.id;
    const deletable = m.visibility === "held";
    return {
      key,
      name: m.originalName ?? "Untitled file",
      sizeLabel: formatBytes(m.byteSize),
      category: categoryFor(m.originalName),
      badge: m.visibility === "released"
        ? { label: "Delivered", tone: "success" }
        : { label: "Uploaded", tone: "muted" },
      downloadUrl: m.downloadUrl,
      delete: deletable
        ? {
            armed: armedDeleteKey === key,
            busy: deletingKeys.has(key),
            onClick: () => handleDeleteClick(key, m.id, "existing"),
            onBlur: disarmDelete,
          }
        : undefined,
      deleteError: deleteErrors[key],
    };
  });

  const uploadRows: DisplayRow[] = uploads.map((u) => {
    const key = u.clientId;
    const deletableMediaId = u.state === "done" ? u.mediaId : undefined;
    return {
      key,
      name: u.file.name,
      sizeLabel: formatBytes(u.file.size),
      category: categoryFor(u.file.name),
      badge:
        u.state === "done"
          ? { label: "Uploaded", tone: "success" }
          : u.state === "error"
            ? { label: u.error ?? "Upload failed", tone: "error" }
            : { label: u.step === "confirm" ? "Confirming…" : "Uploading…", tone: "progress" },
      onRetry: u.state === "error" ? () => retry(u) : undefined,
      delete: deletableMediaId
        ? {
            armed: armedDeleteKey === key,
            busy: deletingKeys.has(key),
            onClick: () => handleDeleteClick(key, deletableMediaId, "upload"),
            onBlur: disarmDelete,
          }
        : undefined,
      deleteError: deleteErrors[key],
    };
  });

  const rows = [...existingRows, ...uploadRows];
  const hasAny = rows.length > 0;

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
          Mission Artifacts
        </h3>
        <span
          className="text-[12px] px-2 py-0.5 rounded-full"
          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, backgroundColor: "#f5f5f5", color: "#737373" }}
        >
          {rows.length} file{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload mission files"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className="border-2 border-dashed rounded-[12px] px-4 py-6 text-center cursor-pointer transition-colors mb-4"
        style={{ borderColor: dragOver ? "#5cb89c" : "#e0e0e0", backgroundColor: dragOver ? "#f0faf7" : "#fafafa" }}
      >
        <Upload size={22} className="mx-auto mb-2" style={{ color: dragOver ? "#5cb89c" : "#b0b0b0" }} />
        <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
          Drop files or click to upload
        </p>
        <p className="text-[11px] mt-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
          JPG, RAW, MP4, GeoTIFF, LAS, OBJ, KMZ, CSV and more · up to 50 MB per file
        </p>
      </div>

      {rejectedNames.length > 0 && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-[10px]" role="alert" style={{ backgroundColor: "#fff5f0" }}>
          <AlertCircle size={14} className="text-[#d85a30] mt-0.5 flex-shrink-0" />
          <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#a03a1a" }}>
            Unsupported file type: {rejectedNames.join(", ")}
          </p>
        </div>
      )}
      {tooLargeNames.length > 0 && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-[10px]" role="alert" style={{ backgroundColor: "#fff5f0" }}>
          <AlertCircle size={14} className="text-[#d85a30] mt-0.5 flex-shrink-0" />
          <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#a03a1a" }}>
            Too large (50 MB limit): {tooLargeNames.join(", ")}
          </p>
        </div>
      )}
      {existingError && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-[10px]" role="alert" style={{ backgroundColor: "#fff5f0" }}>
          <AlertCircle size={14} className="text-[#d85a30] mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#a03a1a" }}>
              {existingError} Files you already uploaded may not be counted until this loads — delivery could be
              blocked incorrectly.
            </p>
            <button
              type="button"
              onClick={() => void loadExisting()}
              disabled={existingLoading}
              className="mt-1.5 inline-flex items-center gap-1.5 text-[12px] disabled:opacity-50"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#a03a1a" }}
            >
              <RotateCcw size={12} className={existingLoading ? "animate-spin" : undefined} />
              Retry loading files
            </button>
          </div>
        </div>
      )}

      {existingLoading && uploadRows.length === 0 && (
        <p className="text-[13px] text-center py-4 flex items-center justify-center gap-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
          <Loader2 size={14} className="animate-spin" /> Loading previously uploaded files…
        </p>
      )}

      {!hasAny && !existingLoading && (
        <p className="text-[13px] text-center py-4" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
          No files uploaded yet.
        </p>
      )}

      {hasAny && <GroupedRows rows={rows} />}
    </div>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface MissionArtifactsProps {
  missionId: string;
  mode: "upload" | "download";
  /** Upload mode only — notifies the parent of the total confirmed/held+released file count, used to gate a "Deliver" action. */
  onMediaCountChange?: (confirmedCount: number) => void;
  /**
   * Download mode only. When this becomes true (mission delivered), the
   * download panel reloads so newly released files appear. Ignored in upload
   * mode. Optional so existing download call sites keep compiling.
   */
  released?: boolean;
}

export function MissionArtifacts({ missionId, mode, onMediaCountChange, released }: MissionArtifactsProps) {
  if (mode === "upload") {
    return <UploadPanel missionId={missionId} onMediaCountChange={onMediaCountChange} />;
  }
  return <DownloadPanel missionId={missionId} released={released} />;
}
