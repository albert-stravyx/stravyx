import { useState, Fragment } from "react";
import { Job, URGENCY_TIERS } from "../../types";
import { UrgencyBadge } from "../UrgencyBadge";
import { MapPin, Clock, CheckCircle2, AlertCircle, Loader2, Calendar, Download, RotateCcw, ChevronDown } from "lucide-react";
import { MissionArtifacts } from "../MissionArtifacts";
import { isDownloadMediaReleased } from "../../../lib/downloadPanelReleased";
import { customerJobStatusLabel } from "@/lib/jobStatusCopy";

interface JobHistoryProps {
  jobs: Job[];
  onTrackJob: (job: Job) => void;
}

const STATUS_CONFIG = {
  pending: { label: customerJobStatusLabel("pending"), bg: "#c0d9e8", text: "#2d4d6d", Icon: Loader2, spin: true },
  accepted: { label: customerJobStatusLabel("accepted"), bg: "#c4c0e8", text: "#3d3d6d", Icon: AlertCircle, spin: false },
  in_progress: { label: customerJobStatusLabel("in_progress"), bg: "#5cb89c", text: "#ffffff", Icon: Loader2, spin: true },
  completed: { label: customerJobStatusLabel("completed"), bg: "#e8f5f0", text: "#2d6b53", Icon: CheckCircle2, spin: false },
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-AU", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function StatusBadge({ status }: { status: Job["status"] }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] whitespace-nowrap"
      style={{ backgroundColor: cfg.bg, color: cfg.text, fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}
    >
      <Icon size={10} className={cfg.spin ? "animate-spin" : ""} />
      {cfg.label}
    </span>
  );
}

