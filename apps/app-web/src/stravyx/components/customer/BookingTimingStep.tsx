import { Clock } from "lucide-react";
import { UrgencyTier, UrgencyPricing } from "../../types";

export function TimingStep({
  urgency, setUrgency, scheduledDate, setScheduledDate, scheduledTime, setScheduledTime, urgencyTiers,
}: {
  urgency: UrgencyTier; setUrgency: (u: UrgencyTier) => void;
  scheduledDate: string; setScheduledDate: (d: string) => void;
  scheduledTime: string; setScheduledTime: (t: string) => void;
  urgencyTiers: Record<UrgencyTier, UrgencyPricing>;
}) {
  return (
    <div>
      <h2 className="text-[24px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
        When do you need it?
      </h2>
      <p className="text-[15px] mb-6" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
        Choose how quickly you need an operator on site.
      </p>

      <div className="mb-6">
        <p className="text-[12px] mb-3" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          Response Time
        </p>
        <div className="grid grid-cols-2 gap-2">
          {Object.values(urgencyTiers).map((tier) => (
            <button
              key={tier.tier}
              onClick={() => setUrgency(tier.tier)}
              className={`p-4 rounded-[14px] text-left border-2 transition-all ${urgency === tier.tier ? "border-[#5cb89c] ring-2 ring-[#5cb89c]/20" : "border-transparent"} ${tier.tier === "scheduled" && urgency === "scheduled" ? "col-span-2" : ""}`}
              style={{ backgroundColor: tier.color }}
            >
              <div
                className="inline-block px-2 py-0.5 rounded text-[9px] mb-2"
                style={{
                  fontFamily: "DM Sans, sans-serif", fontWeight: 700,
                  backgroundColor: tier.tier === "immediate" ? "#d85a30" : "rgba(255,255,255,0.35)",
                  color: tier.tier === "immediate" ? "#fff" : tier.textColor,
                }}
              >
                {tier.label}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={13} style={{ color: tier.textColor, opacity: 0.75 }} />
                <span className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: tier.textColor }}>{tier.timeframe}</span>
              </div>
              {tier.tier === "scheduled" && urgency === "scheduled" && (
                <div className="mt-4 grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                  <div>
                    <label className="block text-[11px] mb-1.5" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: tier.textColor, opacity: 0.8 }}>
                      Preferred date <span style={{ color: "#d85a30" }}>*</span>
                    </label>
                    <input
                      type="date"
                      value={scheduledDate}
                      min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none focus:border-[#5cb89c] bg-white"
                      style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d", borderColor: scheduledDate ? "#5cb89c" : "#d0d0d0" }}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] mb-1.5" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: tier.textColor, opacity: 0.8 }}>
                      Preferred time <span style={{ color: "#d85a30" }}>*</span>
                    </label>
                    <input
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-[10px] border text-[13px] focus:outline-none focus:border-[#5cb89c] bg-white"
                      style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d", borderColor: scheduledTime ? "#5cb89c" : "#d0d0d0" }}
                    />
                  </div>
                  {(!scheduledDate || !scheduledTime) && (
                    <p className="col-span-2 text-[11px] mt-0.5" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
                      Please select a date and time to continue.
                    </p>
                  )}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
