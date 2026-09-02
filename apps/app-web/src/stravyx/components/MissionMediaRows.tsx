"use client";

import {
  Download, Image as ImageIcon, Box, FileText, AlertCircle,
  Loader2, CheckCircle2, RotateCcw, Trash2,
} from "lucide-react";
import { ArtifactCategory, ARTIFACT_CATEGORIES } from "../types";

const CATEGORY_ICON: Record<ArtifactCategory, React.ElementType> = {
  visual_thermal: ImageIcon,
  mapping_3d: Box,
  telemetry_logs: FileText,
};

export interface DisplayRow {
  key: string;
  name: string;
  sizeLabel: string;
  category: ArtifactCategory;
  badge: { label: string; tone: "muted" | "success" | "error" | "progress" };
  downloadUrl?: string;
  onRetry?: () => void;
  /** Present only for rows the current user is allowed to delete (not yet released). */
  delete?: {
    armed: boolean;
    busy: boolean;
    onClick: () => void;
    onBlur: () => void;
  };
  deleteError?: string;
}

function BadgePill({ badge }: { badge: DisplayRow["badge"] }) {
  const toneStyle = {
    muted: { bg: "#f0f0f0", fg: "#737373" },
    success: { bg: "#e8f5f0", fg: "#2d6b53" },
    error: { bg: "#fff5f0", fg: "#a03a1a" },
    progress: { bg: "#fff8e8", fg: "#7a4d0a" },
  }[badge.tone];
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px]"
      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, backgroundColor: toneStyle.bg, color: toneStyle.fg }}
    >
      {badge.tone === "progress" && <Loader2 size={9} className="animate-spin" />}
      {badge.tone === "success" && <CheckCircle2 size={9} />}
      {badge.tone === "error" && <AlertCircle size={9} />}
      {badge.label}
    </span>
  );
}

export function GroupedRows({ rows }: { rows: DisplayRow[] }) {
  const grouped = (Object.keys(ARTIFACT_CATEGORIES) as ArtifactCategory[])
    .map((category) => ({ category, info: ARTIFACT_CATEGORIES[category], items: rows.filter((r) => r.category === category) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      {grouped.map(({ category, info, items }) => {
        const Icon = CATEGORY_ICON[category];
        return (
          <div key={category}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} className="text-[#5cb89c]" />
              <p
                className="text-[11px]"
                style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#737373", textTransform: "uppercase", letterSpacing: "0.05em" }}
              >
                {info.label}
              </p>
            </div>
            <div className="space-y-1.5">
              {items.map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3 px-3 py-2 rounded-[10px] bg-[#fafafa]">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] truncate" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                      {row.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
                        {row.sizeLabel}
                      </p>
                      <BadgePill badge={row.badge} />
                    </div>
                    {row.badge.tone === "error" && (
                      <p className="text-[11px] mt-0.5" role="alert" style={{ fontFamily: "DM Sans, sans-serif", color: "#a03a1a" }}>
                        {row.badge.label}
                      </p>
                    )}
                    {row.deleteError && (
                      <p className="text-[11px] mt-0.5" role="alert" style={{ fontFamily: "DM Sans, sans-serif", color: "#a03a1a" }}>
                        {row.deleteError}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {row.downloadUrl && (
                      <a
                        href={row.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        download={row.name}
                        aria-label={`Download ${row.name}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] hover:bg-[#d0ede5] transition-colors"
                        style={{ backgroundColor: "#e8f5f0" }}
                      >
                        <Download size={12} className="text-[#5cb89c]" />
                        <span className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d6b53" }}>
                          Download
                        </span>
                      </a>
                    )}
                    {row.onRetry && (
                      <button
                        type="button"
                        onClick={row.onRetry}
                        aria-label={`Retry uploading ${row.name}`}
                        className="p-1.5 rounded-[8px] hover:bg-[#fff0ec] transition-colors"
                      >
                        <RotateCcw size={13} className="text-[#d85a30]" />
                      </button>
                    )}
                    {row.delete && (
                      <button
                        type="button"
                        onClick={row.delete.onClick}
                        onBlur={row.delete.onBlur}
                        disabled={row.delete.busy}
                        aria-label={row.delete.armed ? `Confirm delete of ${row.name}` : `Delete ${row.name}`}
                        title={row.delete.armed ? "Click again to confirm delete" : undefined}
                        className={`flex items-center gap-1 px-1.5 py-1.5 rounded-[8px] transition-colors disabled:opacity-50 ${row.delete.armed ? "" : "hover:bg-[#fff0ec]"}`}
                        style={{ backgroundColor: row.delete.armed ? "#fdeae3" : undefined }}
                      >
                        {row.delete.busy ? (
                          <Loader2 size={13} className="animate-spin text-[#d85a30]" />
                        ) : (
                          <Trash2 size={13} className="text-[#d85a30]" />
                        )}
                        {row.delete.armed && !row.delete.busy && (
                          <span className="text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#a03a1a" }}>
                            Confirm?
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
