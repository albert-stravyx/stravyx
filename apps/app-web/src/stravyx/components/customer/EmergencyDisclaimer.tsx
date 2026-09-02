"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle, PhoneCall, ShieldOff } from "lucide-react";
import { Logo } from "../Logo";
import { COLORS, FONT_BODY, FONT_DISPLAY } from "../../theme";

interface EmergencyDisclaimerProps {
  onAcknowledge: () => void;
  onExit: () => void;
}

const HEADING_ID = "emergency-disclaimer-heading";

export function EmergencyDisclaimer({ onAcknowledge, onExit }: EmergencyDisclaimerProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const active = document.activeElement;
    previouslyFocusedRef.current = active instanceof HTMLElement ? active : null;
    headingRef.current?.focus();

    return () => {
      const previous = previouslyFocusedRef.current;
      if (previous && document.body.contains(previous)) {
        previous.focus();
      }
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-[#fafafa] flex flex-col z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby={HEADING_ID}
    >
      <div className="flex-shrink-0 bg-white border-b border-[#e8e8e8] px-4 md:px-8 py-4">
        <Logo className="h-10" />
      </div>

      <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[480px]">
          <div className="w-14 h-14 rounded-full bg-[#fdeaea] flex items-center justify-center mb-5 mx-auto">
            <AlertTriangle size={26} style={{ color: "#e05555" }} />
          </div>

          <h1
            id={HEADING_ID}
            ref={headingRef}
            tabIndex={-1}
            className="text-[24px] text-center mb-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: COLORS.ink.primary }}
          >
            Before you book Emergency Response
          </h1>
          <p className="text-[14px] text-center mb-6" style={{ fontFamily: FONT_BODY, color: COLORS.ink.muted }}>
            Please read this carefully.
          </p>

          <div className="bg-white border-2 border-[#f0c9c9] rounded-[16px] p-5 mb-4">
            <div className="flex items-start gap-3 mb-4">
              <PhoneCall size={18} style={{ color: "#e05555" }} className="flex-shrink-0 mt-0.5" />
              <p className="text-[15px] leading-relaxed" style={{ fontFamily: FONT_BODY, fontWeight: 700, color: "#a03a3a" }}>
                If you are experiencing a genuine emergency, call 000 immediately.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldOff size={18} style={{ color: "#e05555" }} className="flex-shrink-0 mt-0.5" />
              <p className="text-[14px] leading-relaxed" style={{ fontFamily: FONT_BODY, color: COLORS.ink.primary }}>
                Stravyx is an independent, private drone operator marketplace. We are <strong>not affiliated with, and do not replace, police, fire, or ambulance services</strong> in any capacity.
              </p>
            </div>
          </div>

          <p className="text-[13px] text-center mb-6" style={{ fontFamily: FONT_BODY, color: COLORS.ink.muted }}>
            This service is for private aerial support — infrastructure incidents, site security, and time-critical assessments that don&apos;t require emergency services.
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onAcknowledge}
              className="w-full text-white py-4 rounded-[14px] transition-all shadow-[0px_4px_14px_rgba(216,90,48,0.35)]"
              style={{ fontFamily: FONT_BODY, fontWeight: 700, fontSize: "15px", backgroundColor: COLORS.brand.orange }}
            >
              I Understand — Continue Booking
            </button>
            <button
              type="button"
              onClick={onExit}
              className="w-full py-3.5 rounded-[14px] border border-[#e8e8e8] hover:bg-[#f5f5f5] transition-colors"
              style={{ fontFamily: FONT_BODY, fontWeight: 600, fontSize: "14px", color: COLORS.ink.muted }}
            >
              Exit Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
