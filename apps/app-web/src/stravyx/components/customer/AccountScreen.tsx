import { useState } from "react";
import {
  User, CreditCard, Bell, Shield, HelpCircle, LogOut,
  ChevronRight, Phone, Mail, MapPin,
  Moon, Globe, Lock, FileText, MessageCircle, AlertTriangle,
} from "lucide-react";
import type { MeProfile } from "@stravyx/types";
import {
  displayOrUnset,
  formatMemberSince,
  formatPhoneForShell,
  shellInitials,
} from "@/lib/shellProfile";
import { formatAudWhole, type CustomerDashboardStats } from "@/lib/dashboardStats";

interface AccountScreenProps {
  onLogout: () => void;
  pushEnabled: boolean;
  onPushToggle: (nextValue: boolean) => Promise<void>;
  pushMessage: string | null;
  meProfile: MeProfile | null;
  stats: CustomerDashboardStats;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative w-11 h-6 rounded-full flex-shrink-0"
      style={{
        backgroundColor: value ? "#5cb89c" : "#d0d0d0",
        transition: "background-color 0.22s ease",
      }}
    >
      <span
        className="absolute top-[3px] w-[18px] h-[18px] bg-white rounded-full shadow-md"
        style={{
          left: 0,
          transform: value ? "translateX(21px)" : "translateX(3px)",
          transition: "transform 0.22s ease",
        }}
      />
    </button>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] mb-2 px-1"
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

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-[14px] border border-[#e8e8e8] overflow-hidden mb-4">
      {children}
    </div>
  );
}

function Row({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  toggle,
  onToggleChange,
  danger,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value?: string;
  toggle?: boolean;
  onToggleChange?: (v: boolean) => void;
  danger?: boolean;
}) {
  return (
    <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#fafafa] transition-colors border-b border-[#f4f4f4] last:border-b-0 cursor-pointer">
      <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
        <Icon size={15} style={{ color: iconColor }} />
      </div>
      <span className="flex-1 text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, color: danger ? "#e05555" : "#2d2d2d" }}>
        {label}
      </span>
      {value && (
        <span className="text-[13px] mr-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
          {value}
        </span>
      )}
      {toggle !== undefined && onToggleChange ? (
        <Toggle value={toggle} onChange={onToggleChange} />
      ) : (
        <ChevronRight size={15} className="text-[#d0d0d0] flex-shrink-0" />
      )}
    </div>
  );
}

// ─── Profile card (shared between mobile header and desktop sidebar) ──────────

