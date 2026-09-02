import { useState } from "react";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Input, Label, PrimaryButton } from "./LoginAuthUi";

// ─── Forgot Password ──────────────────────────────────────────────────────────

export function ForgotPassword({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="w-full max-w-md">
      <button onClick={onBack} className="flex items-center gap-2 mb-8 hover:text-[#2d2d2d] transition-colors" style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
        <ArrowLeft size={16} /> Back to sign in
      </button>

      {!sent ? (
        <>
          <div className="mb-8">
            <div className="w-12 h-12 bg-[#e8f5f0] rounded-full flex items-center justify-center mb-4">
              <Mail size={22} className="text-[#5cb89c]" />
            </div>
            <h1 className="text-[28px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              Reset your password
            </h1>
            <p className="text-[15px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
              Enter your email and we'll send you a reset link.
            </p>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="space-y-4">
            <div>
              <Label>Email Address</Label>
              <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <PrimaryButton type="submit" disabled={!email}>
              Send Reset Link
            </PrimaryButton>
          </form>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-[#e8f5f0] rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 size={32} className="text-[#5cb89c]" />
          </div>
          <h2 className="text-[24px] mb-3" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
            Check your inbox
          </h2>
          <p className="text-[15px] mb-6" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            We've sent a password reset link to <span style={{ fontWeight: 600, color: "#2d2d2d" }}>{email}</span>. It expires in 15 minutes.
          </p>
          <button onClick={onBack} className="text-[14px] hover:text-[#4a9d84] transition-colors" style={{ fontFamily: "DM Sans, sans-serif", color: "#5cb89c", fontWeight: 600 }}>
            Back to sign in
          </button>
        </div>
      )}
    </div>
  );
}
