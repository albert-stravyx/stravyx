import { useState } from "react";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Input, Label, PasswordInput, PasswordStrength, PrimaryButton } from "./LoginAuthUi";
import type { AccountType } from "./LoginAuthUi";

// ─── Signup Step 2: Personal details ─────────────────────────────────────────

export function SignupStep2({
  accountType,
  onNext,
  onBack,
  initial,
}: {
  accountType: AccountType;
  onNext: (data: { firstName: string; lastName: string; email: string; password: string }) => void;
  onBack: () => void;
  initial?: { firstName: string; lastName: string; email: string; password: string };
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);

  const valid = firstName && lastName && email && password.length >= 8 && password === confirm && agreed;

  return (
    <div className="w-full max-w-md">
      <button type="button" onClick={onBack} className="flex items-center gap-2 mb-6 hover:text-[#2d2d2d] transition-colors" style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className="mb-6">
        <h1 className="text-[26px] mb-1.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
          Create your account
        </h1>
        <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
          Set up your {accountType === "operator" ? "operator" : "customer"} profile.
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (valid) onNext({ firstName, lastName, email, password }); }} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>First Name</Label>
            <Input type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div>
            <Label>Last Name</Label>
            <Input type="text" placeholder="Smith" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
        <div>
          <Label>Email Address</Label>
          <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <Label>Password</Label>
          <PasswordInput value={password} onChange={setPassword} />
          <PasswordStrength password={password} />
        </div>
        <div>
          <Label>Confirm Password</Label>
          <PasswordInput value={confirm} onChange={setConfirm} placeholder="Re-enter password" />
          {confirm && confirm !== password && (
            <p className="mt-1 text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#e05555" }}>Passwords don't match</p>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <div
            onClick={() => setAgreed(!agreed)}
            className="mt-0.5 w-5 h-5 rounded-[5px] border-2 flex items-center justify-center flex-shrink-0 transition-colors"
            style={{ borderColor: agreed ? "#5cb89c" : "#d0d0d0", backgroundColor: agreed ? "#5cb89c" : "white" }}
          >
            {agreed && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
          </div>
          <span className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            I agree to the{" "}
            <span style={{ color: "#5cb89c", fontWeight: 600 }}>Terms of Service</span> and{" "}
            <span style={{ color: "#5cb89c", fontWeight: 600 }}>Privacy Policy</span>
          </span>
        </label>

        <PrimaryButton type="submit" disabled={!valid}>Continue</PrimaryButton>
      </form>
    </div>
  );
}
