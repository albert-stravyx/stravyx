import type { RequestContext } from "../client.ts";
import { json } from "../http.ts";
import { assertCanMutateMission, canDeleteMediaFile } from "../missionAuthz.ts";
import {
  isConfirmableMediaRow,
  loadMissionForAccess,
  logRouteError,
  MEDIA_BUCKET,
  parseAppRole,
} from "./mediaShared.ts";

export async function deleteMissionMedia(
  missionId: string,
  mediaId: string,
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
      code: "forbidden_media_delete",
      detail: "Only assigned operator or admin can delete mission media",
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
        ok: true,
        missionId,
        mediaId,
        storageRemoved: false,
        cleanup: {
          code: "media_already_absent",
          detail: "Media row already absent; delete treated as idempotent success",
        },
      }, 200, cors);
    }
    logRouteError("media_payload_invalid", { missionId, mediaId });
    return json({
      error: "Media payload shape mismatch",
      code: "media_payload_invalid",
    }, 500, cors);
  }

  const media = mediaData;
  const canDelete = canDeleteMediaFile({
    role: parseAppRole(role),
    isUploader: media.uploaded_by === userId,
    visibility: media.visibility,
  });

  if (!canDelete) {
    if (media.visibility === "released") {
      return json({
        error: "Delivered media cannot be deleted",
        code: "media_already_released",
        detail: "Files released to the customer are immutable",
      }, 409, cors);
    }

    return json({
      error: "Forbidden",
      code: "forbidden_media_delete_uploader",
      detail: "Only the uploader or admin can delete this media",
    }, 403, cors);
  }

  const { data: deletedRows, error: deleteError } = await admin
    .from("media_files")
    .delete()
    .eq("id", mediaId)
    .eq("mission_id", missionId)
    .eq("visibility", "held")
    .select("id");

  if (deleteError) {
    logRouteError("media_delete_failed", { missionId, mediaId }, deleteError);
    return json({
      error: "Failed to delete media record",
      code: "media_delete_failed",
    }, 500, cors);
  }
  if (!Array.isArray(deletedRows)) {
    logRouteError("media_delete_payload_invalid", { missionId, mediaId });
    return json({
      error: "Media delete payload mismatch",
      code: "media_delete_payload_invalid",
    }, 500, cors);
  }
  if (deletedRows.length === 0) {
    return json({
      error: "Media file is no longer deletable",
      code: "media_not_deletable",
      detail: "File was released or removed concurrently",
    }, 409, cors);
  }

  const { error: storageDeleteError } = await admin.storage
    .from(MEDIA_BUCKET)
    .remove([media.storage_path]);
  if (storageDeleteError) {
    logRouteError("media_storage_delete_failed", { missionId, mediaId }, storageDeleteError);
    return json({
      ok: true,
      missionId,
      mediaId,
      storageRemoved: false,
      cleanup: {
        code: "media_storage_delete_failed",
        detail:
          "File record removed; the orphaned storage object is unreachable (private bucket) and needs admin cleanup",
      },
    }, 200, cors);
  }

  return json({
    ok: true,
    missionId,
    mediaId,
    storageRemoved: true,
  }, 200, cors);
}
