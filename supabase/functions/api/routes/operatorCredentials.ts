import type { RequestContext } from "../client.ts";
import { json } from "../http.ts";
import { type OperatorCredentialKind } from "../casaCredentials.ts";
import {
  alreadyVerifiedResponse,
  pendingReviewLockedResponse,
  attachmentUrl,
  canUploadForStatus,
  CREDENTIAL_MAX_BYTES,
  CREDENTIAL_SIGNED_GET_TTL_SECONDS,
  CREDENTIALS_BUCKET,
  credentialConfirmedPath,
  credentialStagingPath,
  isCredentialConfirmedPath,
  isCredentialFileRow,
  isRecord,
  loadReocForCaller,
  logCredentialError,
  logCredentialEvent,
  markPendingDocs,
  normalizeCredentialMime,
  parseJsonBody,
  parseOperatorCredentialKind,
  promoteIfComplete,
  rejectDisallowedMime,
  sanitizeFilename,
  splitStorageObjectPath,
  type CredentialFileRow,
} from "./operatorCredentialsShared.ts";

interface StorageListItem {
  name: string;
  metadata?: {
    size?: number;
    mimetype?: string;
    contentType?: string;
  } | null;
}

interface SignedUrlEntry {
  signedUrl?: string | null;
  path?: string | null;
}

function isStorageListItem(value: unknown): value is StorageListItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== "string") return false;
  const metadata = candidate.metadata;
  if (metadata === null || metadata === undefined) return true;
  if (typeof metadata !== "object" || Array.isArray(metadata)) return false;
  const meta = metadata as Record<string, unknown>;
  const sizeOk = typeof meta.size === "number" || meta.size === undefined;
  const mimeOk = typeof meta.mimetype === "string" || meta.mimetype === undefined;
  const contentTypeOk = typeof meta.contentType === "string" || meta.contentType === undefined;
  return sizeOk && mimeOk && contentTypeOk;
}

