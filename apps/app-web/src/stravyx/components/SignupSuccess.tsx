import { CheckCircle2 } from "lucide-react";
import { PrimaryButton } from "./LoginAuthUi";
import type { AccountType } from "./LoginAuthUi";

// ─── Signup Step 4: Success ───────────────────────────────────────────────────

export function SignupSuccess({
  accountType,
  firstName,
  onLogin,
  loading,
}: {
  accountType: AccountType;
  firstName: string;
  onLogin: () => void;
  loading?: boolean;
}) {
  const perks = accountType === "customer"
    ? ["Browse and book verified drone operators", "Real-time job tracking on map", "Secure payments and receipts", "10% off your first booking"]
    : ["Receive matched job requests instantly", "Set your own availability", "Get paid within 24 hours", "Build your rating and profile"];

  return (
    <div className="w-full max-w-md text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-[#5cb89c] to-[#4a9d84] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0px_8px_24px_rgba(216,90,48,0.35)]">
        <CheckCircle2 size={40} className="text-white" />
      </div>
      <h1 className="text-[28px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
        You're in, {firstName || "there"}!
      </h1>
      <p className="text-[15px] mb-8" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
        Your {accountType === "operator" ? "operator" : "customer"} account is ready. Here's what you can do now:
      </p>

      <div className="bg-[#f9fffe] border border-[#c0e8d8] rounded-[16px] p-5 mb-8 text-left space-y-3">
        {perks.map((perk) => (
          <div key={perk} className="flex items-start gap-3">
            <CheckCircle2 size={16} className="text-[#5cb89c] mt-0.5 flex-shrink-0" />
            <span className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}>{perk}</span>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={onLogin} disabled={loading}>
        {loading ? "Signing in…" : "Go to Dashboard"}
      </PrimaryButton>
      <p className="mt-3 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
        A welcome email has been sent to your inbox.
      </p>
    </div>
  );
}
