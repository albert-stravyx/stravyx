import type { ReactNode } from "react";
import { Zap } from "lucide-react";
import type { UrgencyPricing, UrgencyTier } from "../types";

export function UrgencyBadge({
  tier,
  urgency,
  icon,
  className = "",
}: {
  tier: UrgencyPricing;
  urgency?: UrgencyTier;
  icon?: ReactNode;
  className?: string;
}) {
  const showZap = urgency === "immediate" && icon === undefined;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] whitespace-nowrap ${className}`}
      style={{ backgroundColor: tier.color, color: tier.textColor, fontFamily: "DM Sans, sans-serif", fontWeight: 700 }}
    >
      {showZap ? <Zap size={10} /> : icon}
      {tier.label}
    </span>
  );
}
