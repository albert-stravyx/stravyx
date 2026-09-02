import { ArrowLeft, Briefcase, ChevronRight, User } from "lucide-react";
import { Logo } from "./Logo";
import { Divider, GoogleButton } from "./LoginAuthUi";
import type { AccountType } from "./LoginAuthUi";

// ─── Signup Step 1: Account type ──────────────────────────────────────────────

export function SignupStep1({ onNext, onBack }: { onNext: (type: AccountType) => void; onBack: () => void }) {
  return (
    <div className="w-full max-w-md">
      <button onClick={onBack} className="flex items-center gap-2 mb-6 hover:text-[#2d2d2d] transition-colors" style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
        <ArrowLeft size={16} /> Back to sign in
      </button>
      <div className="mb-8 text-center">
        <Logo className="h-44 mb-5 mx-auto block" />
        <h1 className="text-[28px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
          How will you use Stravyx?
        </h1>
        <p className="text-[15px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
          Choose your account type to get started.
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => onNext("customer")}
          className="w-full text-left p-5 border-2 border-[#e8e8e8] rounded-[16px] hover:border-[#5cb89c] hover:bg-[#f9fffe] transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#e8f5f0] rounded-[12px] flex items-center justify-center flex-shrink-0 group-hover:bg-[#5cb89c] transition-colors">
              <User size={22} className="text-[#5cb89c] group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[16px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}>
                  I need drone services
                </p>
                <ChevronRight size={18} className="text-[#c0c0c0] group-hover:text-[#5cb89c] transition-colors" />
              </div>
              <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                Book aerial photography, inspections, mapping, and more.
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {["Aerial Photography", "Inspections", "Mapping", "Emergency"].map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: "#e8f5f0", color: "#2d6b53", fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </button>

        <button
          onClick={() => onNext("operator")}
          className="w-full text-left p-5 border-2 border-[#e8e8e8] rounded-[16px] hover:border-[#5cb89c] hover:bg-[#f9fffe] transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#f0f0ff] rounded-[12px] flex items-center justify-center flex-shrink-0 group-hover:bg-[#5cb89c] transition-colors">
              <Briefcase size={22} className="text-[#7070d0] group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-[16px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}>
                  I'm a drone operator
                </p>
                <ChevronRight size={18} className="text-[#c0c0c0] group-hover:text-[#5cb89c] transition-colors" />
              </div>
              <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                Earn income by accepting jobs matched to your location and skills.
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                {["Flexible Hours", "Instant Payouts", "Job Matching"].map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: "#f0f0ff", color: "#4040a0", fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </button>
      </div>

      <Divider label="or sign up with" />
      <GoogleButton onClick={() => onNext("customer")} label="Continue with Google" />
    </div>
  );
}