function storageReportedMime(entry: StorageListItem): string | null {
  const metadata = entry.metadata;
  if (!metadata) return null;
  if (typeof metadata.mimetype === "string") {
    return normalizeCredentialMime(metadata.mimetype);
  }
  if (typeof metadata.contentType === "string") {
    return normalizeCredentialMime(metadata.contentType);
  }
  return null;
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

function previousStoragePath(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return typeof value.storage_path === "string" && value.storage_path.length > 0
    ? value.storage_path
    : null;
}

function upsertedCredentialId(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return typeof value.id === "string" ? value.id : null;
}

export async function createOperatorCredentialUploadUrl(
  req: Request,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, userId, role } = ctx;
  if (role !== "operator") {
    return json({
      error: "Forbidden",
      code: "forbidden",
      detail: "Only the owning operator can upload credentials",
    }, 403, cors);
  }

  const body = await parseJsonBody(req);
  if (!body) {
    return json({
      error: "Invalid request body",
      code: "invalid_body",
      detail: "Expected a JSON object body",
    }, 400, cors);
  }

  const kind = parseOperatorCredentialKind(body.kind);
  if (!kind) {
    return json({
      error: "Invalid credential kind",
      code: "invalid_credential_kind",
      detail: "kind must be reoc_certificate, repl, or certificate_of_currency",
    }, 400, cors);
  }

  if (typeof body.filename !== "string") {
    return json({
      error: "Invalid filename",
      code: "invalid_filename",
      detail: "filename must be a non-empty string",
    }, 400, cors);
  }
  const sanitizedFilename = sanitizeFilename(body.filename);
  if (!sanitizedFilename) {
    return json({
      error: "Invalid filename",
      code: "invalid_filename",
      detail: "filename cannot be empty after sanitization",
    }, 400, cors);
  }

  const mime = normalizeCredentialMime(body.contentType);
  const mimeDenied = rejectDisallowedMime(mime, cors);
  if (mimeDenied) return mimeDenied;

  const loaded = await loadReocForCaller(ctx);
  if (!loaded.ok) return loaded.response;
  const reoc = loaded.reoc;

  if (reoc.verified || reoc.verification_status === "verified") {
    return alreadyVerifiedResponse(cors);
  }
  if (reoc.verification_status === "pending_review") {
    return pendingReviewLockedResponse(cors);
  }
  if (!canUploadForStatus(reoc.verification_status, reoc.verified)) {
    return alreadyVerifiedResponse(cors);
  }

  const stagingId = crypto.randomUUID();
  const storagePath = credentialStagingPath(reoc.id, kind, stagingId, sanitizedFilename);

  const { data: existing, error: existingError } = await admin
    .from("operator_credential_files")
    .select("id, storage_path")
    .eq("reoc_profile_id", reoc.id)
    .eq("kind", kind)
    .maybeSingle();
  if (existingError) {
    logCredentialError("credential_lookup_failed", { reocId: reoc.id, kind }, existingError);
    return json({
      error: "Failed to load credential record",
      code: "credential_lookup_failed",
    }, 500, cors);
  }
  const previousPath = previousStoragePath(existing);

  const { data: upserted, error: upsertError } = await admin
    .from("operator_credential_files")
    .upsert({
      reoc_profile_id: reoc.id,
      uploaded_by: userId,
      kind,
      storage_path: storagePath,
      content_type: mime,
      original_name: sanitizedFilename,
      byte_size: null,
      confirmed_at: null,
    }, { onConflict: "reoc_profile_id,kind" })
    .select("id")
    .single();
  const credentialId = upsertedCredentialId(upserted);
  if (upsertError || !credentialId) {
    logCredentialError("credential_upsert_failed", { reocId: reoc.id, kind }, upsertError);
    return json({
      error: "Failed to save credential record",
      code: "credential_upsert_failed",
    }, 500, cors);
  }

  if (previousPath && previousPath !== storagePath) {
    try {
      const { error: removeError } = await admin.storage
        .from(CREDENTIALS_BUCKET)
        .remove([previousPath]);
      if (removeError) {
        logCredentialError("credential_old_object_remove_failed", {
          reocId: reoc.id,
          kind,
        }, removeError);
      }
    } catch (cause) {
      logCredentialError("credential_old_object_remove_threw", {
        reocId: reoc.id,
        kind,
      }, cause);
    }
  }

  if (reoc.verification_status === "rejected") {
    await markPendingDocs(admin, reoc.id);
  }

  const { data: uploadData, error: uploadError } = await admin.storage
    .from(CREDENTIALS_BUCKET)
    .createSignedUploadUrl(storagePath);
  if (uploadError || !uploadData) {
    logCredentialError("upload_url_create_failed", { reocId: reoc.id, kind }, uploadError);
    return json({
      error: "Failed to create upload URL",
      code: "upload_url_create_failed",
    }, 500, cors);
  }

  logCredentialEvent("credential_upload", {
    reocId: reoc.id,
    kind,
    userId,
  });

  return json({
    id: credentialId,
    reocId: reoc.id,
    kind,
    upload: uploadData,
  }, 200, cors);
}

