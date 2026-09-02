export type OperatorCredentialKind =
  | "reoc_certificate"
  | "repl"
  | "certificate_of_currency";

export type VerificationStatus =
  | "pending_docs"
  | "pending_review"
  | "verified"
  | "rejected";

export const OPERATOR_CREDENTIAL_KINDS: readonly OperatorCredentialKind[] = [
  "reoc_certificate",
  "repl",
  "certificate_of_currency",
];

export const CREDENTIAL_MAX_BYTES = 10_485_760;

export const CREDENTIAL_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type CredentialAllowedMime = (typeof CREDENTIAL_ALLOWED_MIME_TYPES)[number];

export type ArnParseResult =
  | { ok: true; arn: string }
  | { ok: false; code: "invalid_arn" };

export type ReocParseResult =
  | { ok: true; reocNumber: string }
  | { ok: false; code: "invalid_reoc" };

const ARN_DIGITS = /^[0-9]{6,7}$/;
const REOC_PATTERN = /^CASA\.REOC\.([0-9]{4})$/i;

/**
 * Format-only ARN check. Surrounding whitespace is stripped; the remainder
 * must be exactly 6 or 7 ASCII digits. Empty is invalid, not skip.
 */
export function parseArn(value: unknown): ArnParseResult {
  if (typeof value !== "string") {
    return { ok: false, code: "invalid_arn" };
  }
  const trimmed = value.trim();
  if (!ARN_DIGITS.test(trimmed)) {
    return { ok: false, code: "invalid_arn" };
  }
  return { ok: true, arn: trimmed };
}

/**
 * Format-only ReOC check. Case-insensitive `CASA.ReOC.` + exactly 4 digits.
 * Canonical form is `CASA.ReOC.1234`. Other separators are invalid.
 */
export function parseReoc(value: unknown): ReocParseResult {
  if (typeof value !== "string") {
    return { ok: false, code: "invalid_reoc" };
  }
  const trimmed = value.trim();
  const match = REOC_PATTERN.exec(trimmed);
  if (!match) {
    return { ok: false, code: "invalid_reoc" };
  }
  return { ok: true, reocNumber: `CASA.ReOC.${match[1]}` };
}

export function parseOperatorCredentialKind(
  value: unknown,
): OperatorCredentialKind | null {
  if (
    value === "reoc_certificate" ||
    value === "repl" ||
    value === "certificate_of_currency"
  ) {
    return value;
  }
  return null;
}

export function parseVerificationStatus(value: unknown): VerificationStatus | null {
  if (
    value === "pending_docs" ||
    value === "pending_review" ||
    value === "verified" ||
    value === "rejected"
  ) {
    return value;
  }
  return null;
}

export function isAllowedCredentialMime(value: string): value is CredentialAllowedMime {
  return (CREDENTIAL_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function hasAllRequiredCredentialsConfirmed(rows: readonly unknown[]): boolean {
  const confirmed = new Set<OperatorCredentialKind>();
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const kind = parseOperatorCredentialKind(record.kind);
    if (!kind) continue;
    const confirmedAt = record.confirmed_at ?? record.confirmedAt;
    if (typeof confirmedAt === "string" && confirmedAt.length > 0) {
      confirmed.add(kind);
    }
  }
  return OPERATOR_CREDENTIAL_KINDS.every((kind) => confirmed.has(kind));
}

export function canReplaceOperatorCredentials(
  status: VerificationStatus,
  verified: boolean,
): boolean {
  if (verified || status === "verified") return false;
  return status === "pending_docs" || status === "rejected";
}

export interface OperatorCredentialUploadUrlInput {
  kind: OperatorCredentialKind;
  filename: string;
  contentType: string;
}

export interface OperatorCredentialConfirmInput {
  byteSize: number;
  originalName: string;
  contentType: string;
}

export interface OperatorCredentialFileItem {
  id: string;
  kind: OperatorCredentialKind;
  originalName: string | null;
  contentType: string | null;
  byteSize: number | null;
  confirmedAt: string | null;
  downloadUrl: string | null;
  expiresAt: string | null;
  expiresInSeconds: number | null;
}

export interface OperatorCredentialsListResponse {
  reocId: string;
  verificationStatus: VerificationStatus;
  verified: boolean;
  files: OperatorCredentialFileItem[];
}

export interface OperatorCredentialUploadUrlResponse {
  id: string;
  reocId: string;
  kind: OperatorCredentialKind;
  upload: {
    path: string;
    token: string;
    signedUrl: string;
  };
}

export interface PendingOperatorItem {
  reocId: string;
  ownerUserId: string;
  fullName: string | null;
  email: string | null;
  arn: string | null;
  reocNumber: string | null;
  verificationStatus: VerificationStatus;
  verified: boolean;
  files: OperatorCredentialFileItem[];
}

export interface VerifyOperatorInput {
  decision: "approve" | "reject";
  reason?: string;
}

export interface SetOperatorAvailabilityInput {
  online: boolean;
}
