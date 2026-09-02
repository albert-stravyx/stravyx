import type { RequestContext } from "../client.ts";
import { json } from "../http.ts";
import {
  attachmentUrl,
  CREDENTIAL_SIGNED_GET_TTL_SECONDS,
  CREDENTIALS_BUCKET,
  isCredentialFileRow,
  isRecord,
  isReocVerificationRow,
  logCredentialError,
  type CredentialFileRow,
  type ReocVerificationRow,
} from "./operatorCredentialsShared.ts";
import { hasAllRequiredCredentialsConfirmed } from "../casaCredentials.ts";

function forbidden(cors: Record<string, string>): Response {
  return json({
    error: "Forbidden",
    code: "forbidden",
    detail: "Admin role is required",
  }, 403, cors);
}

function notPendingReview(cors: Record<string, string>): Response {
  return json({
    error: "Operator is not pending review",
    code: "verification_conflict",
    detail: "Approve or reject only applies to pending_review operators",
  }, 409, cors);
}

interface SignedUrlEntry {
  signedUrl?: string | null;
  path?: string | null;
}

function resolveSignedUrl(
  signedRows: Array<SignedUrlEntry | null | undefined>,
  storagePath: string,
  index: number,
): string | null {
  const matched = signedRows.find((row) => row?.path === storagePath);
  const signed = matched ?? signedRows[index];
  if (!signed || typeof signed.signedUrl !== "string" || signed.signedUrl.length === 0) {
    return null;
  }
  return signed.signedUrl;
}

function optionalText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function listPendingOperators(ctx: RequestContext): Promise<Response> {
  const { cors, admin, role } = ctx;
  if (role !== "admin") return forbidden(cors);

  const { data: reocs, error: reocError } = await admin
    .from("reoc_profiles")
    .select("id, owner_user_id, verification_status, verified, rejection_reason, arn, reoc_number")
    .eq("verification_status", "pending_review")
    .limit(50);
  if (reocError) {
    logCredentialError("pending_operators_lookup_failed", {}, reocError);
    return json({
      error: "Failed to load pending operators",
      code: "pending_operators_lookup_failed",
    }, 500, cors);
  }
  if (!Array.isArray(reocs)) {
    return json({ operators: [] }, 200, cors);
  }

  const parsedReocs: ReocVerificationRow[] = [];
  for (const row of reocs) {
    if (!isReocVerificationRow(row)) {
      logCredentialError("pending_reoc_payload_invalid", {});
      return json({
        error: "Pending operator payload mismatch",
        code: "pending_reoc_payload_invalid",
      }, 500, cors);
    }
    parsedReocs.push(row);
  }

  if (parsedReocs.length === 0) {
    return json({ operators: [] }, 200, cors);
  }

  const ownerIds = [...new Set(parsedReocs.map((row) => row.owner_user_id))];
  const reocIds = parsedReocs.map((row) => row.id);

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ownerIds);
  if (profileError) {
    logCredentialError("pending_profiles_lookup_failed", {}, profileError);
    return json({
      error: "Failed to load operator profiles",
      code: "pending_profiles_lookup_failed",
    }, 500, cors);
  }

  const profileById = new Map<string, { fullName: string | null; email: string | null }>();
  if (Array.isArray(profiles)) {
    for (const profile of profiles) {
      if (!isRecord(profile) || typeof profile.id !== "string") continue;
      profileById.set(profile.id, {
        fullName: optionalText(profile.full_name),
        email: optionalText(profile.email),
      });
    }
  }

  const { data: files, error: fileError } = await admin
    .from("operator_credential_files")
    .select(
      "id, reoc_profile_id, uploaded_by, kind, storage_path, content_type, original_name, byte_size, confirmed_at, created_at",
    )
    .in("reoc_profile_id", reocIds);
  if (fileError) {
    logCredentialError("pending_files_lookup_failed", {}, fileError);
    return json({
      error: "Failed to load credential files",
      code: "pending_files_lookup_failed",
    }, 500, cors);
  }

  const filesByReoc = new Map<string, CredentialFileRow[]>();
  if (Array.isArray(files)) {
    for (const row of files) {
      if (!isCredentialFileRow(row)) {
        return json({
          error: "Credential payload mismatch",
          code: "credential_payload_invalid",
        }, 500, cors);
      }
      const existingFiles = filesByReoc.get(row.reoc_profile_id);
      if (existingFiles) {
        existingFiles.push(row);
      } else {
        filesByReoc.set(row.reoc_profile_id, [row]);
      }
    }
  }

  const allConfirmed = [...filesByReoc.values()]
    .flat()
    .filter((row) => typeof row.confirmed_at === "string" && row.confirmed_at.length > 0);
  const signedByPath = new Map<string, string>();
  const expiresAt = new Date(Date.now() + CREDENTIAL_SIGNED_GET_TTL_SECONDS * 1000).toISOString();
  if (allConfirmed.length > 0) {
    const paths = allConfirmed.map((row) => row.storage_path);
    const { data: signedRows, error: signedError } = await admin.storage
      .from(CREDENTIALS_BUCKET)
      .createSignedUrls(paths, CREDENTIAL_SIGNED_GET_TTL_SECONDS);
    if (signedError) {
      logCredentialError("pending_sign_batch_failed", { count: paths.length }, signedError);
      return json({
        error: "Failed to sign credential download URLs",
        code: "credential_sign_batch_failed",
      }, 500, cors);
    }
    const signedEntries: Array<SignedUrlEntry | null> = Array.isArray(signedRows)
      ? signedRows
      : [];
    for (let idx = 0; idx < allConfirmed.length; idx += 1) {
      const row = allConfirmed[idx]!;
      const signedUrl = resolveSignedUrl(signedEntries, row.storage_path, idx);
      if (signedUrl) {
        signedByPath.set(row.storage_path, attachmentUrl(signedUrl, row.original_name));
      }
    }
  }

  const operators = parsedReocs.map((reoc) => {
    const profile = profileById.get(reoc.owner_user_id);
    const reocFiles = filesByReoc.get(reoc.id);
    const credentialFiles = reocFiles
      ? reocFiles.map((row) => {
        const signed = signedByPath.get(row.storage_path);
        const downloadUrl = typeof signed === "string" ? signed : null;
        return {
          id: row.id,
          kind: row.kind,
          originalName: row.original_name,
          contentType: row.content_type,
          byteSize: row.byte_size,
          confirmedAt: row.confirmed_at,
          downloadUrl,
          expiresAt: downloadUrl ? expiresAt : null,
          expiresInSeconds: downloadUrl ? CREDENTIAL_SIGNED_GET_TTL_SECONDS : null,
        };
      })
      : [];
    return {
      reocId: reoc.id,
      ownerUserId: reoc.owner_user_id,
      fullName: profile?.fullName ?? null,
      email: profile?.email ?? null,
      arn: reoc.arn,
      reocNumber: reoc.reoc_number,
      verificationStatus: reoc.verification_status,
      verified: reoc.verified,
      files: credentialFiles,
    };
  });

  return json({ operators }, 200, cors);
}

