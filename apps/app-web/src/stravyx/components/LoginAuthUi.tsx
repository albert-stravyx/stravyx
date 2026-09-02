import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export type AuthScreen = "login" | "signup" | "forgot";
export type AccountType = "customer" | "operator" | null;
export type SignupStep = 1 | 2 | 3 | 4;

// ─── Google Icon ──────────────────────────────────────────────────────────────

export function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ─── Shared field components ──────────────────────────────────────────────────

export function Label({
  children,
  className,
  style,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      {...props}
      className={className ?? "block mb-1.5 text-[13px]"}
      style={style ?? { fontFamily: "DM Sans, sans-serif", fontWeight: 500, color: "#2d2d2d" }}
    >
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full px-4 py-3 border border-[#e8e8e8] rounded-[10px] focus:outline-none focus:border-[#5cb89c] transition-colors bg-white"
      style={{ fontFamily: "DM Sans, sans-serif", fontSize: "15px" }}
    />
  );
}

export function PasswordInput({ value, onChange, placeholder = "••••••••" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 pr-12 border border-[#e8e8e8] rounded-[10px] focus:outline-none focus:border-[#5cb89c] transition-colors bg-white"
        style={{ fontFamily: "DM Sans, sans-serif", fontSize: "15px" }}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#b0b0b0] hover:text-[#737373] transition-colors"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = ["", "Weak", "Fair", "Good", "Strong"][score];
  const colors = ["#e8e8e8", "#e05555", "#e8a020", "#5cb89c", "#2d6b53"];

  if (!password) return null;
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-1 flex-1 rounded-full transition-colors" style={{ backgroundColor: i <= score ? colors[score] : "#e8e8e8" }} />
        ))}
      </div>
      <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: colors[score] }}>{label}</p>
    </div>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-[#e8e8e8]" />
      <span className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>{label}</span>
      <div className="flex-1 h-px bg-[#e8e8e8]" />
    </div>
  );
}

export function GoogleButton({ onClick, label = "Continue with Google" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#e8e8e8] rounded-[10px] hover:bg-[#f8f8f8] hover:border-[#d0d0d0] transition-all"
      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, fontSize: "15px", color: "#2d2d2d" }}
    >
      <GoogleIcon />
      {label}
    </button>
  );
}

export function PrimaryButton({ children, onClick, type = "button", disabled }: {
  children: React.ReactNode; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-[#d85a30] text-white py-3.5 rounded-[10px] hover:bg-[#b8481f] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0px_4px_12px_rgba(216,90,48,0.25)]"
      style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "15px" }}
    >
      {children}
    </button>
  );
}
