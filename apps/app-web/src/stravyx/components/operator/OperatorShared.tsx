import {
  LayoutDashboard, Activity, ShieldCheck, UserCircle2, Wifi, WifiOff,
} from "lucide-react";

export type Tab = "dashboard" | "activity" | "verification" | "profile";

// ─── Shared components ────────────────────────────────────────────────────────

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] mb-3" style={{
      fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#b0b0b0",
      textTransform: "uppercase", letterSpacing: "0.07em",
    }}>
      {children}
    </p>
  );
}

// ─── Availability toggle ──────────────────────────────────────────────────────

export function AvailabilityToggle({
  online,
  onChange,
  disabled = false,
  describedBy,
}: {
  online: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  describedBy?: string;
}) {
  const label = online ? "ONLINE" : "OFFLINE";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={online}
      aria-describedby={describedBy}
      aria-label={disabled ? `Availability ${label}. Verification required to go online.` : `Availability ${label}`}
      onClick={() => {
        if (disabled) return;
        onChange(!online);
      }}
      className="flex items-center gap-2.5 px-4 py-2 rounded-full border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        borderColor: online ? "#5cb89c" : "#e0e0e0",
        backgroundColor: online ? "#e8f5f0" : "#f5f5f5",
      }}
    >
      {online
        ? <Wifi size={15} style={{ color: "#5cb89c" }} aria-hidden="true" />
        : <WifiOff size={15} style={{ color: "#b0b0b0" }} aria-hidden="true" />}
      <span className="text-[13px]" style={{
        fontFamily: "DM Sans, sans-serif", fontWeight: 700,
        color: online ? "#2d6b53" : "#b0b0b0",
      }}>
        {label}
      </span>
      {online && <span className="w-2 h-2 rounded-full bg-[#5cb89c] animate-pulse" aria-hidden="true" />}
    </button>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

export const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "dashboard",    label: "Dashboard",    Icon: LayoutDashboard },
  { id: "activity",     label: "Activity",     Icon: Activity },
  { id: "verification", label: "Verify ID",    Icon: ShieldCheck },
  { id: "profile",      label: "Profile",      Icon: UserCircle2 },
];

export function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  return (
    <>
      {/* Desktop — left sidebar nav */}
      <div className="hidden md:flex flex-col gap-1">
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors text-left w-full ${isActive ? "bg-[#e8f5f0]" : "hover:bg-[#f5f5f5]"}`}
            >
              <Icon size={17} style={{ color: isActive ? "#5cb89c" : "#737373" }} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: isActive ? 600 : 400, color: isActive ? "#2d6b53" : "#2d2d2d" }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile — bottom tab bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#e8e8e8] flex z-30" style={{ paddingBottom: "env(safe-area-inset-bottom,0px)" }}>
        {TABS.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button key={id} onClick={() => onChange(id)} className="flex-1 flex flex-col items-center gap-1 py-3">
              <Icon size={22} style={{ color: isActive ? "#5cb89c" : "#b0b0b0" }} strokeWidth={isActive ? 2.2 : 1.8} />
              <span className="text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: isActive ? 600 : 400, color: isActive ? "#5cb89c" : "#b0b0b0" }}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
