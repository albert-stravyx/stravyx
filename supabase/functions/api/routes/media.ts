import {
  projectMediaForRole,
  type MissionMediaListItem,
} from "../mediaVisibility.ts";
import type { RequestContext } from "../client.ts";
import { json } from "../http.ts";
import {
  assertCanMutateMission,
  canTransitionDemoMissionStatus,
} from "../missionAuthz.ts";
import {
  attachmentUrl,
  isConfirmableMediaRow,
  isConfirmedMediaRow,
  isMediaRow,
  isStorageListItem,
  loadMissionForAccess,
  logRouteError,
  MEDIA_BUCKET,
  parseAppRole,
  parseJsonBody,
  resolveSignedUrl,
  sanitizeFilename,
  SIGNED_GET_URL_TTL_SECONDS,
  toMediaFile,
  type MediaRow,
  type SignedUrlEntry,
} from "./mediaShared.ts";

async function bestEffortResetMissionToFlown(
  missionId: string,
  admin: RequestContext["admin"],
): Promise<void> {
  const resetAt = new Date().toISOString();
  const { data, error } = await admin
    .from("missions")
    .update({ status: "flown", updated_at: resetAt })
    .eq("id", missionId)
    .eq("status", "delivered")
    .select("id");

  if (error) {
    logRouteError("release_media_failed_reset_failed", { missionId }, error);
    return;
  }
  if (!Array.isArray(data)) {
    logRouteError("release_media_failed_reset_payload_invalid", { missionId });
    return;
  }

  if (data.length === 0) {
    logRouteError("release_media_failed_reset_noop", { missionId });
    return;
  }

  console.warn("[media-route]", "release_media_failed_reset_applied", { missionId });
}

export async function createMediaUploadUrl(
  missionId: string,
  req: Request,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, userId, role } = ctx;
  const body = await parseJsonBody(req);
  if (!body) {
    return json({
      error: "Invalid request body",
      code: "invalid_body",
      detail: "Expected a JSON object body",
    }, 400, cors);
  }

  const filenameInput = body.filename;
  if (typeof filenameInput !== "string") {
    return json({
      error: "Invalid filename",
      code: "invalid_filename",
      detail: "filename must be a non-empty string",
    }, 400, cors);
  }

  const sanitizedFilename = sanitizeFilename(filenameInput);
  if (!sanitizedFilename) {
    return json({
      error: "Invalid filename",
      code: "invalid_filename",
      detail: "filename cannot be empty after sanitization",
    }, 400, cors);
  }

  const missionResult = await loadMissionForAccess(missionId, ctx);
  if (!missionResult.ok) return missionResult.response;
  const mission = missionResult.mission;

  const denied = await assertCanMutateMission(admin, mission, userId, role, cors);
  if (denied) {
    return json({
      error: "Forbidden",
      code: "forbidden_media_upload",
      detail: "Only assigned operator or admin can request upload URLs",
    }, 403, cors);
  }

  const mediaId = crypto.randomUUID();
  const storagePath = `missions/${missionId}/${mediaId}/${sanitizedFilename}`;
  const contentType = typeof body.contentType === "string" && body.contentType.trim()
    ? body.contentType.trim()
    : null;

  const { error: insertError } = await admin
    .from("media_files")
    .insert({
      id: mediaId,
      mission_id: missionId,
      uploaded_by: userId,
      kind: "raw",
      visibility: "held",
      storage_path: storagePath,
      content_type: contentType,
    });

  if (insertError) {
    logRouteError("media_insert_failed", { missionId, mediaId, userId }, insertError);
    return json({
      error: "Failed to create media record",
      code: "media_insert_failed",
    }, 500, cors);
  }

  const { data: uploadData, error: uploadError } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (uploadError || !uploadData) {
    await admin.from("media_files").delete().eq("id", mediaId);
    logRouteError("upload_url_create_failed", { missionId, mediaId }, uploadError);
    return json({
      error: "Failed to create upload URL",
      code: "upload_url_create_failed",
    }, 500, cors);
  }

  return json({
    mediaId,
    missionId,
    upload: uploadData,
  }, 200, cors);
}

