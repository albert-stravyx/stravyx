import { useEffect, useRef, useState } from "react";
import {
  MapPin, Clock, User, Phone, Mail, Star, CheckCircle2,
  Navigation, Cpu, Wind, Search, UserCheck, Download, ArrowLeft,
} from "lucide-react";
import { Job, URGENCY_TIERS } from "../../types";
import { Logo } from "../Logo";
import { MissionArtifacts } from "../MissionArtifacts";
import { isDownloadMediaReleased } from "../../../lib/downloadPanelReleased";
import {
  statusToActiveStep,
  statusToOverallPercent,
  trackJobHeaderTitle,
  trackJobMapBadge,
} from "@/lib/jobStatusCopy";

interface TrackJobProps {
  job: Job;
  onLeaveTrack: () => void;
}

// ─── Progress step definitions ────────────────────────────────────────────────

interface ProgressStep {
  id: string;
  label: string;
  detail: (job: Job) => string;
  icon: React.ElementType;
}

const STEPS: ProgressStep[] = [
  { id: "submitted",  label: "Job Submitted",     icon: CheckCircle2, detail: () => "Request sent to operators in your area." },
  { id: "matching",   label: "Finding Operator",  icon: Search,       detail: () => "Scanning for certified operators nearby." },
  { id: "confirmed",  label: "Operator Assigned", icon: UserCheck,    detail: (j) => j.operatorName ? `${j.operatorName} confirmed and preparing equipment.` : "Operator confirmed." },
  { id: "enroute",    label: "En Route",          icon: Navigation,   detail: () => "Operator is heading to your location." },
  { id: "onsite",     label: "On Site",           icon: MapPin,       detail: () => "Operator has arrived — pre-flight checks underway." },
  { id: "flying",     label: "Mission Active",    icon: Wind,         detail: (j) => `Drone deployed, capturing ${j.serviceType.toLowerCase()} data.` },
  { id: "processing", label: "Processing Data",   icon: Cpu,          detail: () => "AI processing your footage and generating deliverables." },
  { id: "complete",   label: "Complete",          icon: CheckCircle2, detail: () => "All deliverables ready for download." },
];

// ─── Colour helpers ───────────────────────────────────────────────────────────

const ORANGE = "#d85a30";
const GREEN  = "#5cb89c";
const GREY   = "#e8e8e8";

function progressColor(status: Job["status"]) {
  return status === "completed" ? GREEN : ORANGE;
}

// ─── Circular gauge ───────────────────────────────────────────────────────────

function CircleGauge({ percent, status }: { percent: number; status: Job["status"] }) {
  const size = 80;
  const stroke = 7;
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  const cx = size / 2;
  const color = progressColor(status);

  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={GREY} strokeWidth={stroke} />
      <circle
        cx={cx} cy={cx} r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s ease, stroke 0.6s ease" }}
      />
    </svg>
  );
}

// ─── Step progress bar (animated fill for active step) ────────────────────────

function StepProgressBar({ active, subProgress, status }: { active: boolean; subProgress: number; status: Job["status"] }) {
  if (!active) return null;
  return (
    <div className="mt-2 h-1.5 rounded-full overflow-hidden w-full max-w-[180px]" style={{ backgroundColor: GREY }}>
      <div
        className="h-full rounded-full"
        style={{
          width: `${subProgress}%`,
          backgroundColor: progressColor(status),
          transition: "width 1s linear, background-color 0.6s ease",
        }}
      />
    </div>
  );
}

// ─── Map with pin overlay ─────────────────────────────────────────────────────

const MAP_URL = `https://api.maptiler.com/maps/base-v4/?key=${process.env.NEXT_PUBLIC_MAPTILER_KEY ?? ""}#15.9/-33.87257/151.20755`;