export async function confirmOperatorCredential(
  credentialId: string,
  req: Request,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, userId, role } = ctx;
  if (role !== "operator") {
    return json({
      error: "Forbidden",
      code: "forbidden",
      detail: "Only the owning operator can confirm credentials",
    }, 403, cors);
  }

  const body = await parseJsonBody(req);
  if (!body) {
    return json({
      error: "Invalid request body",
      code: "invalid_body",
      detail: "Expected a JSON object body",
    }, 400, cors);
  }

  const byteSizeRaw = body.byteSize;
  if (typeof byteSizeRaw !== "number" || !Number.isFinite(byteSizeRaw) || byteSizeRaw < 0) {
    return json({
      error: "Invalid byte size",
      code: "invalid_byte_size",
      detail: "byteSize must be a non-negative number",
    }, 400, cors);
  }
  if (Math.trunc(byteSizeRaw) > CREDENTIAL_MAX_BYTES) {
    return json({
      error: "File too large",
      code: "file_too_large",
      detail: "Credential files must be 10MB or smaller",
    }, 400, cors);
  }

  if (typeof body.originalName !== "string" || !body.originalName.trim()) {
    return json({
      error: "Invalid original name",
      code: "invalid_original_name",
      detail: "originalName must be a non-empty string",
    }, 400, cors);
  }

  const mime = normalizeCredentialMime(body.contentType);
  const mimeDenied = rejectDisallowedMime(mime, cors);
  if (mimeDenied) return mimeDenied;

  const loaded = await loadReocForCaller(ctx);
  if (!loaded.ok) return loaded.response;
  const reoc = loaded.reoc;
  if (reoc.verified || reoc.verification_status === "verified") {
    return alreadyVerifiedResponse(cors);
  }
  if (reoc.verification_status === "pending_review") {
    return pendingReviewLockedResponse(cors);
  }

  const { data: fileData, error: fileError } = await admin
    .from("operator_credential_files")
    .select(
      "id, reoc_profile_id, uploaded_by, kind, storage_path, content_type, original_name, byte_size, confirmed_at, created_at",
    )
    .eq("id", credentialId)
    .eq("reoc_profile_id", reoc.id)
    .maybeSingle();
  if (fileError) {
    logCredentialError("credential_lookup_failed", { credentialId }, fileError);
    return json({
      error: "Failed to load credential record",
      code: "credential_lookup_failed",
    }, 500, cors);
  }
  if (!isCredentialFileRow(fileData)) {
    if (!fileData) {
      return json({
        error: "Credential not found",
        code: "credential_not_found",
      }, 404, cors);
    }
    return json({
      error: "Credential payload mismatch",
      code: "credential_payload_invalid",
    }, 500, cors);
  }

  const file: CredentialFileRow = fileData;
  if (file.uploaded_by !== userId) {
    return json({
      error: "Forbidden",
      code: "forbidden",
      detail: "Only the uploader can confirm this credential",
    }, 403, cors);
  }

  const split = splitStorageObjectPath(file.storage_path);
  if (!split) {
    return json({
      error: "Credential storage path is invalid",
      code: "storage_path_invalid",
    }, 500, cors);
  }
  const confirmedPath = credentialConfirmedPath(
    reoc.id,
    file.kind,
    file.id,
    split.objectName,
  );

  if (
    typeof file.confirmed_at === "string" &&
    file.confirmed_at.length > 0 &&
    isCredentialConfirmedPath(file.storage_path, reoc.id, file.kind, file.id)
  ) {
    if (typeof file.byte_size !== "number" || !Number.isFinite(file.byte_size) || file.byte_size < 0) {
      return json({
        error: "Confirmed credential size is invalid",
        code: "storage_size_invalid",
      }, 500, cors);
    }
    return json({
      ok: true,
      id: credentialId,
      reocId: reoc.id,
      kind: file.kind,
      storedByteSize: Math.trunc(file.byte_size),
      clientByteSize: Math.trunc(byteSizeRaw),
    }, 200, cors);
  }

  const { data: storageEntries, error: storageListError } = await admin.storage
    .from(CREDENTIALS_BUCKET)
    .list(split.parentPrefix, { limit: 100 });
  if (storageListError) {
    logCredentialError("storage_list_failed", { credentialId }, storageListError);
    return json({
      error: "Failed to validate uploaded object",
      code: "storage_list_failed",
    }, 500, cors);
  }
  if (!Array.isArray(storageEntries)) {
    return json({
      error: "Storage payload shape mismatch",
      code: "storage_payload_invalid",
    }, 500, cors);
  }
  const objectEntry = storageEntries.find(
    (entry) => isStorageListItem(entry) && entry.name === split.objectName,
  );
  if (!objectEntry || !isStorageListItem(objectEntry)) {
    return json({
      error: "Uploaded object not found",
      code: "object_not_uploaded",
      detail: "Upload bytes before confirming credentials",
    }, 409, cors);
  }
  const storageSize = objectEntry.metadata?.size;
  if (typeof storageSize !== "number" || !Number.isFinite(storageSize) || storageSize < 0) {
    return json({
      error: "Storage object size is invalid",
      code: "storage_size_invalid",
    }, 500, cors);
  }
  if (Math.trunc(storageSize) > CREDENTIAL_MAX_BYTES) {
    return json({
      error: "File too large",
      code: "file_too_large",
      detail: "Credential files must be 10MB or smaller",
    }, 400, cors);
  }

  const reportedMime = storageReportedMime(objectEntry);
  if (reportedMime) {
    const storageMimeDenied = rejectDisallowedMime(reportedMime, cors);
    if (storageMimeDenied) return storageMimeDenied;
  }
  const persistedMime = reportedMime ? reportedMime : mime;

  let moveError: { message?: string } | null = null;
  try {
    const moved = await admin.storage
      .from(CREDENTIALS_BUCKET)
      .move(file.storage_path, confirmedPath);
    moveError = moved.error;
  } catch (cause) {
    logCredentialError("storage_move_threw", { credentialId }, cause);
    return json({
      error: "Failed to finalize uploaded object",
      code: "storage_move_failed",
    }, 500, cors);
  }
  if (moveError) {
    logCredentialError("storage_move_failed", { credentialId }, moveError);
    return json({
      error: "Failed to finalize uploaded object",
      code: "storage_move_failed",
    }, 500, cors);
  }

  const confirmedAt = new Date().toISOString();
  const { data: updatedRows, error: updateError } = await admin
    .from("operator_credential_files")
    .update({
      storage_path: confirmedPath,
      byte_size: Math.trunc(storageSize),
      content_type: persistedMime,
      original_name: body.originalName.trim(),
      confirmed_at: confirmedAt,
    })
    .eq("id", credentialId)
    .eq("reoc_profile_id", reoc.id)
    .select("id");
  if (updateError) {
    logCredentialError("credential_confirm_failed", { credentialId }, updateError);
    return json({
      error: "Failed to confirm credential",
      code: "credential_confirm_failed",
    }, 500, cors);
  }
  if (!Array.isArray(updatedRows) || updatedRows.length === 0) {
    return json({
      error: "Credential is no longer confirmable",
      code: "credential_not_confirmable",
    }, 409, cors);
  }

  await promoteIfComplete(admin, reoc.id);
  logCredentialEvent("credential_upload_confirmed", {
    reocId: reoc.id,
    credentialId,
    kind: file.kind,
    userId,
  });

  return json({
    ok: true,
    id: credentialId,
    reocId: reoc.id,
    kind: file.kind,
    storedByteSize: Math.trunc(storageSize),
    clientByteSize: Math.trunc(byteSizeRaw),
  }, 200, cors);
}