export async function confirmMediaUpload(
  missionId: string,
  mediaId: string,
  req: Request,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, userId, role } = ctx;
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

  const originalNameRaw = body.originalName;
  if (typeof originalNameRaw !== "string" || !originalNameRaw.trim()) {
    return json({
      error: "Invalid original name",
      code: "invalid_original_name",
      detail: "originalName must be a non-empty string",
    }, 400, cors);
  }

  const contentTypeRaw = body.contentType;
  const contentType = typeof contentTypeRaw === "string" && contentTypeRaw.trim()
    ? contentTypeRaw.trim()
    : null;

  const missionResult = await loadMissionForAccess(missionId, ctx);
  if (!missionResult.ok) return missionResult.response;
  const mission = missionResult.mission;

  const denied = await assertCanMutateMission(admin, mission, userId, role, cors);
  if (denied) {
    return json({
      error: "Forbidden",
      code: "forbidden_media_confirm",
      detail: "Only assigned operator or admin can confirm uploads",
    }, 403, cors);
  }

  const { data: mediaData, error: mediaError } = await admin
    .from("media_files")
    .select("id, mission_id, uploaded_by, visibility, storage_path")
    .eq("id", mediaId)
    .eq("mission_id", missionId)
    .maybeSingle();

  if (mediaError) {
    logRouteError("media_lookup_failed", { missionId, mediaId }, mediaError);
    return json({
      error: "Failed to load media record",
      code: "media_lookup_failed",
    }, 500, cors);
  }
  if (!isConfirmableMediaRow(mediaData)) {
    if (!mediaData) {
      return json({
        error: "Media not found for mission",
        code: "media_not_found",
      }, 404, cors);
    }
    logRouteError("media_payload_invalid", { missionId, mediaId });
    return json({
      error: "Media payload shape mismatch",
      code: "media_payload_invalid",
    }, 500, cors);
  }

  const media = mediaData;

  if (role !== "admin" && media.uploaded_by !== userId) {
    return json({
      error: "Forbidden",
      code: "forbidden_media_confirm_uploader",
      detail: "Only the uploader or admin can confirm this media",
    }, 403, cors);
  }

  const storageParts = media.storage_path.split("/");
  const objectName = storageParts.pop();
  const parentPrefix = storageParts.join("/");
  if (!objectName || !parentPrefix) {
    logRouteError("storage_path_invalid", { missionId, mediaId, storagePath: media.storage_path });
    return json({
      error: "Media storage path is invalid",
      code: "storage_path_invalid",
    }, 500, cors);
  }

  const { data: storageEntries, error: storageListError } = await admin.storage
    .from(MEDIA_BUCKET)
    .list(parentPrefix, { limit: 100 });
  if (storageListError) {
    logRouteError("storage_list_failed", { missionId, mediaId }, storageListError);
    return json({
      error: "Failed to validate uploaded object",
      code: "storage_list_failed",
    }, 500, cors);
  }

  if (!Array.isArray(storageEntries)) {
    logRouteError("storage_payload_invalid", { missionId, mediaId });
    return json({
      error: "Storage payload shape mismatch",
      code: "storage_payload_invalid",
    }, 500, cors);
  }

  const objectEntry = storageEntries.find(
    (entry) => isStorageListItem(entry) && entry.name === objectName,
  );
  if (!objectEntry || !isStorageListItem(objectEntry)) {
    return json({
      error: "Uploaded object not found",
      code: "object_not_uploaded",
      detail: "Upload bytes before confirming media",
    }, 409, cors);
  }

  const storageSize = objectEntry.metadata?.size;
  if (typeof storageSize !== "number" || !Number.isFinite(storageSize) || storageSize < 0) {
    logRouteError("storage_size_invalid", { missionId, mediaId, objectName, storageSize });
    return json({
      error: "Storage object size is invalid",
      code: "storage_size_invalid",
    }, 500, cors);
  }
  const clientByteSize = Math.trunc(byteSizeRaw);
  const storedByteSize = Math.trunc(storageSize);
  if (storedByteSize !== clientByteSize) {
    console.warn("[media-route]", "media_confirm_size_mismatch", {
      missionId,
      mediaId,
      storedByteSize,
      clientByteSize,
    });
  }

  const confirmedAt = new Date().toISOString();
  const { data: updatedRows, error: updateError } = await admin
    .from("media_files")
    .update({
      byte_size: Math.trunc(storageSize),
      content_type: contentType,
      original_name: originalNameRaw.trim(),
      confirmed_at: confirmedAt,
    })
    .eq("id", mediaId)
    .eq("mission_id", missionId)
    .eq("visibility", "held")
    .select("id");

  if (updateError) {
    logRouteError("media_confirm_failed", { missionId, mediaId }, updateError);
    return json({
      error: "Failed to confirm upload",
      code: "media_confirm_failed",
    }, 500, cors);
  }
  if (!Array.isArray(updatedRows)) {
    logRouteError("media_confirm_payload_invalid", { missionId, mediaId });
    return json({
      error: "Media confirm payload mismatch",
      code: "media_confirm_payload_invalid",
    }, 500, cors);
  }
  if (updatedRows.length === 0) {
    return json({
      error: "Media file is no longer confirmable",
      code: "media_not_confirmable",
      detail: "Only held media can be confirmed",
    }, 409, cors);
  }

  return json({
    ok: true,
    missionId,
    mediaId,
    storedByteSize,
    clientByteSize,
  }, 200, cors);
}

