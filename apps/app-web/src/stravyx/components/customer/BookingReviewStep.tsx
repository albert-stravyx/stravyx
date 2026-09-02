import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { UrgencyTier, UrgencyPricing } from "../../types";
import { SERVICES } from "./bookingData";
import { PLATFORM_DURATION_MINUTES, formatEstimatedFlightTime } from "@/lib/platformDuration";

function formatPreferredSlot(date: string, time: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return `${date} · ${time}`;
  }
  return new Intl.DateTimeFormat("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(year, month - 1, day, hour, minute));
}

export function ReviewStep({
  serviceId, location, brief, setBrief, urgency, onConfirm, urgencyTiers,
  scheduledDate, scheduledTime,
}: {
  serviceId: string; location: string; brief: string; setBrief: (v: string) => void;
  urgency: UrgencyTier; onConfirm: () => void;
  urgencyTiers: Record<UrgencyTier, UrgencyPricing>;
  scheduledDate: string; scheduledTime: string;
}) {
  const svc = SERVICES.find((s) => s.id === serviceId);
  const tier = urgencyTiers[urgency];
  const responseTimeValue = urgency === "scheduled" && scheduledDate && scheduledTime
    ? `${tier.label} · ${formatPreferredSlot(scheduledDate, scheduledTime)}`
    : `${tier.label} · ${tier.timeframe}`;
  const [networkPrice, setNetworkPrice] = useState<number | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { api } = await import("@/lib/api");
        const q = await api.quote({
          durationMinutes: PLATFORM_DURATION_MINUTES,
          urgency,
          equipmentFactor: 1,
        });
        if (!cancelled) {
          setNetworkPrice(Math.round(q.networkPriceCents) / 100);
          setQuoteError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setQuoteError(e instanceof Error ? e.message : "Quote failed");
          setNetworkPrice(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [urgency, serviceId]);

  return (
    <div>
      <h2 className="text-[24px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
        Review your booking
      </h2>
      <p className="text-[15px] mb-6" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
        Everything look right? You can edit the brief before confirming.
      </p>

      {/* Summary rows */}
      <div className="bg-white border border-[#e8e8e8] rounded-[16px] overflow-hidden mb-4">
        {[
          { label: "Service", value: svc?.name ?? serviceId },
          { label: "Location", value: location },
          { label: "Response Time", value: responseTimeValue },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start justify-between px-4 py-3 border-b border-[#f4f4f4] last:border-b-0">
            <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{label}</span>
            <span className="text-[13px] text-right max-w-[60%]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>{value}</span>
          </div>
        ))}
      </div>
      <p className="text-[13px] mb-4" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
        {formatEstimatedFlightTime(PLATFORM_DURATION_MINUTES)}
      </p>

      {/* Editable brief */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={14} className="text-[#5cb89c]" />
          <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#5cb89c", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            AI-Generated Job Brief
          </p>
        </div>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 border border-[#5cb89c]/40 bg-[#f9fffe] rounded-[12px] focus:outline-none focus:border-[#5cb89c] transition-colors resize-none text-[14px]"
          style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}
        />
        <p className="text-[11px] mt-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
          This brief is sent directly to your operator. Edit it if needed.
        </p>
      </div>

      {/* Network Price only — no Layer 1 / ×1.4 in the customer UI */}
      <div className="bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-[16px] p-5 text-white mb-4">
        <div className="flex justify-between items-center">
          <span className="opacity-90 text-[16px]" style={{ fontFamily: "DM Sans, sans-serif" }}>Network Price</span>
          <span className="text-[32px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>
            {networkPrice == null ? "…" : `$${networkPrice}`}
          </span>
        </div>
        <p className="text-[12px] opacity-80 mt-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
          All-in price for this mission. Mock pay on confirm.
        </p>
        {quoteError && (
          <p className="text-[12px] mt-2" style={{ fontFamily: "DM Sans, sans-serif" }}>{quoteError}</p>
        )}
      </div>

      <button
        onClick={onConfirm}
        disabled={networkPrice == null}
        className="w-full bg-[#d85a30] text-white py-4 rounded-[14px] hover:bg-[#b8481f] transition-all shadow-[0px_4px_14px_rgba(216,90,48,0.35)] disabled:opacity-50"
        style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: "16px" }}
      >
        Confirm Booking
      </button>
    </div>
  );
}
