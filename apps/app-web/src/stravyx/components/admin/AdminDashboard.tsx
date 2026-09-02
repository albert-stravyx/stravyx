import { useState } from "react";
import { Users, Plane, DollarSign, TrendingUp, CheckCircle2, Clock, Navigation, Pencil } from "lucide-react";
import { Job, UrgencyTier, UrgencyPricing } from "../../types";
import { Logo } from "../Logo";
import { AdminOperatorQueue } from "./AdminOperatorQueue";

interface AdminDashboardProps {
  jobs: Job[];
  urgencyTiers: Record<UrgencyTier, UrgencyPricing>;
  onUpdateTier: (tier: UrgencyTier, patch: Partial<UrgencyPricing>) => void;
}

// ─── Pricing tier card (view + inline edit) ───────────────────────────────────

function PricingTierCard({ tier, onUpdate }: { tier: UrgencyPricing; onUpdate: (patch: Partial<UrgencyPricing>) => void }) {
  const [editing, setEditing] = useState(false);
  const [multiplier, setMultiplier] = useState(String(tier.multiplier));
  const [timeframe, setTimeframe] = useState(tier.timeframe);
  const [description, setDescription] = useState(tier.description);

  const startEdit = () => {
    setMultiplier(String(tier.multiplier));
    setTimeframe(tier.timeframe);
    setDescription(tier.description);
    setEditing(true);
  };

  const save = () => {
    const parsed = parseFloat(multiplier);
    onUpdate({
      multiplier: Number.isFinite(parsed) && parsed > 0 ? parsed : tier.multiplier,
      timeframe: timeframe.trim() || tier.timeframe,
      description: description.trim() || tier.description,
    });
    setEditing(false);
  };

  return (
    <div className="rounded-[14px] p-4" style={{ backgroundColor: tier.color }}>
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-[10px] px-2 py-1 rounded"
          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, backgroundColor: "rgba(255,255,255,0.4)", color: tier.textColor }}
        >
          {tier.label}
        </span>
        {!editing && (
          <button onClick={startEdit} className="p-1.5 rounded-full hover:bg-white/30 transition-colors" title="Edit tier">
            <Pencil size={13} style={{ color: tier.textColor }} />
          </button>
        )}
      </div>

      {!editing ? (
        <>
          <p className="text-[26px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: tier.textColor }}>
            {tier.multiplier}×
          </p>
          <p className="text-[13px] mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: tier.textColor, opacity: 0.85 }}>
            {tier.timeframe}
          </p>
          <p className="text-[11px] leading-snug" style={{ fontFamily: "DM Sans, sans-serif", color: tier.textColor, opacity: 0.7 }}>
            {tier.description}
          </p>
        </>
      ) : (
        <div className="space-y-2">
          <div>
            <label className="text-[10px] block mb-1" style={{ fontFamily: "DM Sans, sans-serif", color: tier.textColor, opacity: 0.8 }}>
              Price Multiplier
            </label>
            <input
              type="number"
              step="0.05"
              min="0.1"
              value={multiplier}
              onChange={(e) => setMultiplier(e.target.value)}
              className="w-full px-2 py-1.5 rounded-[8px] text-[13px] border-0 focus:outline-none focus:ring-2 focus:ring-white/70"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ fontFamily: "DM Sans, sans-serif", color: tier.textColor, opacity: 0.8 }}>
              Timeframe
            </label>
            <input
              type="text"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="w-full px-2 py-1.5 rounded-[8px] text-[13px] border-0 focus:outline-none focus:ring-2 focus:ring-white/70"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
          </div>
          <div>
            <label className="text-[10px] block mb-1" style={{ fontFamily: "DM Sans, sans-serif", color: tier.textColor, opacity: 0.8 }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full px-2 py-1.5 rounded-[8px] text-[12px] border-0 resize-none focus:outline-none focus:ring-2 focus:ring-white/70"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              onClick={save}
              className="flex-1 py-1.5 rounded-[8px] bg-[#2d2d2d] text-white text-[12px] hover:bg-[#1a1a1a] transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-1.5 rounded-[8px] bg-white/50 hover:bg-white/70 transition-colors text-[12px]"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: tier.textColor }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function AdminDashboard({ jobs, urgencyTiers, onUpdateTier }: AdminDashboardProps) {
  const stats = {
    totalJobs: jobs.length,
    activeJobs: jobs.filter((j) => j.status === "accepted" || j.status === "in_progress").length,
    completedJobs: jobs.filter((j) => j.status === "completed").length,
    totalRevenue: jobs
      .filter((j) => j.status === "completed")
      .reduce((sum, j) => sum + (j.totalPrice - j.flightFee * 0.85), 0),
    totalCustomers: 42,
    totalOperators: 18,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-[#c0d9e8] text-[#3d3d4d]";
      case "accepted":
        return "bg-[#c4c0e8] text-[#3d3d4d]";
      case "in_progress":
        return "bg-[#5cb89c] text-white";
      case "completed":
        return "bg-[#7dcdb5] text-white";
      default:
        return "bg-[#e8e8e8] text-[#2d2d2d]";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending":
        return "Pending";
      case "accepted":
        return "Accepted";
      case "in_progress":
        return "In Progress";
      case "completed":
        return "Completed";
      default:
        return status;
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafafa] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 md:gap-4 mb-4">
            <Logo className="h-10 md:h-14" />
            <div className="h-8 md:h-10 w-px bg-[#e8e8e8]" />
            <h1
              className="text-[24px] md:text-[36px] leading-[1.2]"
              style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}
            >
              Admin Dashboard
            </h1>
          </div>
          <p
            className="text-[16px] md:text-[20px]"
            style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
          >
            System overview and metrics
          </p>
        </div>

        <AdminOperatorQueue />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6">
            <div className="flex items-center gap-2 mb-2">
              <Navigation size={18} className="text-[#5cb89c]" />
              <span
                className="text-[14px]"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
              >
                Total Jobs
              </span>
            </div>
            <p
              className="text-[32px]"
              style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}
            >
              {stats.totalJobs}
            </p>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-[#c4c0e8]" />
              <span
                className="text-[14px]"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
              >
                Active Jobs
              </span>
            </div>
            <p
              className="text-[32px]"
              style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}
            >
              {stats.activeJobs}
            </p>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 size={18} className="text-[#5cb89c]" />
              <span
                className="text-[14px]"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
              >
                Completed
              </span>
            </div>
            <p
              className="text-[32px]"
              style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}
            >
              {stats.completedJobs}
            </p>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={18} className="text-[#5cb89c]" />
              <span
                className="text-[14px]"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
              >
                Revenue
              </span>
            </div>
            <p
              className="text-[28px]"
              style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#5cb89c" }}
            >
              ${Math.round(stats.totalRevenue)}
            </p>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6">
            <div className="flex items-center gap-2 mb-2">
              <Users size={18} className="text-[#c0d9e8]" />
              <span
                className="text-[14px]"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
              >
                Customers
              </span>
            </div>
            <p
              className="text-[32px]"
              style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}
            >
              {stats.totalCustomers}
            </p>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6">
            <div className="flex items-center gap-2 mb-2">
              <Plane size={18} className="text-[#5cb89c]" />
              <span
                className="text-[14px]"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
              >
                Operators
              </span>
            </div>
            <p
              className="text-[32px]"
              style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}
            >
              {stats.totalOperators}
            </p>
          </div>
        </div>

        {/* Pricing Tiers */}
        <div className="mb-6 md:mb-8">
          <h2
            className="text-[24px] md:text-[28px] mb-4"
            style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}
          >
            Pricing Tiers
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {Object.values(urgencyTiers).map((tier) => (
              <PricingTierCard key={tier.tier} tier={tier} onUpdate={(patch) => onUpdateTier(tier.tier, patch)} />
            ))}
          </div>
        </div>

        {/* Revenue Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-4 md:p-6">
            <h3
              className="text-[18px] md:text-[20px] mb-4"
              style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}
            >
              Revenue Breakdown
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#e8e8e8]">
                <span style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                  Flight Fees (Operators 85%)
                </span>
                <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                  ${Math.round(jobs.filter((j) => j.status === "completed").reduce((sum, j) => sum + j.flightFee * 0.85, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b border-[#e8e8e8]">
                <span style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                  Network Fee (15%)
                </span>
                <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                  ${Math.round(jobs.filter((j) => j.status === "completed").reduce((sum, j) => sum + j.flightFee * 0.15, 0))}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <span style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                    Data Processing (100%)
                  </span>
                </div>
                <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#5cb89c" }}>
                  ${Math.round(jobs.filter((j) => j.status === "completed").reduce((sum, j) => sum + (j.totalPrice - j.flightFee), 0))}
                </span>
              </div>
              <div className="flex items-center gap-2 pt-3 border-t border-[#e8e8e8]">
                <Logo className="h-4" />
                <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", fontWeight: 600, color: "#5cb89c" }}>
                  Total Revenue
                </span>
                <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "18px", fontWeight: 700, color: "#5cb89c" }}>
                  ${Math.round(stats.totalRevenue)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6">
            <h3
              className="text-[20px] mb-4"
              style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}
            >
              Quick Stats
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-[#5cb89c]" />
                <div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
                    Average Job Value
                  </p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "18px", color: "#2d2d2d" }}>
                    ${jobs.length > 0 ? Math.round(jobs.reduce((sum, j) => sum + j.totalPrice, 0) / jobs.length) : 0}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={20} className="text-[#5cb89c]" />
                <div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
                    Average Duration
                  </p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "18px", color: "#2d2d2d" }}>
                    {jobs.length > 0 ? Math.round(jobs.reduce((sum, j) => sum + j.estimatedDuration, 0) / jobs.length) : 0} min
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* All Jobs Table */}
        <div>
          <h2
            className="text-[24px] md:text-[28px] mb-4"
            style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}
          >
            All Jobs
          </h2>
          <div className="bg-white border border-[#e8e8e8] rounded-[16px] overflow-hidden">
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full min-w-[800px]">
                <thead className="bg-[#f5f5f5] border-b border-[#e8e8e8]">
                  <tr>
                    <th
                      className="text-left px-4 md:px-6 py-3 md:py-4 text-[12px] md:text-[14px]"
                      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
                    >
                      Job ID
                    </th>
                    <th
                      className="text-left px-6 py-4 text-[14px]"
                      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
                    >
                      Service Type
                    </th>
                    <th
                      className="text-left px-6 py-4 text-[14px]"
                      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
                    >
                      Urgency
                    </th>
                    <th
                      className="text-left px-6 py-4 text-[14px]"
                      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
                    >
                      Customer
                    </th>
                    <th
                      className="text-left px-6 py-4 text-[14px]"
                      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
                    >
                      Operator
                    </th>
                    <th
                      className="text-left px-6 py-4 text-[14px]"
                      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
                    >
                      Status
                    </th>
                    <th
                      className="text-left px-6 py-4 text-[14px]"
                      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
                    >
                      Total Price
                    </th>
                    <th className="text-left px-6 py-4 text-[14px]">
                      <div className="flex items-center gap-2">
                        <Logo className="h-4" />
                        <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                          Revenue
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, index) => (
                    <tr key={job.id} className={index % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}>
                      <td
                        className="px-6 py-4 text-[14px]"
                        style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}
                      >
                        #{job.id}
                      </td>
                      <td
                        className="px-6 py-4 text-[14px]"
                        style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}
                      >
                        {job.serviceType}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className="px-2 py-1 rounded text-[11px]"
                          style={{
                            fontFamily: "DM Sans, sans-serif",
                            fontWeight: 600,
                            backgroundColor: urgencyTiers[job.urgency].color,
                            color: urgencyTiers[job.urgency].textColor,
                          }}
                        >
                          {urgencyTiers[job.urgency].label}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 text-[14px]"
                        style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}
                      >
                        {job.customerName}
                      </td>
                      <td
                        className="px-6 py-4 text-[14px]"
                        style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}
                      >
                        {job.operatorName || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[12px] ${getStatusColor(job.status)}`}
                          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}
                        >
                          {getStatusLabel(job.status)}
                        </span>
                      </td>
                      <td
                        className="px-6 py-4 text-[14px]"
                        style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
                      >
                        ${job.totalPrice}
                      </td>
                      <td
                        className="px-6 py-4 text-[14px]"
                        style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#5cb89c" }}
                      >
                        ${Math.round(job.totalPrice - job.flightFee * 0.85)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
