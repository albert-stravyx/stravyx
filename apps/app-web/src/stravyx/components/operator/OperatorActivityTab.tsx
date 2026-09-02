import { useState } from "react";
import {
  TrendingUp, ChevronRight, Wallet, ArrowDownToLine, Info,
} from "lucide-react";
import { SectionLabel } from "./OperatorShared";
import { CashOutModal, CashOutSuccess, CashOutOption } from "./OperatorCashOut";
import {
  CASH_OUT_PENDING_DOLLARS,
  formatAudWhole,
  type WeeklyEarnPoint,
} from "@/lib/dashboardStats";

export interface ActivityJobRow {
  id: string;
  service: string;
  location: string;
  date: string;
  earn: number;
  status: string;
  duration: number;
}

export function ActivityTab({
  recentJobs,
  weeklyEarnings,
  thisWeekEarn,
  thisMonthEarn,
  highlightDay,
}: {
  recentJobs: ActivityJobRow[];
  weeklyEarnings: WeeklyEarnPoint[];
  thisWeekEarn: number;
  thisMonthEarn: number;
  highlightDay?: string;
}) {
  const [showCashOut, setShowCashOut] = useState(false);
  const [cashOutDone, setCashOutDone] = useState<CashOutOption | null>(null);
  const pendingBalance = CASH_OUT_PENDING_DOLLARS;

  const handleConfirm = (option: CashOutOption) => {
    setShowCashOut(false);
    setCashOutDone(option);
  };

  const maxEarn = Math.max(...weeklyEarnings.map((w) => w.amount), 1);

  return (
    <div className="space-y-6">
      {showCashOut && (
        <CashOutModal
          balance={pendingBalance}
          onClose={() => setShowCashOut(false)}
          onConfirm={handleConfirm}
        />
      )}
      {cashOutDone && (
        <CashOutSuccess
          option={cashOutDone}
          balance={pendingBalance}
          onClose={() => setCashOutDone(null)}
        />
      )}

      <div
        className="rounded-[18px] p-5 text-white relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1c1c2e 0%, #2d3a5c 60%, #1a4a6e 100%)" }}
      >
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          {[0, 1, 2].map((i) => (
            <div key={i} className="absolute rounded-full border border-white/30" style={{ width: (i + 1) * 100, height: (i + 1) * 100, top: "50%", right: "-20px", transform: "translateY(-50%)" }} />
          ))}
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Wallet size={15} className="text-white/70" />
            <p className="text-[12px] uppercase tracking-widest" style={{ fontFamily: "DM Sans, sans-serif", color: "rgba(255,255,255,0.6)" }}>Your Earnings</p>
          </div>
          <p className="text-[40px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>
            {formatAudWhole(pendingBalance)}
          </p>
          <p className="text-[12px] mb-4 opacity-70" style={{ fontFamily: "DM Sans, sans-serif" }}>
            Pending cash-out is $0 — payouts are not connected (Stripe is not wired).
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => pendingBalance > 0 && setShowCashOut(true)}
              disabled={pendingBalance === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-[10px] transition-all"
              style={{
                backgroundColor: pendingBalance > 0 ? "#d85a30" : "rgba(255,255,255,0.1)",
                fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: "13px", color: "white",
                opacity: pendingBalance === 0 ? 0.5 : 1,
                boxShadow: pendingBalance > 0 ? "0 4px 12px rgba(216,90,48,0.4)" : "none",
              }}
            >
              <ArrowDownToLine size={14} />
              Cash Out
            </button>
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-[10px]" style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
              <Info size={14} className="text-white/70" />
              <span className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>
                Not connected
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "This Week",  value: formatAudWhole(thisWeekEarn),  color: "#5cb89c" },
          { label: "This Month", value: formatAudWhole(thisMonthEarn), color: "#2d2d2d" },
          { label: "Total Jobs", value: String(recentJobs.length),     color: "#7070d0" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white border border-[#e8e8e8] rounded-[14px] p-4">
            <p className="text-[11px] mb-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</p>
            <p className="text-[22px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-[#5cb89c]" />
          <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>Earnings This Week</p>
        </div>
        <div className="flex items-end gap-2 h-28">
          {weeklyEarnings.map(({ day, amount }) => (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                {amount >= 1000 ? `$${(amount / 1000).toFixed(1)}k` : `$${amount}`}
              </span>
              <div
                className="w-full rounded-t-[6px] transition-all"
                style={{
                  height: `${(amount / maxEarn) * 80}px`,
                  backgroundColor: day === highlightDay ? "#5cb89c" : "#e8f5f0",
                  minHeight: "4px",
                }}
              />
              <span className="text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>{day}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Recent Jobs</SectionLabel>

        {recentJobs.length === 0 ? (
          <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-10 text-center">
            <p className="text-[15px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
              Completed missions will show up here.
            </p>
          </div>
        ) : (
        <>
        <div className="hidden md:block bg-white border border-[#e8e8e8] rounded-[16px] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f0f0f0]">
                {["Service", "Location", "Date", "Duration", "Earned", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentJobs.map((job) => (
                <tr key={job.id} className="border-b border-[#f8f8f8] hover:bg-[#fafafa] last:border-b-0">
                  <td className="px-4 py-3"><p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>{job.service}</p></td>
                  <td className="px-4 py-3 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{job.location}</td>
                  <td className="px-4 py-3 text-[13px] whitespace-nowrap" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{job.date}</td>
                  <td className="px-4 py-3 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{job.duration} min</td>
                  <td className="px-4 py-3 text-[15px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#5cb89c" }}>${job.earn}</td>
                  <td className="px-4 py-3">
                    <button className="flex items-center gap-1 text-[12px] hover:text-[#5cb89c] transition-colors" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
                      Receipt <ChevronRight size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-2">
          {recentJobs.map((job) => (
            <div key={job.id} className="bg-white border border-[#e8e8e8] rounded-[14px] p-4 flex items-start justify-between">
              <div>
                <p className="text-[14px] mb-0.5" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>{job.service}</p>
                <p className="text-[12px] mb-0.5" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{job.location}</p>
                <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>{job.date} · {job.duration} min</p>
              </div>
              <p className="text-[18px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#5cb89c" }}>${job.earn}</p>
            </div>
          ))}
        </div>
        </>
        )}
      </div>
    </div>
  );
}
