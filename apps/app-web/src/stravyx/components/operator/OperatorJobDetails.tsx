"use client";

import type { ElementType, ReactNode } from "react";
import { useState } from "react";
import { Job, URGENCY_TIERS } from "../../types";
import { Logo } from "../Logo";
import { UrgencyBadge } from "../UrgencyBadge";
import { MissionArtifacts } from "../MissionArtifacts";
import { isDownloadMediaReleased } from "../../../lib/downloadPanelReleased";
import { COLORS, FONT_BODY, FONT_DISPLAY } from "../../theme";
import { MapPin, Clock, DollarSign, Phone, AlertCircle, ExternalLink, FileText, Zap, X, CheckCircle2, Send, Loader2 } from "lucide-react";

interface OperatorJobDetailsProps {
  job: Job;
  onStartJob?: () => void;
  onCompleteJob?: () => void;
  onDeliverMission?: (missionId: string) => Promise<void> | void;
  /** Fires after a successful deliver so the parent can close this screen. */
  onDelivered?: () => void;
  onClose: () => void;
}

function InfoRow({ icon: Icon, label, value }: { icon: ElementType; label: string; value: ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-[#f4f4f4] last:border-b-0">
      <div className="w-8 h-8 rounded-full bg-[#f5f5f5] flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={14} style={{ color: COLORS.ink.muted }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] mb-0.5" style={{ fontFamily: FONT_BODY, color: COLORS.ink.faint, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
        <div className="text-[14px]" style={{ fontFamily: FONT_BODY, fontWeight: 600, color: COLORS.ink.primary }}>{value}</div>
      </div>
    </div>
  );
}

export function OperatorJobDetails({ job, onStartJob, onCompleteJob, onDeliverMission, onDelivered, onClose }: OperatorJobDetailsProps) {
  const tier = URGENCY_TIERS[job.urgency];
  const earnings = Math.round(job.flightFee * 0.85);
  const isInProgress = job.status === "in_progress";
  const isCompleted = job.status === "completed";
  const isDelivered = isCompleted && job.missionStatus === "delivered";
  const isFlown = isCompleted && !isDelivered;

  const [mediaCount, setMediaCount] = useState(0);
  const [delivering, setDelivering] = useState(false);
  const [deliverError, setDeliverError] = useState<string | null>(null);

  const handleDeliver = async () => {
    if (!onDeliverMission || mediaCount === 0 || delivering) return;
    setDelivering(true);
    setDeliverError(null);
    try {
      await onDeliverMission(job.id);
      onDelivered?.();
    } catch (e) {
      setDeliverError(e instanceof Error ? e.message : "Delivery failed — try again");
    } finally {
      setDelivering(false);
    }
  };

  const whenLabel = job.scheduledDate && job.scheduledTime
    ? `${job.scheduledDate} at ${job.scheduledTime}`
    : `${tier.label} · ${tier.timeframe}`;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location.address)}`;
  const initials = job.customerName?.split(" ").map((n) => n[0]).join("") ?? "CU";

  const statusPill = isDelivered
    ? { bg: COLORS.brand.greenSoft, fg: COLORS.brand.greenDark, label: "DELIVERED", pulse: false }
    : isFlown
    ? { bg: COLORS.brand.greenSoft, fg: COLORS.brand.greenDark, label: "FLOWN", pulse: false }
    : isInProgress
    ? { bg: COLORS.brand.greenSoft, fg: COLORS.brand.greenDark, label: "IN PROGRESS", pulse: true }
    : { bg: "#fdeee6", fg: COLORS.brand.orange, label: "ACCEPTED", pulse: false };

  return (
    <div className="fixed inset-0 bg-[#fafafa] flex flex-col z-50 overflow-hidden">
      <div className="flex-shrink-0 bg-white border-b border-[#e8e8e8] px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close job details"
            className="w-9 h-9 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X size={18} className="text-[#737373]" />
          </button>
          <Logo className="h-9 hidden sm:block" />
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-full"
          style={{ backgroundColor: statusPill.bg }}
        >
          {statusPill.pulse
            ? <span className="w-2 h-2 rounded-full bg-[#5cb89c] animate-pulse" />
            : isCompleted && <CheckCircle2 size={13} style={{ color: statusPill.fg }} />}
          <span className="text-[12px]" style={{ fontFamily: FONT_BODY, fontWeight: 700, color: statusPill.fg }}>
            {statusPill.label}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-[26px]" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: COLORS.ink.primary }}>
              {job.serviceType}
            </h1>
            <UrgencyBadge tier={tier} urgency={job.urgency} icon={job.urgency === "immediate" ? <Zap size={10} /> : undefined} />
          </div>
          <p className="text-[13px] mb-5" style={{ fontFamily: FONT_BODY, color: COLORS.ink.muted }}>
            Job #{job.id}
          </p>

          <div className="bg-white border border-[#e8e8e8] rounded-[16px] px-4 mb-4">
            <InfoRow icon={Clock} label="When" value={whenLabel} />
            <InfoRow
              icon={MapPin}
              label="Location"
              value={
                <span className="flex items-center gap-2 flex-wrap">
                  {job.location.address}
                  <a
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[12px]"
                    style={{ color: COLORS.brand.green, fontWeight: 700 }}
                  >
                    Open in Maps <ExternalLink size={11} />
                  </a>
                </span>
              }
            />
            <InfoRow icon={Clock} label="Estimated Duration" value={`${job.estimatedDuration} minutes`} />
            <InfoRow icon={DollarSign} label="Your Earnings" value={`$${earnings}`} />
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} style={{ color: COLORS.brand.green }} />
              <p className="text-[12px]" style={{ fontFamily: FONT_BODY, fontWeight: 700, color: COLORS.brand.green, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Mission Requirements
              </p>
            </div>
            <p className="text-[14px] leading-relaxed" style={{ fontFamily: FONT_BODY, color: COLORS.ink.primary }}>
              {job.description || `${job.serviceType} at ${job.location.address}. Duration: ${job.estimatedDuration} minutes.`}
            </p>
          </div>

          <div className="flex items-center gap-3 mb-4 p-4 bg-white border border-[#e8e8e8] rounded-[16px]">
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: COLORS.brand.green }}>
              <span className="text-white text-[13px]" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] truncate" style={{ fontFamily: FONT_BODY, fontWeight: 600, color: COLORS.ink.primary }}>{job.customerName}</p>
              <p className="text-[12px]" style={{ fontFamily: FONT_BODY, color: COLORS.ink.muted }}>Customer</p>
            </div>
            <button
              type="button"
              aria-label={`Call ${job.customerName ?? "customer"}`}
              className="w-11 h-11 flex items-center justify-center flex-shrink-0 bg-white border border-[#e8e8e8] rounded-full hover:border-[#5cb89c] transition-colors"
            >
              <Phone size={15} style={{ color: COLORS.brand.green }} />
            </button>
            <button
              type="button"
              aria-label="Report an issue with this job"
              className="w-11 h-11 flex items-center justify-center flex-shrink-0 bg-white border border-[#e8e8e8] rounded-full hover:border-[#5cb89c] transition-colors"
            >
              <AlertCircle size={15} style={{ color: COLORS.ink.muted }} />
            </button>
          </div>

          {(isInProgress || isFlown) && (
            <div className="mb-4">
              <MissionArtifacts missionId={job.id} mode="upload" onMediaCountChange={setMediaCount} />
            </div>
          )}
          {isDelivered && (
            <div className="mb-4">
              <MissionArtifacts
                missionId={job.id}
                mode="download"
                released={isDownloadMediaReleased(job.missionStatus)}
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 bg-white border-t border-[#e8e8e8] px-4 md:px-6 py-4">
        <div className="max-w-2xl mx-auto">
          {isDelivered ? (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-4 rounded-[14px] border border-[#e8e8e8] hover:bg-[#f5f5f5] transition-colors"
              style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: "16px", color: COLORS.ink.primary }}
            >
              Close
            </button>
          ) : isFlown ? (
            <>
              {deliverError && (
                <p className="text-[12px] mb-2 text-center" role="alert" style={{ fontFamily: FONT_BODY, color: COLORS.brand.orange }}>
                  {deliverError}
                </p>
              )}
              <button
                type="button"
                onClick={() => void handleDeliver()}
                disabled={mediaCount === 0 || delivering}
                aria-disabled={mediaCount === 0 || delivering}
                className="w-full text-white py-4 rounded-[14px] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: "16px", backgroundColor: COLORS.brand.green }}
              >
                {delivering ? <Loader2 size={18} className="animate-spin" /> : <Send size={16} />}
                {delivering ? "Delivering…" : "Deliver to customer"}
              </button>
              {mediaCount === 0 && (
                <p className="text-[12px] mt-2 text-center" style={{ fontFamily: FONT_BODY, color: COLORS.ink.faint }}>
                  Upload at least one file before you can deliver this mission.
                </p>
              )}
            </>
          ) : isInProgress ? (
            <button
              type="button"
              onClick={onCompleteJob}
              className="w-full text-white py-4 rounded-[14px] transition-all"
              style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: "16px", backgroundColor: COLORS.brand.green }}
            >
              Mark Complete
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartJob}
              className="w-full text-white py-4 rounded-[14px] transition-all shadow-[0px_4px_14px_rgba(216,90,48,0.35)]"
              style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: "16px", backgroundColor: COLORS.brand.orange }}
            >
              Arrived — start job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
