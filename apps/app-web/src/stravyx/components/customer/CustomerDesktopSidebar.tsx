import { useState } from "react";
import { Plus, LogOut, ChevronRight, ChevronLeft } from "lucide-react";
import { Logo } from "../Logo";
import { UrgencyTier, UrgencyPricing } from "../../types";
import { Tab, SERVICES, TABS } from "./customerHomeData";
import type { MeProfile } from "@stravyx/types";
import { displayOrUnset, shellInitials } from "@/lib/shellProfile";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] mb-2"
      style={{
        fontFamily: "DM Sans, sans-serif",
        fontWeight: 700,
        color: "#b0b0b0",
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}
    >
      {children}
    </p>
  );
}

export function DesktopSidebar({
  activeTab,
  setActiveTab,
  onBook,
  onLogout,
  pendingCount,
  unreadNotifications,
  urgencyTiers,
  meProfile,
}: {
  activeTab: Tab;
  setActiveTab: (t: Tab) => void;
  onBook: () => void;
  onLogout: () => void;
  pendingCount: number;
  unreadNotifications: number;
  urgencyTiers: Record<UrgencyTier, UrgencyPricing>;
  meProfile: MeProfile | null;
}) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <aside
      className={`hidden md:flex flex-col bg-white border-r border-[#e8e8e8] flex-shrink-0 overflow-hidden transition-all duration-300 ${
        collapsed ? "w-[64px]" : "w-[270px] xl:w-[300px]"
      }`}
    >
      {/* ── Header: logo + profile + toggle ── */}
      <div className={`border-b border-[#f0f0f0] flex-shrink-0 ${collapsed ? "px-3 pt-4 pb-3" : "px-5 pt-6 pb-4"}`}>
        {collapsed ? (
          /* Collapsed: chevron centred on top, logo below in place of avatar */
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={() => setCollapsed(false)}
              className="w-7 h-7 rounded-full bg-[#f5f5f5] hover:bg-[#e8e8e8] flex items-center justify-center transition-colors"
              title="Expand sidebar"
            >
              <ChevronRight size={14} className="text-[#737373]" />
            </button>
            <Logo className="h-9" />
          </div>
        ) : (
          /* Expanded: logo left, chevron right, then profile row */
          <>
            <div className="flex items-center justify-between mb-4">
              <Logo className="h-12" />
              <button
                onClick={() => setCollapsed(true)}
                className="w-7 h-7 rounded-full bg-[#f5f5f5] hover:bg-[#e8e8e8] flex items-center justify-center transition-colors flex-shrink-0"
                title="Collapse sidebar"
              >
                <ChevronLeft size={14} className="text-[#737373]" />
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[12px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>{shellInitials(meProfile)}</span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] truncate" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                  {displayOrUnset(meProfile?.fullName)}
                </p>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, backgroundColor: "#e8f5f0", color: "#2d6b53" }}>
                  Customer
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Book a Job CTA ── */}
      <div className={`border-b border-[#f0f0f0] flex-shrink-0 ${collapsed ? "px-3 py-3 flex justify-center" : "px-5 py-4"}`}>
        {collapsed ? (
          <button
            onClick={() => onBook()}
            title="Book a Job"
            className="w-10 h-10 bg-[#d85a30] text-white rounded-[10px] hover:bg-[#b8481f] transition-all flex items-center justify-center shadow-[0px_4px_8px_rgba(216,90,48,0.3)]"
          >
            <Plus size={18} />
          </button>
        ) : (
          <button
            onClick={() => onBook()}
            className="w-full bg-[#d85a30] text-white px-4 py-3 rounded-[12px] hover:bg-[#b8481f] transition-all flex items-center justify-center gap-2 shadow-[0px_4px_12px_rgba(216,90,48,0.3)]"
            style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "15px" }}
          >
            <Plus size={18} />
            Book a Job
          </button>
        )}
      </div>

      {/* ── Navigation ── */}
      <div className={`border-b border-[#f0f0f0] flex-shrink-0 ${collapsed ? "px-2 py-3" : "px-5 py-4"}`}>
        {!collapsed && <SectionLabel>Navigation</SectionLabel>}
        <nav className="space-y-1">
          {TABS.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            const badge = id === "notifications" ? unreadNotifications : id === "jobs" ? pendingCount : 0;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                title={collapsed ? label : undefined}
                className={`w-full flex items-center rounded-[10px] transition-colors ${
                  collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5 text-left"
                } ${isActive ? "bg-[#e8f5f0]" : "hover:bg-[#f5f5f5]"}`}
              >
                <div className="relative flex-shrink-0">
                  <Icon size={19} style={{ color: isActive ? "#5cb89c" : "#737373" }} strokeWidth={isActive ? 2.2 : 1.8} />
                  {/* Badge dot when collapsed */}
                  {collapsed && badge > 0 && (
                    <span
                      className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 rounded-full border border-white"
                      style={{ backgroundColor: id === "notifications" ? "#d85a30" : "#5cb89c" }}
                    />
                  )}
                </div>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: isActive ? 600 : 400, color: isActive ? "#2d6b53" : "#2d2d2d" }}>
                      {label}
                    </span>
                    {badge > 0 && (
                      <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white" style={{ backgroundColor: id === "notifications" ? "#d85a30" : "#5cb89c", fontWeight: 700 }}>
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Quick Services (expanded only) ── */}
      {!collapsed && (
        <div className="px-5 py-4 border-b border-[#f0f0f0] flex-shrink-0">
          <SectionLabel>Quick Book</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {SERVICES.map(({ id, name, icon: Icon, color }) => (
              <button
                key={id}
                onClick={onBook}
                className="flex flex-col items-center gap-1.5 p-3 rounded-[10px] border border-[#e8e8e8] hover:border-[#5cb89c] hover:bg-[#f9fffe] transition-all"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <span className="text-[11px] leading-tight text-center" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, color: "#2d2d2d" }}>
                  {name}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Response Times (expanded only) ── */}
      {!collapsed && (
        <div className="px-5 py-4 flex-1 overflow-y-auto">
          <SectionLabel>Response Times</SectionLabel>
          <div className="space-y-1.5">
            {Object.values(urgencyTiers).map((tier) => (
              <div key={tier.tier} className="flex items-center justify-between px-3 py-2 rounded-[8px]" style={{ backgroundColor: tier.color }}>
                <div>
                  <div className="text-[9px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: tier.textColor, opacity: 0.75 }}>
                    {tier.label}
                  </div>
                  <div className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: tier.textColor }}>
                    {tier.timeframe}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Spacer when collapsed ── */}
      {collapsed && <div className="flex-1" />}

      {/* ── Logout ── */}
      <div className={`border-t border-[#f0f0f0] flex-shrink-0 ${collapsed ? "px-2 py-3 flex justify-center" : "px-5 py-4"}`}>
        {collapsed ? (
          <button
            onClick={onLogout}
            title="Log Out"
            className="w-10 h-10 rounded-[10px] hover:bg-[#fff5f5] flex items-center justify-center transition-colors"
          >
            <LogOut size={16} style={{ color: "#e05555" }} />
          </button>
        ) : (
          <>
            <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[10px] hover:bg-[#fff5f5] transition-colors">
              <LogOut size={16} style={{ color: "#e05555" }} />
              <span className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, color: "#e05555" }}>Log Out</span>
            </button>
            <p className="text-center text-[11px] mt-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#d0d0d0" }}>Stravyx v2.1.0</p>
          </>
        )}
      </div>
    </aside>
  );
}
