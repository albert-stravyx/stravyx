import { useState } from "react";
import {
  DollarSign, Wallet, ArrowDownToLine, CalendarClock, Info, X, CircleCheck, Banknote,
} from "lucide-react";
import {
  EARLY_FEE_RATE, INSTANT_THRESHOLD, NEXT_PAYOUT_DATE, NEXT_PAYOUT_TIME,
} from "./operatorMockData";

// ─── Cash-out modal ───────────────────────────────────────────────────────────

export type CashOutOption = "instant" | "scheduled";

export function CashOutModal({
  balance,
  onClose,
  onConfirm,
}: {
  balance: number;
  onClose: () => void;
  onConfirm: (option: CashOutOption) => void;
}) {
  const [selected, setSelected] = useState<CashOutOption>("scheduled");
  const isUnderThreshold = balance < INSTANT_THRESHOLD;
  const fee = isUnderThreshold ? Math.round(balance * EARLY_FEE_RATE * 100) / 100 : 0;
  const youReceiveInstant = Math.round((balance - fee) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white w-full md:max-w-[440px] rounded-t-[24px] md:rounded-[20px] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-2">
            <Wallet size={18} className="text-[#5cb89c]" />
            <p className="text-[18px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              Cash Out
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#f5f5f5] transition-colors">
            <X size={18} className="text-[#737373]" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Balance callout */}
          <div className="flex items-center justify-between bg-[#f4efe6] rounded-[14px] px-5 py-4">
            <div>
              <p className="text-[12px] mb-0.5" style={{ fontFamily: "DM Sans, sans-serif", color: "#7a5a40", fontWeight: 600 }}>Your Earnings</p>
              <p className="text-[32px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
                ${balance.toFixed(2)}
              </p>
            </div>
            <Banknote size={36} className="text-[#d85a30] opacity-70" />
          </div>

          {/* Under-threshold notice */}
          {isUnderThreshold && (
            <div className="flex items-start gap-2.5 bg-[#fff8f5] border border-[#f0cfc0] rounded-[10px] px-4 py-3">
              <Info size={14} className="text-[#d85a30] mt-0.5 flex-shrink-0" />
              <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#7a3a20", lineHeight: "1.5" }}>
                Balances under ${INSTANT_THRESHOLD.toLocaleString()} attract a {(EARLY_FEE_RATE * 100).toFixed(1)}% early cash-out fee. Reach ${INSTANT_THRESHOLD.toLocaleString()}+ or wait for your free Friday payout to avoid this charge.
              </p>
            </div>
          )}

          {/* Option cards */}
          <div className="space-y-3">
            {/* Instant option */}
            <button
              onClick={() => setSelected("instant")}
              className="w-full text-left rounded-[14px] border-2 p-4 transition-all"
              style={{ borderColor: selected === "instant" ? "#d85a30" : "#e8e8e8", backgroundColor: selected === "instant" ? "#fff8f5" : "white" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: selected === "instant" ? "#f5ddd5" : "#f5f5f5" }}>
                    <ArrowDownToLine size={18} style={{ color: selected === "instant" ? "#d85a30" : "#b0b0b0" }} />
                  </div>
                  <div>
                    <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#2d2d2d" }}>Cash Out Now</p>
                    <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>Arrives within 1–2 business days</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[17px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
                    ${youReceiveInstant.toFixed(2)}
                  </p>
                  {fee > 0 && (
                    <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
                      −${fee.toFixed(2)} fee
                    </p>
                  )}
                </div>
              </div>
            </button>

            {/* Scheduled option */}
            <button
              onClick={() => setSelected("scheduled")}
              className="w-full text-left rounded-[14px] border-2 p-4 transition-all"
              style={{ borderColor: selected === "scheduled" ? "#5cb89c" : "#e8e8e8", backgroundColor: selected === "scheduled" ? "#f0faf7" : "white" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: selected === "scheduled" ? "#d5eee6" : "#f5f5f5" }}>
                    <CalendarClock size={18} style={{ color: selected === "scheduled" ? "#5cb89c" : "#b0b0b0" }} />
                  </div>
                  <div>
                    <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#2d2d2d" }}>
                      Scheduled Payout
                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full" style={{ fontFamily: "DM Sans, sans-serif", backgroundColor: "#e8f5f0", color: "#2d6b53" }}>FREE</span>
                    </p>
                    <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                      {NEXT_PAYOUT_DATE} · {NEXT_PAYOUT_TIME}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[17px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
                    ${balance.toFixed(2)}
                  </p>
                  <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#5cb89c" }}>No fees</p>
                </div>
              </div>
            </button>
          </div>

          {/* Bank destination */}
          <div className="flex items-center gap-2.5 bg-[#fafafa] rounded-[10px] px-4 py-3">
            <DollarSign size={14} className="text-[#b0b0b0] flex-shrink-0" />
            <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
              Paying to: <span style={{ fontWeight: 600, color: "#2d2d2d" }}>ANZ · BSB 062-000 · ···4321</span>
            </p>
          </div>

          {/* Confirm button */}
          <button
            onClick={() => onConfirm(selected)}
            className="w-full py-3.5 rounded-[12px] text-white transition-all"
            style={{
              backgroundColor: selected === "instant" ? "#d85a30" : "#5cb89c",
              fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: "15px",
              boxShadow: selected === "instant" ? "0 4px 14px rgba(216,90,48,0.3)" : "0 4px 14px rgba(92,184,156,0.3)",
            }}
          >
            {selected === "instant"
              ? `Confirm — Receive $${youReceiveInstant.toFixed(2)}`
              : `Schedule Payout — $${balance.toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cash-out success overlay ──────────────────────────────────────────────────

export function CashOutSuccess({ option, balance, onClose }: { option: CashOutOption; balance: number; onClose: () => void }) {
  const fee = option === "instant" && balance < INSTANT_THRESHOLD ? Math.round(balance * EARLY_FEE_RATE * 100) / 100 : 0;
  const received = balance - fee;
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.45)" }}>
      <div className="bg-white w-full md:max-w-[400px] rounded-t-[24px] md:rounded-[20px] shadow-2xl px-6 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-[#e8f5f0] flex items-center justify-center mx-auto mb-4">
          <CircleCheck size={32} className="text-[#5cb89c]" />
        </div>
        <p className="text-[22px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
          {option === "instant" ? "Cash-Out Initiated" : "Payout Scheduled"}
        </p>
        <p className="text-[14px] mb-5" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
          {option === "instant"
            ? `$${received.toFixed(2)} will arrive in your account within 1–2 business days.`
            : `$${received.toFixed(2)} will be deposited on ${NEXT_PAYOUT_DATE} at ${NEXT_PAYOUT_TIME}.`}
        </p>
        <button
          onClick={onClose}
          className="w-full py-3 rounded-[12px] bg-[#5cb89c] text-white"
          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700 }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
