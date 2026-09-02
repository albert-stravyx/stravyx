import { useState } from "react";
import { ApiError } from "@stravyx/api-client";
import type { SignupInput } from "@stravyx/types";
import type { AccountType, AuthScreen, SignupStep } from "./LoginAuthUi";
import { MobileStepBar, RightPanel } from "./LoginRightPanel";
import { LoginForm } from "./LoginForm";
import { ForgotPassword } from "./ForgotPasswordForm";
import { SignupStep1 } from "./SignupStep1";
import { SignupStep2 } from "./SignupStep2";
import { CustomerProfileStep } from "./SignupCustomerProfile";
import { OperatorProfileStep } from "./SignupOperatorProfile";
import { SignupSuccess } from "./SignupSuccess";
import { signupApiErrorMessage } from "@/lib/operatorVerificationCopy";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => void | Promise<void>;
  onSignup: (input: SignupInput) => Promise<unknown>;
  loading?: boolean;
}

type SignupDraft = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

const EMPTY_DRAFT: SignupDraft = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
};

function roleFromAccountType(accountType: AccountType): SignupInput["role"] {
  return accountType === "operator" ? "operator" : "customer";
}

type SignupStep3Extras = Pick<
  SignupInput,
  "phone" | "company" | "defaultLocation" | "operatorLicenceNumber" | "serviceArea" | "arn" | "reocNumber"
>;

function compactSignupExtras(extras: Partial<SignupStep3Extras>): Partial<SignupStep3Extras> {
  const compacted: Partial<SignupStep3Extras> = {};
  const keys: (keyof SignupStep3Extras)[] = [
    "phone",
    "company",
    "defaultLocation",
    "operatorLicenceNumber",
    "serviceArea",
    "arn",
    "reocNumber",
  ];
  for (const key of keys) {
    const value = extras[key];
    if (typeof value === "string" && value.trim().length > 0) {
      compacted[key] = value.trim();
    }
  }
  return compacted;
}

function signupErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const credentialMessage = signupApiErrorMessage(error);
    if (credentialMessage) {
      return credentialMessage;
    }
    if (error.detail && error.detail.trim().length > 0) {
      return error.detail;
    }
    switch (error.code) {
      case "invalid_email":
        return "Enter a valid email address.";
      case "invalid_password":
        return "Password does not meet the requirements.";
      case "invalid_full_name":
        return "Enter your first and last name.";
      case "invalid_role":
        return "Choose a customer or operator account.";
      case "email_already_registered":
        return "An account with this email already exists. Try signing in.";
      case "phone_already_registered":
        return "This mobile number is already registered. Try signing in, or use a different number.";
      case "invalid_phone":
        return "Enter a valid Australian mobile number.";
      case "invalid_json":
      case "invalid_body":
        return "Check your details and try again.";
      case "signup_failed":
        return "Unable to create your account. Try again.";
      default:
        return "Unable to create your account. Try again.";
    }
  }
  return "Unable to create your account. Try again.";
}

// ─── Root LoginScreen ─────────────────────────────────────────────────────────

export function LoginScreen({ onLogin, onSignup, loading }: LoginScreenProps) {
  const [screen, setScreen] = useState<AuthScreen>("login");
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [draft, setDraft] = useState<SignupDraft>(EMPTY_DRAFT);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupSubmitting, setSignupSubmitting] = useState(false);

  const resetSignup = () => {
    setSignupStep(1);
    setAccountType(null);
    setDraft(EMPTY_DRAFT);
    setSignupError(null);
    setSignupSubmitting(false);
  };

  const goToSignup = () => { setScreen("signup"); resetSignup(); };
  const goToLogin = () => { setScreen("login"); resetSignup(); };

  const handleTypeSelect = (type: AccountType) => { setAccountType(type); setSignupStep(2); };
  const handleStep2 = (data: SignupDraft) => {
    setDraft(data);
    setSignupError(null);
    setSignupStep(3);
  };

  const handleStep3 = async (extras: Partial<SignupStep3Extras> = {}) => {
    if (signupSubmitting) return;
    const fullName = `${draft.firstName} ${draft.lastName}`.trim();
    if (!draft.email || !draft.password || !fullName) {
      setSignupError("Enter your name, email and password to continue.");
      return;
    }
    setSignupError(null);
    setSignupSubmitting(true);
    try {
      await onSignup({
        email: draft.email,
        password: draft.password,
        fullName,
        role: roleFromAccountType(accountType),
        ...compactSignupExtras(extras),
      });
      setSignupStep(4);
    } catch (error) {
      setSignupError(signupErrorMessage(error));
    } finally {
      setSignupSubmitting(false);
    }
  };

  const formContent = () => {
    if (screen === "forgot") return <ForgotPassword onBack={goToLogin} />;
    if (screen === "login") return <LoginForm onLogin={onLogin} loading={loading} onSignup={goToSignup} onForgot={() => setScreen("forgot")} />;

    // Signup flow
    if (signupStep === 1) return <SignupStep1 onNext={handleTypeSelect} onBack={goToLogin} />;
    if (signupStep === 2) {
      return (
        <SignupStep2
          accountType={accountType}
          initial={draft}
          onNext={handleStep2}
          onBack={() => setSignupStep(1)}
        />
      );
    }
    if (signupStep === 3) {
      const profileProps = {
        onNext: handleStep3,
        onBack: () => setSignupStep(2),
        submitting: signupSubmitting,
        error: signupError,
      };
      return accountType === "operator"
        ? <OperatorProfileStep {...profileProps} />
        : <CustomerProfileStep {...profileProps} />;
    }
    if (signupStep === 4) {
      return (
        <SignupSuccess
          accountType={accountType}
          firstName={draft.firstName}
          loading={loading}
          onLogin={() => onLogin(draft.email, draft.password)}
        />
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left — form panel */}
      <div className="flex-1 bg-white flex items-start md:items-center justify-center px-6 md:px-12 py-10 overflow-y-auto">
        <div className="w-full max-w-md">
          {screen === "signup" && signupStep < 4 && <MobileStepBar step={signupStep} />}
          {formContent()}
        </div>
      </div>

      {/* Right — drone image */}
      <RightPanel
        step={screen === "signup" ? signupStep : undefined}
        accountType={screen === "signup" && signupStep > 1 ? accountType : undefined}
      />
    </div>
  );
}