function ProfileCard({
  compact = false,
  onLogout,
  meProfile,
  stats,
}: {
  compact?: boolean;
  onLogout?: () => void;
  meProfile: MeProfile | null;
  stats: CustomerDashboardStats;
}) {
  const initials = shellInitials(meProfile);
  const name = displayOrUnset(meProfile?.fullName);
  return (
    <div className={`bg-white rounded-[16px] border border-[#e8e8e8] overflow-hidden ${compact ? "" : "mb-4"}`}>
      <div className="p-5">
        <div className="flex items-center gap-4 mb-4">
          <div className={`${compact ? "w-16 h-16" : "w-20 h-20"} bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-full flex items-center justify-center`}>
            <span className={`${compact ? "text-[22px]" : "text-[28px]"} text-white`} style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>
              {initials}
            </span>
          </div>
          <div>
            <p className="text-[18px] mb-0.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              {name}
            </p>
            <div className="flex items-center gap-1 mb-1.5">
              <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "12px", color: "#737373" }}>
                Avg rating {stats.avgRating}
              </span>
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, backgroundColor: "#e8f5f0", color: "#2d6b53" }}>
              Customer
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 divide-x divide-[#f0f0f0] pt-4 border-t border-[#f0f0f0]">
          {[
            { label: "Total Spent", value: formatAudWhole(stats.totalSpent) },
            { label: "Avg Rating", value: stats.avgRating },
            { label: "Since", value: formatMemberSince(meProfile?.createdAt) },
          ].map((s) => (
            <div key={s.label} className="text-center px-2">
              <p className="text-[16px] mb-0.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
                {s.value}
              </p>
              <p className="text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {onLogout && (
        <div className="border-t border-[#f0f0f0]">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-3 hover:bg-[#fff5f5] transition-colors"
          >
            <LogOut size={15} style={{ color: "#e05555" }} />
            <span className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#e05555" }}>
              Log Out
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Settings groups ──────────────────────────────────────────────────────────

function SettingsGroups({
  push, onPushToggle, email, setEmail, sms, setSms,
  dark, setDark, biometrics, setBiometrics, meProfile,
}: {
  push: boolean; onPushToggle: (v: boolean) => Promise<void>;
  email: boolean; setEmail: (v: boolean) => void;
  sms: boolean; setSms: (v: boolean) => void;
  dark: boolean; setDark: (v: boolean) => void;
  biometrics: boolean; setBiometrics: (v: boolean) => void;
  meProfile: MeProfile | null;
}) {
  return (
    <>
      <div>
        <SectionTitle>Personal Information</SectionTitle>
        <SettingsCard>
          <Row icon={User} iconBg="#e8f5f0" iconColor="#5cb89c" label="Full Name" value={displayOrUnset(meProfile?.fullName)} />
          <Row icon={Mail} iconBg="#e8f0f8" iconColor="#7070d0" label="Email" value={displayOrUnset(meProfile?.email)} />
          <Row icon={Phone} iconBg="#f5f0e8" iconColor="#d09030" label="Phone" value={formatPhoneForShell(meProfile)} />
          <Row icon={MapPin} iconBg="#f5e8e8" iconColor="#d05050" label="Default Location" value={displayOrUnset(meProfile?.defaultLocation)} />
        </SettingsCard>
      </div>

      <div>
        <SectionTitle>Payment</SectionTitle>
        <SettingsCard>
          <Row icon={CreditCard} iconBg="#e8f5f0" iconColor="#5cb89c" label="Payment Methods" value="Not connected" />
          <Row icon={FileText} iconBg="#f0f0ff" iconColor="#7070d0" label="Billing History" />
        </SettingsCard>
      </div>

      <div>
        <SectionTitle>Notifications</SectionTitle>
        <SettingsCard>
          <Row
            icon={Bell}
            iconBg="#fff8e8"
            iconColor="#e8a020"
            label="Push Notifications"
            toggle={push}
            onToggleChange={(nextValue) => {
              void onPushToggle(nextValue);
            }}
          />
          <Row icon={Mail} iconBg="#e8f0f8" iconColor="#7070d0" label="Email Updates" toggle={email} onToggleChange={setEmail} />
          <Row icon={MessageCircle} iconBg="#f0ffe8" iconColor="#5cb89c" label="SMS Alerts" toggle={sms} onToggleChange={setSms} />
        </SettingsCard>
      </div>

      <div>
        <SectionTitle>Preferences</SectionTitle>
        <SettingsCard>
          <Row icon={Moon} iconBg="#1c1c1c" iconColor="#ffffff" label="Dark Mode" toggle={dark} onToggleChange={setDark} />
          <Row icon={Globe} iconBg="#e8f0f8" iconColor="#7070d0" label="Language" value="English (AU)" />
        </SettingsCard>
      </div>

      <div>
        <SectionTitle>Security</SectionTitle>
        <SettingsCard>
          <Row icon={Lock} iconBg="#e8f5f0" iconColor="#5cb89c" label="Face ID / Biometrics" toggle={biometrics} onToggleChange={setBiometrics} />
          <Row icon={Shield} iconBg="#f0ffe8" iconColor="#5cb89c" label="Change Password" />
          <Row icon={AlertTriangle} iconBg="#fff8e8" iconColor="#e8a020" label="Two-Factor Authentication" value="On" />
        </SettingsCard>
      </div>

      <div>
        <SectionTitle>Support</SectionTitle>
        <SettingsCard>
          <Row icon={HelpCircle} iconBg="#e8f0f8" iconColor="#7070d0" label="Help Centre" />
          <Row icon={MessageCircle} iconBg="#e8f5f0" iconColor="#5cb89c" label="Contact Support" />
          <Row icon={FileText} iconBg="#f5f5f5" iconColor="#737373" label="Terms & Privacy" />
        </SettingsCard>
      </div>
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function AccountScreen({
  onLogout,
  pushEnabled,
  onPushToggle,
  pushMessage,
  meProfile,
  stats,
}: AccountScreenProps) {
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);
  const [dark, setDark] = useState(false);
  const [biometrics, setBiometrics] = useState(true);

  const toggleProps = {
    push: pushEnabled,
    onPushToggle,
    email,
    setEmail,
    sms,
    setSms,
    dark,
    setDark,
    biometrics,
    setBiometrics,
    meProfile,
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafafa]">
      {/* MOBILE: single-column stacked layout */}
      <div className="md:hidden px-4 pt-6 pb-28">
        <h1 className="text-[26px] mb-4" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
          Account
        </h1>
        <ProfileCard compact onLogout={onLogout} meProfile={meProfile} stats={stats} />
        <div className="mt-4">
          <SettingsGroups {...toggleProps} />
          {pushMessage ? (
            <p
              className="mt-3 px-1 text-[12px]"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
            >
              {pushMessage}
            </p>
          ) : null}
        </div>
        <p className="text-center text-[11px] mt-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#d0d0d0" }}>
          Stravyx v2.1.0 · Build 2026.06.03
        </p>
      </div>

      {/* DESKTOP: two-column layout */}
      <div className="hidden md:flex gap-6 px-8 pt-6 pb-8 min-h-full items-start">
        {/* Left column — profile + quick links */}
        <div className="w-[280px] xl:w-[300px] flex-shrink-0 sticky top-0">
          <ProfileCard onLogout={onLogout} meProfile={meProfile} stats={stats} />

          {/* Account summary card */}
          <div className="bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-[14px] p-4 text-white mt-4">
            <p className="text-[12px] mb-2 opacity-80" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Membership
            </p>
            <p className="text-[18px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>Pro Customer</p>
            <p className="text-[12px] opacity-80" style={{ fontFamily: "DM Sans, sans-serif" }}>
              Priority dispatch · Dedicated support · Analytics dashboard
            </p>
          </div>

          <p className="text-center text-[11px] mt-4" style={{ fontFamily: "DM Sans, sans-serif", color: "#d0d0d0" }}>
            Stravyx v2.1.0 · Build 2026.06.03
          </p>
        </div>

        {/* Right column — settings */}
        <div className="flex-1 min-w-0">
          <SettingsGroups {...toggleProps} />
          {pushMessage ? (
            <p
              className="mt-1 px-1 text-[12px]"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}
            >
              {pushMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
