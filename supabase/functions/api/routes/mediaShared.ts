import type { RequestContext } from "../client.ts";
import { json } from "../http.ts";
import type { AppRole, MediaFile } from "../mediaVisibility.ts";

export const MEDIA_BUCKET = "mission-media";
export const SIGNED_GET_URL_TTL_SECONDS = 600;

export interface MissionAccessRow {
  id: string;
  customer_id: string;
  assigned_reoc_id: string | null;
  status: string;
}

export interface MediaRow {
  id: string;
  mission_id: string;
  uploaded_by: string | null;
  kind: string;
  visibility: "held" | "released";
  byte_size: number | null;
  content_type: string | null;
  original_name: string | null;
  confirmed_at: string | null;
  released_at: string | null;
  created_at: string;
  storage_path: string;
}

export interface ConfirmableMediaRow {
  id: string;
  mission_id: string;
  uploaded_by: string | null;
  visibility: "held" | "released";
  storage_path: string;
}

export interface StorageListItem {
  name: string;
  metadata?: {
    size?: number;
  } | null;
}

export type MissionAccessResult =
  | { ok: true; mission: MissionAccessRow }
  | { ok: false; response: Response };

export function isMissionAccessRow(value: unknown): value is MissionAccessRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.customer_id === "string" &&
    typeof candidate.status === "string" &&
    (typeof candidate.assigned_reoc_id === "string" || candidate.assigned_reoc_id === null)
  );
}

export function isMediaRow(value: unknown): value is MediaRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const isVisibility = candidate.visibility === "held" || candidate.visibility === "released";
  return (
    typeof candidate.id === "string" &&
    typeof candidate.mission_id === "string" &&
    (typeof candidate.uploaded_by === "string" || candidate.uploaded_by === null) &&
    typeof candidate.kind === "string" &&
    isVisibility &&
    (typeof candidate.byte_size === "number" || candidate.byte_size === null) &&
    (typeof candidate.content_type === "string" || candidate.content_type === null) &&
    (typeof candidate.original_name === "string" || candidate.original_name === null) &&
    (typeof candidate.confirmed_at === "string" || candidate.confirmed_at === null) &&
    (typeof candidate.released_at === "string" || candidate.released_at === null) &&
    typeof candidate.created_at === "string" &&
    typeof candidate.storage_path === "string"
  );
}

export function isConfirmableMediaRow(value: unknown): value is ConfirmableMediaRow {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const isVisibility = candidate.visibility === "held" || candidate.visibility === "released";
  return (
    typeof candidate.id === "string" &&
    typeof candidate.mission_id === "string" &&
    (typeof candidate.uploaded_by === "string" || candidate.uploaded_by === null) &&
    isVisibility &&
    typeof candidate.storage_path === "string"
  );
}

export function isStorageListItem(value: unknown): value is StorageListItem {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.name !== "string") {
    return false;
  }
  const metadata = candidate.metadata;
  if (metadata === null || metadata === undefined) {
    return true;
  }
  if (typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }
  const size = (metadata as Record<string, unknown>).size;
  return typeof size === "number" || size === undefined;
}

export function parseAppRole(rawRole: string): AppRole {
  if (rawRole === "admin") return "admin";
  if (rawRole === "operator") return "operator";
  return "customer";
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

export function logRouteError(
  code: string,
  context: Record<string, unknown>,
  cause?: unknown,
): void {
  console.error("[media-route]", code, { ...context, cause });
}

export function attachmentUrl(url: string, originalName: string | null): string {
  const parsed = new URL(url);
  const sanitizedDownloadName = originalName ? sanitizeFilename(originalName) : "";
  parsed.searchParams.set("download", sanitizedDownloadName || "true");
  return parsed.toString();
}

function asObject(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return null;
  }
  return input as Record<string, unknown>;
}

export async function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const parsed = await req.json();
    return asObject(parsed);
  } catch {
    return null;
  }
}

export async function loadMissionForAccess(
  missionId: string,
  ctx: RequestContext,
): Promise<MissionAccessResult> {
  const { admin, cors } = ctx;
  const { data, error } = await admin
    .from("missions")
    .select("id, customer_id, assigned_reoc_id, status")
    .eq("id", missionId)
    .maybeSingle();

  if (error) {
    logRouteError("mission_lookup_failed", { missionId }, error);
    return {
      ok: false,
      response: json({
        error: "Failed to load mission",
        code: "mission_lookup_failed",
      }, 500, cors),
    };
  }

  if (!data) {
    return {
      ok: false,
      response: json({ error: "Mission not found", code: "mission_not_found" }, 404, cors),
    };
  }

  if (!isMissionAccessRow(data)) {
    logRouteError("mission_payload_invalid", { missionId });
    return {
      ok: false,
      response: json({
        error: "Mission payload shape mismatch",
        code: "mission_payload_invalid",
      }, 500, cors),
    };
  }

  return { ok: true, mission: data };
}

export function toMediaFile(row: MediaRow): MediaFile {
  return {
    id: row.id,
    missionId: row.mission_id,
    uploadedBy: row.uploaded_by,
    kind: row.kind,
    visibility: row.visibility,
    byteSize: row.byte_size,
    contentType: row.content_type,
    originalName: row.original_name,
    confirmedAt: row.confirmed_at,
    releasedAt: row.released_at,
    createdAt: row.created_at,
  };
}

export interface SignedUrlEntry {
  signedUrl?: string | null;
  path?: string | null;
}

export function isConfirmedMediaRow(row: MediaRow): boolean {
  return typeof row.confirmed_at === "string" && row.confirmed_at.length > 0;
}

export function resolveSignedUrl(
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
