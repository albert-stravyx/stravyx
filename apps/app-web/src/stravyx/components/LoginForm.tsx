import { useState } from "react";
import { Logo } from "./Logo";
import { Divider, Input, Label, PasswordInput, PrimaryButton } from "./LoginAuthUi";

// ─── Login Form ───────────────────────────────────────────────────────────────

export function LoginForm({
  onLogin,
  onSignup,
  onForgot,
  loading,
}: {
  onLogin: (email: string, password: string) => void | Promise<void>;
  onSignup: () => void;
  onForgot: () => void;
  loading?: boolean;
}) {
  const [email, setEmail] = useState("customer@demo.stravyx.com");
  const [password, setPassword] = useState("DemoPass123!");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <Logo className="h-48 mb-6 mx-auto block" />
        <h1 className="text-[28px] md:text-[34px] leading-tight mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
          Welcome back
        </h1>
        <p className="text-[15px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
          Sign in to your Stravyx account
        </p>
      </div>

      <Divider label="sign in with email" />

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          try {
            await onLogin(email, password);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Sign-in failed");
          }
        }}
        className="space-y-4"
      >
        <div>
          <Label>Email Address</Label>
          <Input type="email" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Label>Password</Label>
            <button type="button" onClick={onForgot} className="text-[12px] hover:text-[#4a9d84] transition-colors" style={{ fontFamily: "DM Sans, sans-serif", color: "#5cb89c" }}>
              Forgot password?
            </button>
          </div>
          <PasswordInput value={password} onChange={setPassword} />
        </div>
        {error && (
          <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>{error}</p>
        )}
        <PrimaryButton type="submit" disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </PrimaryButton>
        <p className="text-[12px] text-center" style={{ fontFamily: "DM Sans, sans-serif", color: "#a3a3a3" }}>
          Demo: customer@ / operator@ / admin@demo.stravyx.com · DemoPass123!
        </p>
      </form>

      <p className="text-center mt-6 text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
        Don't have an account?{" "}
        <button onClick={onSignup} className="hover:text-[#4a9d84] transition-colors" style={{ color: "#5cb89c", fontWeight: 600 }}>
          Create one
        </button>
      </p>
    </div>
  );
}
