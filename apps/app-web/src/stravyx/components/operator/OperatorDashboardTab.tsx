import {
  MapPin, Clock, DollarSign, CheckCircle2, Navigation, Star, WifiOff, PlaneLanding,
} from "lucide-react";
import { Job, URGENCY_TIERS } from "../../types";
import { UrgencyBadge } from "../UrgencyBadge";
import { MissionArtifacts } from "../MissionArtifacts";
import { isDownloadMediaReleased } from "../../../lib/downloadPanelReleased";
import { SectionLabel } from "./OperatorShared";
import { formatAudWhole, operatorEarn, type OperatorDashboardStats } from "@/lib/dashboardStats";

// ─── Dashboard tab ────────────────────────────────────────────────────────────

export function DashboardTab({
  online, availableJobs, currentJob, awaitingDeliveryJobs = [], stats, canAccept = true, verificationBlocked = false, onGoToVerification, onAcceptJob, onOpenJobDetails, onStartJob, onCompleteJob,
}: {
  online: boolean;
  availableJobs: Job[];
  currentJob?: Job;
  /** Flown-not-delivered jobs excluding whichever one occupies `currentJob`. */
  awaitingDeliveryJobs?: Job[];
  stats: OperatorDashboardStats;
  canAccept?: boolean;
  verificationBlocked?: boolean;
  onGoToVerification?: () => void;
  onAcceptJob: (id: string) => void;
  onOpenJobDetails?: (jobId?: string) => void;
  onStartJob?: () => void;
  onCompleteJob?: () => void;
}) {
  const statCards = [
    { label: "Rating",        value: stats.rating,                       icon: Star,         color: "#5cb89c", fill: false },
    { label: "Jobs Done",     value: String(stats.jobsDone),             icon: CheckCircle2, color: "#7070d0", fill: false },
    { label: "Today",         value: formatAudWhole(stats.todayEarn),    icon: DollarSign,   color: "#5cb89c", fill: false },
    { label: "Avg Response",  value: stats.avgResponse,                  icon: Clock,        color: "#d09030", fill: false },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color, fill }) => (
          <div key={label} className="bg-white border border-[#e8e8e8] rounded-[16px] p-5">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} style={{ color, ...(fill ? { fill: color } : {}) }} />
              <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{label}</span>
            </div>
            <p className="text-[28px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: label === "Today" ? "#5cb89c" : "#2d2d2d" }}>
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* Current job */}
      {currentJob && (
        <div>
          <SectionLabel>Current Job</SectionLabel>
          <div
            role="button"
            tabIndex={0}
            onClick={() => onOpenJobDetails?.()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onOpenJobDetails?.(); }}
            className="bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-[16px] p-5 text-white cursor-pointer"
          >
            <div className="flex items-start justify-between mb-4 gap-4">
              <div className="flex-1">
                <p className="text-[20px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>{currentJob.serviceType}</p>
                <div className="flex items-center gap-2 mb-1 opacity-90">
                  <MapPin size={14} /><span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif" }}>{currentJob.location.address}</span>
                </div>
                <div className="flex items-center gap-2 opacity-90">
                  <Clock size={14} /><span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif" }}>{currentJob.estimatedDuration} minutes</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[12px] opacity-75 mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>Your earnings</p>
                <p className="text-[28px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>${operatorEarn(currentJob)}</p>
              </div>
            </div>
            <div className="flex gap-3" onClick={(e) => e.stopPropagation()}>
              {currentJob.status === "accepted" && (
                <button type="button" onClick={onStartJob} className="flex-1 bg-white text-[#5cb89c] py-3 rounded-[12px] hover:bg-[#f0faf7] transition-colors" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700 }}>
                  Arrived — start job
                </button>
              )}
              {currentJob.status === "in_progress" && (
                <button type="button" onClick={onCompleteJob} className="flex-1 bg-white text-[#5cb89c] py-3 rounded-[12px] hover:bg-[#f0faf7] transition-colors" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700 }}>
                  Mark Complete
                </button>
              )}
              {(currentJob.status === "accepted" || currentJob.status === "in_progress" || currentJob.status === "completed") && (
                <button type="button" onClick={() => onOpenJobDetails?.()} className="flex-1 bg-white/20 text-white py-3 rounded-[12px] hover:bg-white/30 transition-colors" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700 }}>
                  View details
                </button>
              )}
            </div>
          </div>
          {currentJob.status === "in_progress" && (
            <div className="mt-4 bg-white border-2 border-dashed border-[#e0e0e0] rounded-[16px] px-4 py-5 text-center">
              <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                Mark this mission complete to start uploading media
              </p>
              <p className="text-[11px] mt-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
                Uploads open once the mission is flown, then you can deliver files to the customer.
              </p>
            </div>
          )}
          {currentJob.status === "completed" && currentJob.missionStatus !== "delivered" && (
            <div className="mt-4">
              <MissionArtifacts missionId={currentJob.id} mode="upload" />
            </div>
          )}
          {currentJob.status === "completed" && currentJob.missionStatus === "delivered" && (
            <div className="mt-4">
              <MissionArtifacts
                missionId={currentJob.id}
                mode="download"
                released={isDownloadMediaReleased(currentJob.missionStatus)}
              />
            </div>
          )}
        </div>
      )}

      {/* Awaiting delivery queue */}
      {awaitingDeliveryJobs.length > 0 && (
        <div>
          <SectionLabel>Awaiting Delivery</SectionLabel>
          <div className="space-y-2">
            {awaitingDeliveryJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white border border-[#e8e8e8] rounded-[16px] p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#f5f5f5] flex items-center justify-center flex-shrink-0">
                    <PlaneLanding size={15} className="text-[#5cb89c]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] truncate" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}>
                      {job.serviceType}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} className="text-[#b0b0b0] flex-shrink-0" />
                      <span className="text-[12px] truncate" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                        {job.location.address}
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0902a" }}>
                      Flown — files not yet delivered
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenJobDetails?.(job.id)}
                  className="flex-shrink-0 px-4 py-2 rounded-[10px] border border-[#5cb89c] hover:bg-[#f0faf7] transition-colors"
                  style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "13px", color: "#2d6b53" }}
                >
                  View details
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unverified — cannot accept or go online */}
      {verificationBlocked && (
        <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6" role="status">
          <p className="text-[18px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}>
            Verification required
          </p>
          <p className="text-[14px] mb-4" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            You are not verified. Availability stays offline and you cannot accept jobs until a Stravyx admin approves your credentials.
          </p>
          <button
            type="button"
            onClick={onGoToVerification}
            className="px-4 py-2.5 rounded-[10px] bg-[#5cb89c] text-white hover:bg-[#4a9d84] transition-colors"
            style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "14px" }}
          >
            Go to Verify ID
          </button>
        </div>
      )}

      {/* Offline state */}
      {!online && !currentJob && !verificationBlocked && (
        <div className="bg-white border-2 border-dashed border-[#e0e0e0] rounded-[16px] p-10 text-center">
          <WifiOff size={36} className="text-[#d0d0d0] mx-auto mb-3" />
          <p className="text-[18px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}>You're offline</p>
          <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>Toggle your status to Online to start receiving jobs.</p>
        </div>
      )}

      {/* Available jobs */}
      {(online || (verificationBlocked && availableJobs.length > 0)) && (
        <div>
          <SectionLabel>Available Jobs Near You</SectionLabel>
          {availableJobs.length === 0 ? (
            <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-10 text-center">
              <Navigation size={36} className="text-[#d0d0d0] mx-auto mb-3" />
              <p className="text-[15px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>No jobs in your area right now</p>
            </div>
          ) : (
            <div className="space-y-3">
              {availableJobs.map((job) => {
                const earn = operatorEarn(job);
                const tier = URGENCY_TIERS[job.urgency];
                return (
                  <div key={job.id} className="bg-white border border-[#e8e8e8] rounded-[16px] p-5 hover:border-[#5cb89c] transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <p className="text-[17px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}>{job.serviceType}</p>
                          <UrgencyBadge tier={tier} urgency={job.urgency} />
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin size={13} className="text-[#5cb89c]" />
                          <span className="text-[13px] truncate" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
  {(() => {
    const R = 6371;
    const opLat = 37.7749, opLng = -122.4194;
    const dLat = (job.location.lat - opLat) * Math.PI / 180;
    const dLng = (job.location.lng - opLng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(opLat * Math.PI/180) * Math.cos(job.location.lat * Math.PI/180) * Math.sin(dLng/2)**2;
    const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
    const suburb = job.location.address.split(",")[1]?.trim() ?? job.location.address;
    return `${suburb} · ${dist} away`;
  })()}
</span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <Clock size={13} className="text-[#5cb89c]" />
                          <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{job.estimatedDuration} min</span>
                        </div>
                        <p className="text-[13px] line-clamp-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{job.description}</p>
                      </div>
                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <p className="text-[26px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#5cb89c" }}>${earn}</p>
                        <button
                          type="button"
                          onClick={() => onAcceptJob(job.id)}
                          disabled={!canAccept}
                          aria-disabled={!canAccept}
                          title={canAccept ? undefined : "Verification required to accept jobs"}
                          className="bg-[#d85a30] text-white px-6 py-2.5 rounded-[10px] hover:bg-[#b8481f] transition-colors shadow-[0px_4px_12px_rgba(216,90,48,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[#d85a30]"
                          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "14px" }}
                        >
                          {canAccept ? "Accept" : "Verification required"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