function MapWithPin({ job }: { job: Job }) {
  const pinColor = job.status === "completed" ? GREEN : ORANGE;
  const isActive = job.status === "in_progress";

  return (
    <div className="flex-1 relative min-h-[260px] md:min-h-0">
      <iframe
        src={MAP_URL}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="Job Tracking Map"
      />
      {/* Pulsing pin overlay at map center */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="relative">
          {/* Pulse rings — orange during active mission */}
          {isActive && (
            <>
              <div className="absolute rounded-full animate-ping" style={{ width: 56, height: 56, top: -16, left: -16, backgroundColor: `${ORANGE}30` }} />
              <div className="absolute rounded-full animate-ping" style={{ width: 80, height: 80, top: -28, left: -28, backgroundColor: `${ORANGE}18`, animationDelay: "0.3s" }} />
            </>
          )}
          {/* Pin */}
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill={pinColor} />
            <circle cx="12" cy="12" r="5" fill="white" />
          </svg>
        </div>
      </div>

      {/* Status badge on map */}
      {trackJobMapBadge(job.status) && (
        <div className="absolute top-3 left-3 bg-white rounded-full px-3 py-1.5 shadow-md flex items-center gap-2">
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: ORANGE }} />
          <span className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
            {trackJobMapBadge(job.status)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Progress timeline ────────────────────────────────────────────────────────

function ProgressTimeline({ job, subProgress }: { job: Job; subProgress: number }) {
  const activeIdx = statusToActiveStep(job.status);
  const overallPct = statusToOverallPercent(job.status);
  const isComplete = job.status === "completed";

  const now = new Date();
  const mockTimes: Record<number, string> = {
    0: formatTime(job.createdAt),
    1: formatTime(new Date(job.createdAt.getTime() + 20000)),
    2: job.acceptedAt ? formatTime(job.acceptedAt) : formatTime(new Date(job.createdAt.getTime() + 180000)),
    3: job.acceptedAt ? formatTime(new Date(job.acceptedAt.getTime() + 60000)) : "",
    4: job.acceptedAt ? formatTime(new Date(job.acceptedAt.getTime() + 300000)) : "",
    5: job.acceptedAt ? formatTime(new Date(job.acceptedAt.getTime() + 420000)) : "",
    6: job.completedAt ? formatTime(new Date(job.completedAt.getTime() - 120000)) : "",
    7: job.completedAt ? formatTime(job.completedAt) : "",
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Overall progress header */}
      <div className="flex items-center gap-4 p-5 border-b border-[#f0f0f0]">
        <div className="relative flex-shrink-0">
          <CircleGauge percent={overallPct} status={job.status} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[15px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 800, color: progressColor(job.status) }}>
              {overallPct}%
            </span>
          </div>
        </div>
        <div>
          <p className="text-[16px] mb-0.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
            {isComplete ? "Job Complete" : STEPS[activeIdx]?.label}
          </p>
          <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            {isComplete
              ? "Deliverables ready for download"
              : STEPS[activeIdx]?.detail(job)}
          </p>
          {!isComplete && (
            <div className="mt-2 h-1.5 w-32 rounded-full overflow-hidden" style={{ backgroundColor: GREY }}>
              <div
                className="h-full rounded-full"
                style={{ width: `${subProgress}%`, backgroundColor: ORANGE, transition: "width 1s linear" }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Step-by-step timeline */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {STEPS.map((step, i) => {
          const done = i < activeIdx || isComplete;
          const active = i === activeIdx && !isComplete;
          const pending = i > activeIdx && !isComplete;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-start gap-3">
              {/* Icon + connector line */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: done ? GREEN : active ? ORANGE : "#f0f0f0",
                    transition: "background-color 0.6s ease",
                  }}
                >
                  {done ? (
                    <CheckCircle2 size={14} className="text-white" strokeWidth={2.5} />
                  ) : active ? (
                    <Icon size={14} className="text-white" />
                  ) : (
                    <Icon size={14} style={{ color: "#c0c0c0" }} />
                  )}
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    className="w-px flex-1 my-1"
                    style={{
                      backgroundColor: done ? GREEN : "#e8e8e8",
                      minHeight: "20px",
                      transition: "background-color 0.6s ease",
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div className={`flex-1 pb-3 ${pending ? "opacity-40" : ""}`}>
                <div className="flex items-center justify-between">
                  <p
                    className="text-[13px]"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                      fontWeight: active ? 700 : done ? 600 : 400,
                      color: active ? "#2d2d2d" : done ? "#2d2d2d" : "#737373",
                    }}
                  >
                    {step.label}
                  </p>
                  {(done || (active && i === 0)) && mockTimes[i] && (
                    <span className="text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
                      {mockTimes[i]}
                    </span>
                  )}
                </div>

                {active && (
                  <p className="text-[11px] mt-0.5 leading-relaxed" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                    {step.detail(job)}
                  </p>
                )}

                <StepProgressBar active={active} subProgress={subProgress} status={job.status} />

                {/* Extra detail for specific active steps */}
                {active && step.id === "flying" && (
                  <div className="mt-2 flex gap-3">
                    {[
                      { label: "Altitude", value: "42m" },
                      { label: "Battery", value: "78%" },
                      { label: "Signal", value: "Strong" },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-[#f5f5f5] rounded-[8px] px-2.5 py-1.5 text-center">
                        <p className="text-[13px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
                          {stat.value}
                        </p>
                        <p className="text-[9px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                          {stat.label}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {active && step.id === "processing" && (
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {["Orthomosaic", "3D Model", "Report"].map((item, idx) => (
                      <div key={item} className="flex items-center gap-1.5 bg-[#f5f5f5] rounded-full px-2.5 py-1">
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: subProgress > (idx + 1) * 28 ? ORANGE : "#d0d0d0" }}
                        />
                        <span className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#555" }}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { hour: "2-digit", minute: "2-digit" }).format(date);
}

// ─── Operator card ────────────────────────────────────────────────────────────

function OperatorCard({ job }: { job: Job }) {
  if (job.status === "pending" || !job.operatorName) return null;
  return (
    <div className="border-t border-[#f0f0f0] px-4 py-4">
      <p className="text-[11px] mb-2" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        Your Operator
      </p>
      <div className="bg-[#f9f9f9] rounded-[12px] p-3 flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-[#5cb89c] rounded-full flex items-center justify-center flex-shrink-0">
          <User size={18} className="text-white" />
        </div>
        <div className="flex-1">
          <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
            {job.operatorName}
          </p>
          <div className="flex items-center gap-1">
            <Star size={11} className="text-[#5cb89c] fill-[#5cb89c]" />
            <span className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
              {job.operatorRating?.toFixed(1)} · 143 flights
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button className="flex items-center justify-center gap-2 py-2 bg-white border border-[#e8e8e8] rounded-[8px] hover:border-[#5cb89c] transition-colors">
          <Phone size={14} className="text-[#5cb89c]" />
          <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}>Call</span>
        </button>
        <button className="flex items-center justify-center gap-2 py-2 bg-white border border-[#e8e8e8] rounded-[8px] hover:border-[#5cb89c] transition-colors">
          <Mail size={14} className="text-[#5cb89c]" />
          <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}>Message</span>
        </button>
      </div>
    </div>
  );
}

// ─── Complete card ────────────────────────────────────────────────────────────

function CompleteCard({ job, onLeaveTrack }: { job: Job; onLeaveTrack: () => void }) {
  if (job.status !== "completed") return null;
  const isDelivered = job.missionStatus === "delivered";
  return (
    <div className="border-t border-[#f0f0f0] px-4 py-4 space-y-4">
      <div className="bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-[16px] p-5 text-center">
        <CheckCircle2 size={36} className="text-white mx-auto mb-2" />
        <p className="text-[18px] text-white mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>
          {isDelivered ? "Files Delivered" : "Mission Complete"}
        </p>
        <p className="text-[13px] text-white/80 mb-4" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {isDelivered
            ? "Your operator has delivered the mission files below."
            : "Your operator has finished flying — deliverables are on the way."}
        </p>
        <button
          type="button"
          onClick={onLeaveTrack}
          className="w-full bg-white text-[#5cb89c] py-2.5 rounded-[10px] flex items-center justify-center gap-2 hover:bg-[#f0faf7] transition-colors"
          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700 }}
        >
          <Download size={16} />
          Back to Home
        </button>
      </div>
      <MissionArtifacts
        missionId={job.id}
        mode="download"
        released={isDownloadMediaReleased(job.missionStatus)}
      />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function TrackJob({ job, onLeaveTrack }: TrackJobProps) {
  const [subProgress, setSubProgress] = useState(8);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animate sub-progress for the active step
  useEffect(() => {
    setSubProgress(8);
    if (job.status === "completed") { setSubProgress(100); return; }
    intervalRef.current = setInterval(() => {
      setSubProgress((p) => (p >= 92 ? 92 : p + 1.2));
    }, 1200);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [job.status]);

  const urgency = URGENCY_TIERS[job.urgency];

  return (
    <div className="fixed inset-0 bg-[#fafafa] flex flex-col min-h-0">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-[#e8e8e8] px-4 md:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onLeaveTrack}
            className="flex items-center gap-1.5 hover:text-[#2d2d2d] transition-colors flex-shrink-0"
            style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}
          >
            <ArrowLeft size={16} />
            Back to Home
          </button>
          <div className="h-6 w-px bg-[#e8e8e8] hidden md:block" />
          <Logo className="h-8 md:h-12 hidden md:block" />
          <div className="h-6 w-px bg-[#e8e8e8] hidden md:block" />
          <div className="min-w-0">
            <p className="text-[15px] md:text-[18px] truncate" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              {trackJobHeaderTitle(job.status)}
            </p>
            <p className="text-[12px] truncate" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
              {job.serviceType} · {job.location.address}
            </p>
          </div>
        </div>
        <div
          className="px-3 py-1 rounded-full text-[11px]"
          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, backgroundColor: urgency.color, color: urgency.textColor }}
        >
          {urgency.label}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto md:flex-row md:overflow-hidden">
        {/* Map */}
        <MapWithPin job={job} />

        {/* Progress panel */}
        <div className="w-full md:w-[380px] xl:w-[420px] md:flex-shrink-0 bg-white border-t md:border-t-0 md:border-l border-[#e8e8e8] flex flex-col md:min-h-0 md:overflow-hidden">
          <ProgressTimeline job={job} subProgress={subProgress} />
          <OperatorCard job={job} />
          <CompleteCard job={job} onLeaveTrack={onLeaveTrack} />
        </div>
      </div>
    </div>
  );
}
