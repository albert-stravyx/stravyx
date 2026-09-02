"use client";

import { useState } from "react";
import { ShieldCheck, FileText, Lock, CheckCircle2 } from "lucide-react";
import { Logo } from "./Logo";
import { COLORS, FONT_BODY, FONT_DISPLAY } from "../theme";

interface AccessPopupProps {
  onAccept: () => void;
}

type Tab = "terms" | "privacy";

export const ACCESS_STORAGE_KEY = "stravyx_access_accepted";

const TERMS_TEXT = `By using Stravyx you agree to book and receive certified drone services in good faith, provide accurate site and access information for each job, and treat operators and customers with respect. Stravyx connects independent, certified drone operators with customers — it does not itself operate aircraft. Pricing shown at booking is indicative and confirmed at review. Misuse of the platform, including unsafe or unlawful job requests, may result in account suspension.`;

const PRIVACY_TEXT = `Stravyx collects the information you provide when booking a job — contact details, job location, and mission requirements — to match you with an operator and coordinate the mission. Location data is used only for job dispatch and is not sold to third parties. Payment details are handled by our payment processor and are never stored on Stravyx servers. You can request a copy or deletion of your data at any time from Account Settings.`;

export function AccessPopup({ onAccept }: AccessPopupProps) {
  const [tab, setTab] = useState<Tab>("terms");
  const [agreed, setAgreed] = useState(false);
  const [showDeclineNotice, setShowDeclineNotice] = useState(false);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="access-popup-title"
    >
      <div className="bg-white w-full md:max-w-[520px] md:mx-4 rounded-t-[24px] md:rounded-[20px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="px-6 pt-6 pb-4 border-b border-[#f0f0f0] flex-shrink-0">
          <Logo className="h-9 mb-4" />
          <div className="flex items-center gap-2.5 mb-1.5">
            <ShieldCheck size={18} style={{ color: COLORS.brand.green }} />
            <p id="access-popup-title" className="text-[19px]" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: COLORS.ink.primary }}>
              Before you continue
            </p>
          </div>
          <p className="text-[13px]" style={{ fontFamily: FONT_BODY, color: COLORS.ink.muted }}>
            Please review and accept our Terms of Use and Data Privacy Policy to access Stravyx.
          </p>
        </div>

        <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
          {([
            { id: "terms" as Tab, label: "Terms of Use", icon: FileText },
            { id: "privacy" as Tab, label: "Data Privacy", icon: Lock },
          ]).map(({ id, label, icon: Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-[12px] transition-colors"
                style={{
                  fontFamily: FONT_BODY, fontWeight: 700,
                  backgroundColor: active ? COLORS.brand.greenSoft : "transparent",
                  color: active ? COLORS.brand.greenDark : COLORS.ink.faint,
                }}
              >
                <Icon size={13} />
                {label}
              </button>
            );
          })}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          <p className="text-[13px] leading-relaxed" style={{ fontFamily: FONT_BODY, color: COLORS.ink.primary }}>
            {tab === "terms" ? TERMS_TEXT : PRIVACY_TEXT}
          </p>
        </div>

        <div className="px-6 pb-6 pt-2 flex-shrink-0 border-t border-[#f0f0f0]">
          <label className="flex items-start gap-3 cursor-pointer mb-4 mt-4">
            <button
              type="button"
              aria-pressed={agreed}
              onClick={() => { setAgreed(!agreed); setShowDeclineNotice(false); }}
              className="mt-0.5 w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 transition-colors"
              style={{ borderColor: agreed ? COLORS.brand.green : "#d0d0d0", backgroundColor: agreed ? COLORS.brand.green : "white" }}
            >
              {agreed && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
            </button>
            <span className="text-[13px]" style={{ fontFamily: FONT_BODY, color: COLORS.ink.muted }}>
              I have read and agree to the Terms of Use and Data Privacy Policy.
            </span>
          </label>

          {showDeclineNotice && (
            <p className="text-[12px] mb-3" style={{ fontFamily: FONT_BODY, color: "#e05555" }}>
              You&apos;ll need to accept to continue using Stravyx.
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowDeclineNotice(true)}
              className="px-5 py-3 rounded-[12px] text-[14px] border border-[#e8e8e8] hover:bg-[#f5f5f5] transition-colors"
              style={{ fontFamily: FONT_BODY, fontWeight: 600, color: COLORS.ink.muted }}
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => { if (agreed) onAccept(); }}
              disabled={!agreed}
              className="flex-1 py-3 rounded-[12px] text-white text-[14px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: FONT_BODY, fontWeight: 700,
                backgroundColor: COLORS.brand.orange,
                boxShadow: agreed ? "0 4px 14px rgba(216,90,48,0.3)" : "none",
              }}
            >
              Accept & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
