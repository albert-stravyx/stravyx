/** Keep in sync with packages/types/src/visibility.ts. */

export type AppRole = "customer" | "operator" | "admin";
export type MediaVisibility = "held" | "released";

export interface MediaFile {
  id: string;
  missionId: string;
  uploadedBy: string | null;
  kind: string;
  visibility: MediaVisibility;
  byteSize: number | null;
  contentType: string | null;
  originalName: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface CustomerMediaProjection {
  id: string;
  missionId: string;
  kind: string;
  visibility: "released";
  byteSize: number | null;
  contentType: string | null;
  originalName: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface OperatorMediaProjection {
  id: string;
  missionId: string;
  uploadedBy: string | null;
  kind: string;
  visibility: MediaVisibility;
  byteSize: number | null;
  contentType: string | null;
  originalName: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export type AdminMediaProjection = OperatorMediaProjection;
export type MediaProjection =
  | CustomerMediaProjection
  | OperatorMediaProjection
  | AdminMediaProjection;

export type MissionMediaListItem = MediaProjection & {
  downloadUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
};

export function projectMediaForRole(
  role: AppRole,
  media: MediaFile,
): MediaProjection | null {
  if (role === "customer") {
    if (media.visibility !== "released") {
      return null;
    }
    const customerProjection: CustomerMediaProjection = {
      id: media.id,
      missionId: media.missionId,
      kind: media.kind,
      visibility: "released",
      byteSize: media.byteSize,
      contentType: media.contentType,
      originalName: media.originalName,
      confirmedAt: media.confirmedAt,
      releasedAt: media.releasedAt,
      createdAt: media.createdAt,
    };
    return customerProjection;
  }

  const operatorProjection: OperatorMediaProjection = {
    id: media.id,
    missionId: media.missionId,
    uploadedBy: media.uploadedBy,
    kind: media.kind,
    visibility: media.visibility,
    byteSize: media.byteSize,
    contentType: media.contentType,
    originalName: media.originalName,
    confirmedAt: media.confirmedAt,
    releasedAt: media.releasedAt,
    createdAt: media.createdAt,
  };

  if (role === "admin") {
    const adminProjection: AdminMediaProjection = operatorProjection;
    return adminProjection;
  }

  return operatorProjection;
}
