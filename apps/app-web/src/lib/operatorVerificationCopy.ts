import { ApiError } from "@stravyx/api-client";
import {
  CREDENTIAL_MAX_BYTES,
  isAllowedCredentialMime,
  OPERATOR_CREDENTIAL_KINDS,
  parseArn,
  parseReoc,
  type OperatorCredentialFileItem,
  type OperatorCredentialKind,
  type VerificationStatus,
} from "@stravyx/types";

export const OPERATOR_NOT_VERIFIED_TOAST =
  "You cannot accept jobs until a Stravyx admin verifies your credentials. Open Verify ID to upload your documents.";

export const CREDENTIAL_KIND_LABELS: Record<OperatorCredentialKind, string> = {
  reoc_certificate: "ReOC certificate",
  repl: "RePL",
  certificate_of_currency: "Certificate of currency",
};

export const CREDENTIAL_ACCEPT = "application/pdf,image/jpeg,image/png,.pdf,.jpeg,.jpg,.png";

export type OperatorVerificationTone =
  | "pending_docs"
  | "pending_review"
  | "rejected"
  | "verified"
  | "unknown";

export interface OperatorVerificationCopy {
  tone: OperatorVerificationTone;
  headline: string;
  body: string;
  statusLabel: string;
}

export interface OperatorSignupFieldErrors {
  arn: string | null;
  reocNumber: string | null;
}

const ARN_FIELD_ERROR = "Enter a 6 or 7 digit Aviation Reference Number (ARN).";
const REOC_FIELD_ERROR = "Enter a ReOC in the form CASA.ReOC. followed by 4 digits.";

export function operatorSignupFieldErrors(
  arn: string,
  reocNumber: string,
): OperatorSignupFieldErrors {
  return {
    arn: parseArn(arn).ok ? null : ARN_FIELD_ERROR,
    reocNumber: parseReoc(reocNumber).ok ? null : REOC_FIELD_ERROR,
  };
}

export function canonicalOperatorSignupCredentials(
  arn: string,
  reocNumber: string,
):
  | { ok: true; arn: string; reocNumber: string }
  | { ok: false; errors: OperatorSignupFieldErrors } {
  const arnResult = parseArn(arn);
  const reocResult = parseReoc(reocNumber);
  if (!arnResult.ok || !reocResult.ok) {
    return {
      ok: false,
      errors: {
        arn: arnResult.ok ? null : ARN_FIELD_ERROR,
        reocNumber: reocResult.ok ? null : REOC_FIELD_ERROR,
      },
    };
  }
  return { ok: true, arn: arnResult.arn, reocNumber: reocResult.reocNumber };
}

export function isOperatorVerified(verified: boolean | null | undefined): boolean {
  return verified === true;
}

export function operatorCredentialUploadsLocked(
  status: VerificationStatus | null | undefined,
  verified: boolean | null | undefined,
): boolean {
  if (isOperatorVerified(verified)) return true;
  return status === "pending_review";
}

export function resolveVerificationTone(
  status: VerificationStatus | null | undefined,
  verified: boolean | null | undefined,
): OperatorVerificationTone {
  if (isOperatorVerified(verified) || status === "verified") {
    return "verified";
  }
  if (status === "rejected") return "rejected";
  if (status === "pending_review") return "pending_review";
  if (status === "pending_docs") return "pending_docs";
  return "unknown";
}

export function operatorVerificationCopy(input: {
  verificationStatus: VerificationStatus | null | undefined;
  verified: boolean | null | undefined;
  rejectionReason: string | null | undefined;
}): OperatorVerificationCopy {
  const tone = resolveVerificationTone(input.verificationStatus, input.verified);
  switch (tone) {
    case "verified":
      return {
        tone,
        headline: "Verified by Stravyx",
        statusLabel: "Verified by Stravyx admin",
        body: "A Stravyx admin has verified the format-checked identifiers and documents on file. This is not a live CASA registry check.",
      };
    case "pending_review":
      return {
        tone,
        headline: "Documents submitted",
        statusLabel: "Waiting for admin review",
        body: "Your documents have been submitted and are waiting for in-app admin review. You cannot accept jobs yet.",
      };
    case "rejected": {
      const reason = input.rejectionReason?.trim();
      const reasonSentence = reason
        ? `Reason: ${reason}`
        : "A Stravyx admin rejected this submission.";
      return {
        tone,
        headline: "Verification rejected",
        statusLabel: "Rejected — resubmit documents",
        body: `${reasonSentence} You may re-upload your ReOC certificate, RePL, and certificate of currency and resubmit for review.`,
      };
    }
    case "pending_docs":
    case "unknown":
      return {
        tone: tone === "unknown" ? "unknown" : "pending_docs",
        headline: "Not verified",
        statusLabel: "Not verified",
        body: "Your operator account is not verified. Upload your ReOC certificate, RePL, and certificate of currency to submit them for Stravyx review. There is no live CASA connection.",
      };
  }
}

export function credentialKindLabel(kind: OperatorCredentialKind): string {
  return CREDENTIAL_KIND_LABELS[kind];
}

export function inferCredentialMime(file: Pick<File, "name" | "type">): string | null {
  const mime = file.type.trim().toLowerCase();
  if (isAllowedCredentialMime(mime)) {
    return mime;
  }
  if (mime.length > 0) {
    return null;
  }
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return "application/pdf";
  if (name.endsWith(".png")) return "image/png";
  if (name.endsWith(".jpeg") || name.endsWith(".jpg")) return "image/jpeg";
  return null;
}

export function credentialFileClientError(file: Pick<File, "name" | "type" | "size">): string | null {
  if (file.size > CREDENTIAL_MAX_BYTES) {
    return "Each file must be 10 MB or smaller.";
  }
  if (!inferCredentialMime(file)) {
    return "Use a PDF, JPEG, or PNG file.";
  }
  return null;
}

export function fileForCredentialKind(
  files: readonly OperatorCredentialFileItem[],
  kind: OperatorCredentialKind,
): OperatorCredentialFileItem | null {
  const matches = files.filter((file) => file.kind === kind);
  const confirmed = matches.find((file) => file.confirmedAt);
  return confirmed ?? matches[0] ?? null;
}

export function requiredCredentialKinds(): readonly OperatorCredentialKind[] {
  return OPERATOR_CREDENTIAL_KINDS;
}

export function userSafeCredentialApiMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "invalid_arn":
        return ARN_FIELD_ERROR;
      case "invalid_reoc":
        return REOC_FIELD_ERROR;
      case "operator_not_verified":
        return OPERATOR_NOT_VERIFIED_TOAST;
      case "media_type_not_allowed":
        return "Use a PDF, JPEG, or PNG file.";
      case "credentials_already_verified":
        return "These credentials are already verified and cannot be replaced.";
      case "credentials_pending_review":
        return "Documents cannot be replaced while a Stravyx admin is reviewing them.";
      case "credentials_incomplete":
        return "Approve requires a confirmed ReOC certificate, RePL, and certificate of currency.";
      case "forbidden":
        return "You do not have permission to do that.";
      default:
        if (error.detail && error.detail.trim().length > 0) {
          return error.detail;
        }
        return fallback;
    }
  }
  if (error instanceof Error && error.message.trim().length > 0) {
    if (error.message.startsWith("API ")) {
      return fallback;
    }
    return error.message;
  }
  return fallback;
}

export function signupApiErrorMessage(error: unknown): string | null {
  if (!(error instanceof ApiError)) {
    return null;
  }
  if (error.code === "invalid_arn") return ARN_FIELD_ERROR;
  if (error.code === "invalid_reoc") return REOC_FIELD_ERROR;
  return null;
}