export async function deliverMissionMedia(
  missionId: string,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, userId, role } = ctx;

  const missionResult = await loadMissionForAccess(missionId, ctx);
  if (!missionResult.ok) return missionResult.response;
  const mission = missionResult.mission;

  const denied = await assertCanMutateMission(admin, mission, userId, role, cors);
  if (denied) {
    return json({
      error: "Forbidden",
      code: "forbidden_mission_deliver",
      detail: "Only assigned operator or admin can deliver mission media",
    }, 403, cors);
  }

  if (!canTransitionDemoMissionStatus(mission.status, "delivered")) {
    return json({
      error: "Mission status does not allow delivery",
      code: "invalid_delivery_status",
      detail: "Mission must be flown before delivery",
      status: mission.status,
    }, 409, cors);
  }

  const { data: heldRows, error: heldError } = await admin
    .from("media_files")
    .select("id")
    .eq("mission_id", missionId)
    .eq("visibility", "held")
    .not("confirmed_at", "is", null);

  if (heldError) {
    logRouteError("held_media_lookup_failed", { missionId }, heldError);
    return json({
      error: "Failed to validate held media",
      code: "held_media_lookup_failed",
    }, 500, cors);
  }

  if (!heldRows || heldRows.length === 0) {
    return json({
      error: "No confirmed held media files to release",
      code: "no_confirmed_held_media",
      detail: "Confirm at least one uploaded file before delivery",
    }, 409, cors);
  }

  const releasedAt = new Date().toISOString();
  const { data: transitionedRows, error: missionUpdateError } = await admin
    .from("missions")
    .update({ status: "delivered", updated_at: releasedAt })
    .eq("id", missionId)
    .eq("status", "flown")
    .select("id");
  if (missionUpdateError) {
    logRouteError("mission_transition_failed", { missionId }, missionUpdateError);
    return json({
      error: "Failed to transition mission status",
      code: "mission_transition_failed",
    }, 500, cors);
  }
  if (!Array.isArray(transitionedRows)) {
    logRouteError("mission_transition_payload_invalid", { missionId });
    return json({
      error: "Mission transition payload mismatch",
      code: "mission_transition_payload_invalid",
    }, 500, cors);
  }
  if (transitionedRows.length === 0) {
    return json({
      error: "Mission not flown or already delivered",
      code: "mission_not_flown_or_already_delivered",
    }, 409, cors);
  }

  const { data: releasedRows, error: releaseError } = await admin
    .from("media_files")
    .update({
      visibility: "released",
      released_at: releasedAt,
    })
    .eq("mission_id", missionId)
    .eq("visibility", "held")
    .not("confirmed_at", "is", null)
    .select("id");

  if (releaseError) {
    logRouteError("release_media_failed", { missionId }, releaseError);
    await bestEffortResetMissionToFlown(missionId, admin);
    return json({
      error: "Failed to release mission media",
      code: "release_media_failed",
    }, 500, cors);
  }
  if (!Array.isArray(releasedRows)) {
    logRouteError("release_media_payload_invalid", { missionId });
    await bestEffortResetMissionToFlown(missionId, admin);
    return json({
      error: "Released media payload mismatch",
      code: "release_media_payload_invalid",
    }, 500, cors);
  }
  if (releasedRows.length === 0) {
    logRouteError("release_media_empty_after_transition", { missionId });
    await bestEffortResetMissionToFlown(missionId, admin);
    return json({
      error: "No confirmed held media were released",
      code: "release_media_empty_after_transition",
    }, 500, cors);
  }

  const { error: eventError } = await admin.from("mission_status_events").insert({
    mission_id: missionId,
    from_status: "flown",
    to_status: "delivered",
    actor_id: userId,
  });
  if (eventError) {
    logRouteError("mission_event_insert_failed", { missionId, userId }, eventError);
    return json({
      error: "Failed to write mission status event",
      code: "mission_event_insert_failed",
    }, 500, cors);
  }

  return json({
    ok: true,
    missionId,
    status: "delivered",
    releasedCount: releasedRows.length,
  }, 200, cors);
}