export async function listOperatorCredentials(
  req: Request,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, role } = ctx;
  const url = new URL(req.url);
  const adminReocId = role === "admin" ? url.searchParams.get("reocId") ?? undefined : undefined;
  const loaded = await loadReocForCaller(ctx, adminReocId);
  if (!loaded.ok) return loaded.response;
  const reoc = loaded.reoc;

  const { data: rows, error } = await admin
    .from("operator_credential_files")
    .select(
      "id, reoc_profile_id, uploaded_by, kind, storage_path, content_type, original_name, byte_size, confirmed_at, created_at",
    )
    .eq("reoc_profile_id", reoc.id);
  if (error) {
    logCredentialError("credential_list_failed", { reocId: reoc.id }, error);
    return json({
      error: "Failed to load credentials",
      code: "credential_list_failed",
    }, 500, cors);
  }
  if (!Array.isArray(rows)) {
    return json({
      error: "Credential list payload missing",
      code: "credential_payload_missing",
    }, 500, cors);
  }

  const parsed: CredentialFileRow[] = [];
  for (const row of rows) {
    if (!isCredentialFileRow(row)) {
      return json({
        error: "Credential payload mismatch",
        code: "credential_payload_invalid",
      }, 500, cors);
    }
    parsed.push(row);
  }

  const confirmed = parsed.filter(
    (row) => typeof row.confirmed_at === "string" && row.confirmed_at.length > 0,
  );
  const expiresAt = new Date(Date.now() + CREDENTIAL_SIGNED_GET_TTL_SECONDS * 1000).toISOString();
  const signedByPath = new Map<string, string>();
  if (confirmed.length > 0) {
    const paths = confirmed.map((row) => row.storage_path);
    const { data: signedRows, error: signedError } = await admin.storage
      .from(CREDENTIALS_BUCKET)
      .createSignedUrls(paths, CREDENTIAL_SIGNED_GET_TTL_SECONDS);
    if (signedError) {
      logCredentialError("credential_sign_batch_failed", { reocId: reoc.id }, signedError);
      return json({
        error: "Failed to sign credential download URLs",
        code: "credential_sign_batch_failed",
      }, 500, cors);
    }
    const signedEntries: Array<SignedUrlEntry | null> = Array.isArray(signedRows)
      ? signedRows
      : [];
    for (let idx = 0; idx < confirmed.length; idx += 1) {
      const row = confirmed[idx]!;
      const signedUrl = resolveSignedUrl(signedEntries, row.storage_path, idx);
      if (signedUrl) {
        signedByPath.set(row.storage_path, attachmentUrl(signedUrl, row.original_name));
      }
    }
  }

  const files = parsed.map((row) => {
    const downloadUrl = signedByPath.get(row.storage_path) ?? null;
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
  });

  return json({
    reocId: reoc.id,
    verificationStatus: reoc.verification_status,
    verified: reoc.verified,
    files,
  }, 200, cors);
}

export type { OperatorCredentialKind };