export async function verifyOperator(
  reocId: string,
  req: Request,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, role, userId } = ctx;
  if (role !== "admin") return forbidden(cors);

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch (cause) {
    console.error("[admin-operator-verify]", "invalid_json", {
      kind: cause instanceof Error ? cause.name : typeof cause,
    });
    return json({
      error: "Invalid request body",
      code: "invalid_json",
      detail: "Request body must be valid JSON",
    }, 400, cors);
  }
  if (!isRecord(parsed)) {
    return json({
      error: "Invalid request body",
      code: "invalid_body",
      detail: "Expected a JSON object body",
    }, 400, cors);
  }

  const decision = parsed.decision;
  if (decision !== "approve" && decision !== "reject") {
    return json({
      error: "Invalid decision",
      code: "invalid_decision",
      detail: "decision must be approve or reject",
    }, 400, cors);
  }

  if (decision === "reject") {
    const reason = optionalText(parsed.reason);
    if (!reason) {
      return json({
        error: "Rejection reason required",
        code: "invalid_rejection_reason",
        detail: "Provide a non-empty reason when rejecting",
      }, 400, cors);
    }

    const { data, error } = await admin
      .from("reoc_profiles")
      .update({
        verification_status: "rejected",
        verified: false,
        rejection_reason: reason,
      })
      .eq("id", reocId)
      .eq("verification_status", "pending_review")
      .select("id");
    if (error) {
      logCredentialError("operator_reject_failed", { reocId }, error);
      return json({
        error: "Failed to reject operator",
        code: "operator_reject_failed",
      }, 500, cors);
    }
    if (!Array.isArray(data) || data.length === 0) {
      return notPendingReview(cors);
    }
    console.info("[admin-operator-verify]", "operator_rejected", { reocId, actorId: userId });
    return json({
      ok: true,
      reocId,
      decision: "reject",
      verificationStatus: "rejected",
      verified: false,
    }, 200, cors);
  }

  const { data: currentReoc, error: currentError } = await admin
    .from("reoc_profiles")
    .select("id, verification_status, verified")
    .eq("id", reocId)
    .maybeSingle();
  if (currentError) {
    logCredentialError("operator_approve_status_lookup_failed", { reocId }, currentError);
    return json({
      error: "Failed to load operator profile",
      code: "reoc_lookup_failed",
    }, 500, cors);
  }
  if (!isRecord(currentReoc) || currentReoc.verification_status !== "pending_review") {
    return notPendingReview(cors);
  }

  const { data: files, error: filesError } = await admin
    .from("operator_credential_files")
    .select("kind, confirmed_at")
    .eq("reoc_profile_id", reocId);
  if (filesError) {
    logCredentialError("operator_approve_files_lookup_failed", { reocId }, filesError);
    return json({
      error: "Failed to load credential files",
      code: "credential_lookup_failed",
    }, 500, cors);
  }
  if (!Array.isArray(files) || !hasAllRequiredCredentialsConfirmed(files)) {
    return json({
      error: "Operator credentials are incomplete",
      code: "credentials_incomplete",
      detail: "Approve requires a confirmed ReOC certificate, RePL, and certificate of currency",
    }, 409, cors);
  }

  const { data, error } = await admin
    .from("reoc_profiles")
    .update({
      verification_status: "verified",
      verified: true,
      rejection_reason: null,
    })
    .eq("id", reocId)
    .eq("verified", false)
    .eq("verification_status", "pending_review")
    .select("id");
  if (error) {
    logCredentialError("operator_approve_failed", { reocId }, error);
    return json({
      error: "Failed to approve operator",
      code: "operator_approve_failed",
    }, 500, cors);
  }
  if (!Array.isArray(data) || data.length === 0) {
    return notPendingReview(cors);
  }
  console.info("[admin-operator-verify]", "operator_approved", { reocId, actorId: userId });
  return json({
    ok: true,
    reocId,
    decision: "approve",
    verificationStatus: "verified",
    verified: true,
  }, 200, cors);
}