export async function listMissionMedia(
  missionId: string,
  ctx: RequestContext,
): Promise<Response> {
  const { cors, admin, userId } = ctx;
  const role = parseAppRole(ctx.role);

  const missionResult = await loadMissionForAccess(missionId, ctx);
  if (!missionResult.ok) return missionResult.response;
  const mission = missionResult.mission;

  if (role === "customer" && mission.customer_id !== userId) {
    return json({
      error: "Forbidden",
      code: "forbidden_media_list_customer",
      detail: "Customers can only view media for their own missions",
    }, 403, cors);
  }

  if (role === "operator") {
    const denied = await assertCanMutateMission(admin, mission, userId, role, cors);
    if (denied) {
      return json({
        error: "Forbidden",
        code: "forbidden_media_list_operator",
        detail: "Operators can only view media for assigned missions",
      }, 403, cors);
    }
  }

  let mediaQuery = admin
    .from("media_files")
    .select(
      "id, mission_id, uploaded_by, kind, visibility, byte_size, content_type, original_name, confirmed_at, released_at, created_at, storage_path",
    )
    .eq("mission_id", missionId)
    .order("created_at", { ascending: true });

  if (role === "customer") {
    mediaQuery = mediaQuery.eq("visibility", "released");
  }

  const { data: rows, error: mediaError } = await mediaQuery;
  if (mediaError) {
    logRouteError("media_list_failed", { missionId, role }, mediaError);
    return json({
      error: "Failed to load media files",
      code: "media_list_failed",
    }, 500, cors);
  }

  if (!Array.isArray(rows)) {
    return json({
      error: "Media list payload missing",
      code: "media_payload_missing",
    }, 500, cors);
  }

  const parsedRows: MediaRow[] = [];
  for (const maybeRow of rows) {
    if (!isMediaRow(maybeRow)) {
      logRouteError("media_payload_invalid", { missionId, role, payload: maybeRow });
      return json({
        error: "Media payload shape mismatch",
        code: "media_payload_invalid",
      }, 500, cors);
    }
    parsedRows.push(maybeRow);
  }

  if (parsedRows.length === 0) {
    return json({ media: [] as MissionMediaListItem[] }, 200, cors);
  }

  const confirmedRows = parsedRows.filter(isConfirmedMediaRow);
  if (confirmedRows.length === 0) {
    return json({ media: [] as MissionMediaListItem[] }, 200, cors);
  }

  const paths = confirmedRows.map((row) => row.storage_path);
  const { data: signedRows, error: signedError } = await admin.storage
    .from(MEDIA_BUCKET)
    .createSignedUrls(paths, SIGNED_GET_URL_TTL_SECONDS);

  if (signedError) {
    logRouteError("media_sign_batch_failed", { missionId, count: paths.length }, signedError);
    return json({
      error: "Failed to sign media download URLs",
      code: "media_sign_batch_failed",
    }, 500, cors);
  }

  const signedEntries: Array<SignedUrlEntry | null> = Array.isArray(signedRows)
    ? signedRows
    : [];
  const mediaResponse: MissionMediaListItem[] = [];
  const expiresAt = new Date(Date.now() + SIGNED_GET_URL_TTL_SECONDS * 1000).toISOString();
  for (let idx = 0; idx < confirmedRows.length; idx += 1) {
    const row = confirmedRows[idx]!;
    const signedUrl = resolveSignedUrl(signedEntries, row.storage_path, idx);
    if (!signedUrl) {
      logRouteError("media_sign_missing_url", { missionId, mediaId: row.id });
      continue;
    }
    const projected = projectMediaForRole(role, toMediaFile(row));
    if (!projected) continue;
    mediaResponse.push({
      ...projected,
      downloadUrl: attachmentUrl(signedUrl, row.original_name),
      expiresAt,
      expiresInSeconds: SIGNED_GET_URL_TTL_SECONDS,
    });
  }

  return json({ media: mediaResponse }, 200, cors);
}
