import {
  MapPin, Star, Zap, Award, Phone, Mail, ChevronRight, Power,
} from "lucide-react";
import { SectionLabel, AvailabilityToggle } from "./OperatorShared";
import type { MeProfile } from "@stravyx/types";
import { displayOrUnset, formatPhoneForShell, shellInitials } from "@/lib/shellProfile";
import { UNSET_METRIC } from "@/lib/dashboardStats";

export function ProfileTab({
  online,
  onOnlineChange,
  availabilityLocked = false,
  onLogout,
  meProfile,
}: {
  online: boolean;
  onOnlineChange: (v: boolean) => void;
  availabilityLocked?: boolean;
  onLogout?: () => void;
  meProfile: MeProfile | null;
}) {
  const initials = shellInitials(meProfile);
  const name = displayOrUnset(meProfile?.fullName);
  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-5">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-full flex items-center justify-center">
              <span className="text-white text-[22px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>{initials}</span>
            </div>
            <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white ${online ? "bg-[#5cb89c]" : "bg-[#d0d0d0]"}`} />
          </div>
          <div>
            <p className="text-[18px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>{name}</p>
            <div className="flex items-center gap-1">
              <Star size={12} className="text-[#b0b0b0]" />
              <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                {UNSET_METRIC} · {UNSET_METRIC} flights
              </span>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-[#e8e8e8] rounded-[10px] px-4 py-3 flex items-center gap-2">
            <Phone size={14} className="text-[#5cb89c]" />
            <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#555" }}>{formatPhoneForShell(meProfile)}</span>
          </div>
          <div className="border border-[#e8e8e8] rounded-[10px] px-4 py-3 flex items-center gap-2">
            <Mail size={14} className="text-[#5cb89c]" />
            <span className="text-[13px] truncate" style={{ fontFamily: "DM Sans, sans-serif", color: "#555" }}>{displayOrUnset(meProfile?.email)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-5">
        <SectionLabel>Availability</SectionLabel>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] mb-0.5" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
              {online ? "Currently Online" : "Currently Offline"}
            </p>
            <p
              id="operator-availability-copy"
              className="text-[13px]"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
            >
              {availabilityLocked
                ? "Availability stays offline until a Stravyx admin verifies your credentials."
                : online
                  ? "You are visible to customers and receiving job requests."
                  : "You won't receive any job requests while offline."}
            </p>
          </div>
          <AvailabilityToggle
            online={online}
            onChange={onOnlineChange}
            disabled={availabilityLocked}
            describedBy="operator-availability-copy"
          />
        </div>
      </div>

      <div className="bg-white border border-[#e8e8e8] rounded-[16px] overflow-hidden">
        {[
          { icon: MapPin, label: "Service Area", value: displayOrUnset(meProfile?.serviceArea) },
          { icon: Award, label: "ARN", value: displayOrUnset(meProfile?.arn) },
          { icon: Award, label: "ReOC", value: displayOrUnset(meProfile?.reocNumber) },
          { icon: Zap, label: "Equipment", value: "Not set" },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#f4f4f4] last:border-b-0">
            <div className="w-8 h-8 bg-[#e8f5f0] rounded-[8px] flex items-center justify-center flex-shrink-0">
              <Icon size={14} className="text-[#5cb89c]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>{label}</p>
              <p className="text-[13px] truncate" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>{value}</p>
            </div>
            <ChevronRight size={14} className="text-[#d0d0d0] flex-shrink-0" />
          </div>
        ))}
      </div>

      <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-[#e8e8e8] rounded-[14px] hover:bg-[#fff5f5] hover:border-[#e05555] transition-colors">
        <Power size={15} style={{ color: "#e05555" }} />
        <span className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#e05555" }}>Sign Out</span>
      </button>
    </div>
  );
}