function StatCards({ jobs }: { jobs: Job[] }) {
  const completed = jobs.filter((j) => j.status === "completed");
  const totalSpent = jobs.reduce((s, j) => s + j.totalPrice, 0);
  const active = jobs.filter((j) => j.status !== "completed").length;
  const avgPrice = completed.length ? Math.round(totalSpent / completed.length) : 0;

  const stats = [
    { label: "Total Spent", value: `$${totalSpent.toLocaleString()}`, bg: "#5cb89c", fg: "#fff" },
    { label: "Jobs Completed", value: String(completed.length), bg: "#e8f5f0", fg: "#2d6b53" },
    { label: "Active Jobs", value: String(active), bg: "#f0f0ff", fg: "#3d3d9d" },
    { label: "Avg Job Value", value: `$${avgPrice}`, bg: "#fff8e8", fg: "#7a4d0a" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {stats.map((s) => (
        <div key={s.label} className="rounded-[14px] px-5 py-4" style={{ backgroundColor: s.bg }}>
          <p className="text-[22px] md:text-[26px] mb-0.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: s.fg }}>
            {s.value}
          </p>
          <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: s.fg, opacity: 0.8 }}>
            {s.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

function MobileCard({ job, expanded, onToggle, onTrackJob }: { job: Job; expanded: boolean; onToggle: () => void; onTrackJob: (job: Job) => void }) {
  return (
    <div className="bg-white rounded-[16px] border border-[#e8e8e8] overflow-hidden mb-3">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-[15px] truncate mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}>
              {job.serviceType}
            </p>
            <div className="flex items-center gap-1">
              <MapPin size={11} className="text-[#737373] flex-shrink-0" />
              <p className="text-[12px] truncate" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                {job.location.address}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <StatusBadge status={job.status} />
            <span className="text-[16px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              ${job.totalPrice}
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between pt-3 border-t border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Clock size={11} className="text-[#737373]" />
              <span className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{job.estimatedDuration} min</span>
            </div>
            <UrgencyBadge tier={URGENCY_TIERS[job.urgency]} urgency={job.urgency} />
          </div>
          {job.status !== "completed" ? (
            <button type="button" onClick={() => onTrackJob(job)} className="flex items-center gap-1">
              <RotateCcw size={11} className="text-[#5cb89c]" />
              <span className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#5cb89c", fontWeight: 600 }}>Track</span>
            </button>
          ) : (
          <div className="flex items-center gap-1">
            <Calendar size={11} className="text-[#b0b0b0]" />
            <span className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>{formatDate(job.createdAt)}</span>
          </div>
          )}
        </div>
      </div>
      {job.status === "completed" && (
        <>
          <button
            onClick={onToggle}
            className="w-full px-4 py-2.5 bg-[#fafafa] border-t border-[#f0f0f0] flex items-center justify-between"
          >
            <span className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#5cb89c", fontWeight: 600 }}>
              View Receipt & Data
            </span>
            <div className="flex items-center gap-1.5">
              <Download size={14} className="text-[#5cb89c]" />
              <ChevronDown size={14} className="text-[#5cb89c] transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
            </div>
          </button>
          {expanded && (
            <div className="p-4 border-t border-[#f0f0f0]">
              <MissionArtifacts
                missionId={job.id}
                mode="download"
                released={isDownloadMediaReleased(job.missionStatus)}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Desktop table ────────────────────────────────────────────────────────────

function DesktopTable({
  jobs, expandedId, onToggle, onTrackJob,
}: {
  jobs: Job[]; expandedId: string | null; onToggle: (id: string) => void; onTrackJob: (job: Job) => void;
}) {
  if (jobs.length === 0) return null;
  return (
    <div className="bg-white rounded-[16px] border border-[#e8e8e8] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-[#f0f0f0]">
            {["Service", "Location", "Date", "Duration", "Urgency", "Status", "Price", ""].map((col) => (
              <th
                key={col}
                className="px-5 py-3 text-left text-[11px]"
                style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.06em" }}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => {
          const isExpanded = expandedId === job.id;
          return (
          <Fragment key={job.id}>
            <tr className="border-b border-[#f8f8f8] hover:bg-[#fafafa] transition-colors last:border-b-0">
              <td className="px-5 py-3.5">
                <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                  {job.serviceType}
                </p>
                <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                  #{job.id}
                </p>
              </td>
              <td className="px-5 py-3.5 max-w-[180px]">
                <div className="flex items-start gap-1.5">
                  <MapPin size={12} className="text-[#5cb89c] mt-0.5 flex-shrink-0" />
                  <p className="text-[13px] line-clamp-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#555" }}>
                    {job.location.address}
                  </p>
                </div>
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}>{formatDate(job.createdAt)}</p>
                <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{formatTime(job.createdAt)}</p>
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-[#737373]" />
                  <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#555" }}>
                    {job.estimatedDuration} min
                  </span>
                </div>
              </td>
              <td className="px-5 py-3.5">
                <UrgencyBadge tier={URGENCY_TIERS[job.urgency]} urgency={job.urgency} />
              </td>
              <td className="px-5 py-3.5">
                <StatusBadge status={job.status} />
              </td>
              <td className="px-5 py-3.5 whitespace-nowrap">
                <p className="text-[15px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
                  ${job.totalPrice}
                </p>
                <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                  Flight ${job.flightFee}
                </p>
              </td>
              <td className="px-4 py-3.5">
                {job.status === "completed" ? (
                  <button
                    onClick={() => onToggle(job.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8f5f0] rounded-[8px] hover:bg-[#d0ede5] transition-colors whitespace-nowrap"
                  >
                    <Download size={13} className="text-[#5cb89c]" />
                    <span className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d6b53" }}>
                      Receipt
                    </span>
                    <ChevronDown size={12} className="text-[#5cb89c] transition-transform" style={{ transform: isExpanded ? "rotate(180deg)" : "none" }} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onTrackJob(job)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f5] rounded-[8px] hover:bg-[#ebebeb] transition-colors whitespace-nowrap"
                  >
                    <RotateCcw size={13} className="text-[#737373]" />
                    <span className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, color: "#737373" }}>
                      Track
                    </span>
                  </button>
                )}
              </td>
            </tr>
            {isExpanded && (
              <tr className="border-b border-[#f8f8f8] last:border-b-0">
                <td colSpan={8} className="px-5 py-4 bg-[#fafafa]">
                  <MissionArtifacts
                    missionId={job.id}
                    mode="download"
                    released={isDownloadMediaReleased(job.missionStatus)}
                  />
                </td>
              </tr>
            )}
          </Fragment>
          );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function JobHistory({ jobs, onTrackJob }: JobHistoryProps) {
  const sorted = [...jobs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const active = sorted.filter((j) => j.status !== "completed");
  const past = sorted.filter((j) => j.status === "completed");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleExpanded = (id: string) => setExpandedId((prev) => (prev === id ? null : id));

  const empty = (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 bg-[#f0f0f0] rounded-full flex items-center justify-center mb-4">
        <Calendar size={28} className="text-[#c0c0c0]" />
      </div>
      <p className="text-[18px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}>
        No jobs yet
      </p>
      <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
        Book your first drone service to get started
      </p>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-[#fafafa]">
      <div className="px-4 md:px-8 pt-6 pb-24">
        {/* Page heading — mobile only (desktop heading is in CustomerHome) */}
        <div className="md:hidden mb-4">
          <h1 className="text-[26px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>My Jobs</h1>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>{jobs.length} total</p>
        </div>

        {/* Stat cards */}
        {jobs.length > 0 && <StatCards jobs={jobs} />}

        {jobs.length === 0 && empty}

        {/* MOBILE: card list */}
        <div className="md:hidden">
          {active.length > 0 && (
            <>
              <p className="text-[12px] mb-3" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Active
              </p>
              {active.map((job) => (
                <MobileCard key={job.id} job={job} expanded={expandedId === job.id} onToggle={() => toggleExpanded(job.id)} onTrackJob={onTrackJob} />
              ))}
            </>
          )}
          {past.length > 0 && (
            <>
              <p className="text-[12px] mb-3 mt-4" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Completed
              </p>
              {past.map((job) => (
                <MobileCard key={job.id} job={job} expanded={expandedId === job.id} onToggle={() => toggleExpanded(job.id)} onTrackJob={onTrackJob} />
              ))}
            </>
          )}
        </div>

        {/* DESKTOP: table */}
        <div className="hidden md:block">
          {active.length > 0 && (
            <div className="mb-6">
              <p className="text-[12px] mb-3" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Active Jobs
              </p>
              <DesktopTable jobs={active} expandedId={expandedId} onToggle={toggleExpanded} onTrackJob={onTrackJob} />
            </div>
          )}
          {past.length > 0 && (
            <div>
              <p className="text-[12px] mb-3" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Completed Jobs
              </p>
              <DesktopTable jobs={past} expandedId={expandedId} onToggle={toggleExpanded} onTrackJob={onTrackJob} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
