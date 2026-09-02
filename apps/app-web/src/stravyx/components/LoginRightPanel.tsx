import type { AccountType, SignupStep } from "./LoginAuthUi";

const HERO_IMAGE = "https://images.unsplash.com/photo-1514505213055-b456c4420f67?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=90&w=2000";

// ─── Right panel (drone image) — fixed across all screens ────────────────────

export function RightPanel({ step, accountType }: { step?: SignupStep; accountType?: AccountType }) {
  const overlays: Record<string, { headline: string; sub: string }> = {
    login: { headline: "The future of aerial services", sub: "Connect with certified drone operators in seconds." },
    forgot: { headline: "We've got you covered", sub: "Password resets are quick and secure." },
    "signup-1": { headline: "Join Stravyx", sub: "Whether you need drones or fly them, we've got you." },
    "signup-2": { headline: "Almost there", sub: "Your account takes less than 2 minutes to set up." },
    "signup-3": { headline: "One last step", sub: "A few details help us match you with the right people." },
    "signup-4": { headline: "Welcome aboard!", sub: "You're ready to take flight." },
  };

  const key = step ? `signup-${step}` : "login";
  const overlay = overlays[key] || overlays["login"];

  return (
    <div className="hidden md:block flex-1 relative overflow-hidden">
      <img src={HERO_IMAGE} alt="Drone flying at sunset" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-br from-[#1c1c1c]/60 via-[#1c1c1c]/30 to-transparent" />
      <div className="absolute bottom-12 left-10 right-10">
        <p className="text-white text-[32px] mb-3 leading-tight" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>
          {overlay.headline}
        </p>
        <p className="text-white/75 text-[16px]" style={{ fontFamily: "DM Sans, sans-serif" }}>
          {overlay.sub}
        </p>
        {step && step < 4 && (
          <div className="flex gap-2 mt-6">
            {([1, 2, 3] as SignupStep[]).map((s) => (
              <div
                key={s}
                className="h-1.5 rounded-full transition-all"
                style={{ width: s === step ? "32px" : "12px", backgroundColor: s <= step ? "white" : "rgba(255,255,255,0.3)" }}
              />
            ))}
          </div>
        )}
      </div>
      {accountType && (
        <div className="absolute top-8 right-8 px-4 py-2 bg-white/15 backdrop-blur-sm rounded-full border border-white/25">
          <span className="text-white text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>
            {accountType === "customer" ? "Customer Account" : "Operator Account"}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Step progress (mobile) ───────────────────────────────────────────────────

export function MobileStepBar({ step }: { step: SignupStep }) {
  if (step === 4) return null;
  return (
    <div className="flex gap-1.5 mb-6">
      {([1, 2, 3] as SignupStep[]).map((s) => (
        <div
          key={s}
          className="h-1 flex-1 rounded-full transition-all"
          style={{ backgroundColor: s <= step ? "#5cb89c" : "#e8e8e8" }}
        />
      ))}
    </div>
  );
}
