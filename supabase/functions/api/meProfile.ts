import { formatAuMobileDisplay } from "./phone.ts";
import {
  parseVerificationStatus,
  type VerificationStatus,
} from "./casaCredentials.ts";

type AppRole = "customer" | "operator" | "admin";

export interface MeProfile {
  id: string;
  email: string;
  fullName: string;
  primaryRole: AppRole;
  phoneE164: string | null;
  phoneDisplay: string | null;
  company: string | null;
  defaultLocation: string | null;
  operatorLicenceNumber: string | null;
  serviceArea: string | null;
  createdAt: string | null;
  arn: string | null;
  reocNumber: string | null;
  verificationStatus: VerificationStatus | null;
  verified: boolean | null;
  rejectionReason: string | null;
  online: boolean | null;
}

export interface MeProfileFallback {
  userId: string;
  email?: string;
  role: AppRole;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseRole(value: unknown, fallback: AppRole): AppRole {
  if (value === "customer" || value === "operator" || value === "admin") {
    return value;
  }
  return fallback;
}

/** Missing name/email is a displayable empty string, not a fabricated identity. */
function displayedText(value: string | null): string {
  if (value === null) {
    return "";
  }
  return value;
}

const EMPTY_VERIFICATION = {
  arn: null,
  reocNumber: null,
  verificationStatus: null,
  verified: null,
  rejectionReason: null,
  online: null,
} as const;

function projectOperatorVerification(
  role: AppRole,
  reocRow: unknown,
): {
  arn: string | null;
  reocNumber: string | null;
  verificationStatus: VerificationStatus | null;
  verified: boolean | null;
  rejectionReason: string | null;
  online: boolean | null;
} {
  if (role !== "operator") {
    return { ...EMPTY_VERIFICATION };
  }
  if (!isRecord(reocRow)) {
    return { ...EMPTY_VERIFICATION };
  }
  return {
    arn: optionalText(reocRow.arn),
    reocNumber: optionalText(reocRow.reoc_number),
    verificationStatus: parseVerificationStatus(reocRow.verification_status),
    verified: typeof reocRow.verified === "boolean" ? reocRow.verified : null,
    rejectionReason: optionalText(reocRow.rejection_reason),
    online: typeof reocRow.online === "boolean" ? reocRow.online : null,
  };
}

export function projectMeProfile(
  row: unknown,
  fallback: MeProfileFallback,
  reocRow?: unknown,
): MeProfile {
  const record = isRecord(row) ? row : null;
  const email = displayedText(optionalText(record?.email) ?? optionalText(fallback.email));
  const fullName = displayedText(optionalText(record?.full_name));
  const phoneE164 = optionalText(record?.phone_e164);
  const primaryRole = parseRole(record?.primary_role, fallback.role);
  const verification = projectOperatorVerification(primaryRole, reocRow);
  return {
    id: optionalText(record?.id) ?? fallback.userId,
    email,
    fullName,
    primaryRole,
    phoneE164,
    phoneDisplay: formatAuMobileDisplay(phoneE164),
    company: optionalText(record?.company),
    defaultLocation: optionalText(record?.default_location),
    operatorLicenceNumber: optionalText(record?.operator_licence_number),
    serviceArea: optionalText(record?.service_area),
    createdAt: optionalText(record?.created_at),
    arn: verification.arn,
    reocNumber: verification.reocNumber,
    verificationStatus: verification.verificationStatus,
    verified: verification.verified,
    rejectionReason: verification.rejectionReason,
    online: verification.online,
  };
}
