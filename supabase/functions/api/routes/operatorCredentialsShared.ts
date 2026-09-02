import type { RequestContext } from "../client.ts";
import { json } from "../http.ts";
import {
  CREDENTIAL_ALLOWED_MIME_TYPES,
  CREDENTIAL_MAX_BYTES,
  canReplaceOperatorCredentials,
  hasAllRequiredCredentialsConfirmed,
  isAllowedCredentialMime,
  parseOperatorCredentialKind,
  parseVerificationStatus,
  type OperatorCredentialKind,
  type VerificationStatus,
} from "../casaCredentials.ts";

export const CREDENTIALS_BUCKET = "operator-credentials";
export const CREDENTIAL_SIGNED_GET_TTL_SECONDS = 600;

export interface ReocVerificationRow {
  id: string;
  owner_user_id: string;
  verification_status: VerificationStatus;
  verified: boolean;
  rejection_reason: string | null;
  arn: string | null;
  reoc_number: string | null;
}

export interface CredentialFileRow {
  id: string;
  reoc_profile_id: string;
  uploaded_by: string | null;
  kind: OperatorCredentialKind;
  storage_path: string;
  content_type: string | null;
  original_name: string | null;
  byte_size: number | null;
  confirmed_at: string | null;
  created_at: string;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function sanitizeFilename(filename: string): string {
  const trimmed = filename.trim();
  const noSeparators = trimmed.replace(/[\\/]+/g, "_");
  const noControl = noSeparators.replace(/[\u0000-\u001F\u007F]/g, "");
  const safeCharsOnly = noControl.replace(/[^a-zA-Z0-9._ -]/g, "_");
  const collapsedWhitespace = safeCharsOnly.replace(/\s+/g, " ").trim();
  if (collapsedWhitespace === "." || collapsedWhitespace === "..") {
    return "";
  }
  return collapsedWhitespace.slice(0, 180);
}

export function attachmentUrl(url: string, originalName: string | null): string {
  const parsed = new URL(url);
  const sanitizedDownloadName = originalName ? sanitizeFilename(originalName) : "";
  parsed.searchParams.set("download", sanitizedDownloadName || "true");
  return parsed.toString();
}

export async function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await req.json();
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function logCredentialEvent(
  event: string,
  context: Record<string, unknown>,
): void {
  console.info("[operator-credentials]", event, context);
}

export function logCredentialError(
  code: string,
  context: Record<string, unknown>,
  cause?: unknown,
): void {
  console.error("[operator-credentials]", code, { ...context, cause });
}

export function normalizeCredentialMime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export function rejectDisallowedMime(
  mime: string | null,
  cors: Record<string, string>,
): Response | null {
  if (!mime || !isAllowedCredentialMime(mime)) {
    return json({
      error: "Media type not allowed",
      code: "media_type_not_allowed",
      detail: `Allowed types: ${CREDENTIAL_ALLOWED_MIME_TYPES.join(", ")}`,
    }, 400, cors);
  }
  return null;
}

export function isReocVerificationRow(value: unknown): value is ReocVerificationRow {
  if (!isRecord(value)) return false;
  const status = parseVerificationStatus(value.verification_status);
  return (
    typeof value.id === "string" &&
    typeof value.owner_user_id === "string" &&
    status !== null &&
    typeof value.verified === "boolean" &&
    (typeof value.rejection_reason === "string" || value.rejection_reason === null) &&
    (typeof value.arn === "string" || value.arn === null) &&
    (typeof value.reoc_number === "string" || value.reoc_number === null)
  );
}

export function isCredentialFileRow(value: unknown): value is CredentialFileRow {
  if (!isRecord(value)) return false;
  const kind = parseOperatorCredentialKind(value.kind);
  return (
    typeof value.id === "string" &&
    typeof value.reoc_profile_id === "string" &&
    (typeof value.uploaded_by === "string" || value.uploaded_by === null) &&
    kind !== null &&
    typeof value.storage_path === "string" &&
    (typeof value.content_type === "string" || value.content_type === null) &&
    (typeof value.original_name === "string" || value.original_name === null) &&
    (typeof value.byte_size === "number" || value.byte_size === null) &&
    (typeof value.confirmed_at === "string" || value.confirmed_at === null) &&
    typeof value.created_at === "string"
  );
}

export function canUploadForStatus(status: VerificationStatus, verified: boolean): boolean {
  return canReplaceOperatorCredentials(status, verified);
}

export function pendingReviewLockedResponse(cors: Record<string, string>): Response {
  return json({
    error: "Credentials are locked during review",
    code: "credentials_pending_review",
    detail: "Documents cannot be replaced while an admin is reviewing them",
  }, 409, cors);
}

export async function loadReocForCaller(
  ctx: RequestContext,
  reocId?: string,
): Promise<{ ok: true; reoc: ReocVerificationRow } | { ok: false; response: Response }> {
  const { admin, cors, userId, role } = ctx;
  if (role === "customer") {
    return {
      ok: false,
      response: json({
        error: "Forbidden",
        code: "forbidden",
        detail: "Customers cannot access operator credentials",
      }, 403, cors),
    };
  }

  let query = admin
    .from("reoc_profiles")
    .select("id, owner_user_id, verification_status, verified, rejection_reason, arn, reoc_number");

  if (role === "admin" && reocId) {
    query = query.eq("id", reocId);
  } else if (role === "admin" && !reocId) {
    return {
      ok: false,
      response: json({
        error: "Invalid request",
        code: "invalid_reoc_id",
        detail: "Admin must supply reocId to list credentials",
      }, 400, cors),
    };
  } else {
    query = query.eq("owner_user_id", userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    logCredentialError("reoc_lookup_failed", { userId }, error);
    return {
      ok: false,
      response: json({
        error: "Failed to load operator profile",
        code: "reoc_lookup_failed",
      }, 500, cors),
    };
  }
  if (!data) {
    return {
      ok: false,
      response: json({
        error: "Operator profile not found",
        code: "reoc_not_found",
      }, 404, cors),
    };
  }
  if (!isReocVerificationRow(data)) {
    logCredentialError("reoc_payload_invalid", { userId });
    return {
      ok: false,
      response: json({
        error: "Operator profile payload mismatch",
        code: "reoc_payload_invalid",
      }, 500, cors),
    };
  }
  if (role === "operator" && data.owner_user_id !== userId) {
    return {
      ok: false,
      response: json({
        error: "Forbidden",
        code: "forbidden",
        detail: "Operators can only access their own credentials",
      }, 403, cors),
    };
  }
  return { ok: true, reoc: data };
}

export function alreadyVerifiedResponse(cors: Record<string, string>): Response {
  return json({
    error: "Credentials already verified",
    code: "credentials_already_verified",
    detail: "Verified operators cannot replace credential documents",
  }, 409, cors);
}

const CONFIRMED_PATH_SEGMENT = "confirmed";

export function credentialStagingPath(
  reocId: string,
  kind: OperatorCredentialKind,
  stagingId: string,
  filename: string,
): string {
  return `${reocId}/${kind}/${stagingId}/${filename}`;
}

export function credentialConfirmedPath(
  reocId: string,
  kind: OperatorCredentialKind,
  fileId: string,
  filename: string,
): string {
  return `${reocId}/${kind}/${fileId}/${CONFIRMED_PATH_SEGMENT}/${filename}`;
}

export function isCredentialConfirmedPath(
  storagePath: string,
  reocId: string,
  kind: OperatorCredentialKind,
  fileId: string,
): boolean {
  const prefix = `${reocId}/${kind}/${fileId}/${CONFIRMED_PATH_SEGMENT}/`;
  if (!storagePath.startsWith(prefix)) return false;
  const rest = storagePath.slice(prefix.length);
  return rest.length > 0 && !rest.includes("/");
}

export function splitStorageObjectPath(
  storagePath: string,
): { parentPrefix: string; objectName: string } | null {
  const storageParts = storagePath.split("/");
  const objectName = storageParts.pop();
  const parentPrefix = storageParts.join("/");
  if (!objectName || !parentPrefix) return null;
  return { parentPrefix, objectName };
}

export async function markPendingDocs(
  admin: RequestContext["admin"],
  reocId: string,
): Promise<void> {
  const { error } = await admin
    .from("reoc_profiles")
    .update({ verification_status: "pending_docs", verified: false })
    .eq("id", reocId)
    .in("verification_status", ["pending_docs", "rejected"]);
  if (error) {
    logCredentialError("reoc_status_pending_docs_failed", { reocId }, error);
  }
}

export async function promoteIfComplete(
  admin: RequestContext["admin"],
  reocId: string,
): Promise<void> {
  const { data, error } = await admin
    .from("operator_credential_files")
    .select("kind, confirmed_at")
    .eq("reoc_profile_id", reocId);
  if (error || !Array.isArray(data)) {
    logCredentialError("credential_complete_lookup_failed", { reocId }, error);
    return;
  }
  if (!hasAllRequiredCredentialsConfirmed(data)) return;
  const { error: updateError } = await admin
    .from("reoc_profiles")
    .update({ verification_status: "pending_review", verified: false })
    .eq("id", reocId)
    .neq("verification_status", "verified");
  if (updateError) {
    logCredentialError("reoc_status_pending_review_failed", { reocId }, updateError);
  }
}

export { CREDENTIAL_MAX_BYTES, parseOperatorCredentialKind };
