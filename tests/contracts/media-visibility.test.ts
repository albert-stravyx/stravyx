import { describe, expect, it } from "vitest";
import {
  canMutateAssignedMission,
  projectMediaForRole,
  type AppRole,
  type MediaFile,
  type MediaProjection,
} from "@stravyx/types";

const FORBIDDEN_MEDIA_PROJECTION_KEYS = [
  "storage_path",
  "storagePath",
] as const;

/** Emulates assertNoLeak for media payloads — storage paths must never surface. */
function assertNoMediaStorageLeak(payload: object): void {
  const present = new Map<string, unknown>(Object.entries(payload));
  for (const key of FORBIDDEN_MEDIA_PROJECTION_KEYS) {
    if (present.has(key) && present.get(key) !== undefined) {
      throw new Error(`Media visibility leak: field=${key}`);
    }
  }
}

function makeMediaFile(overrides: Partial<MediaFile> = {}): MediaFile {
  return {
    id: "media-1",
    missionId: "mission-1",
    uploadedBy: "operator-user-1",
    kind: "photo",
    visibility: "held",
    byteSize: 1024,
    contentType: "image/jpeg",
    originalName: "site-photo.jpg",
    confirmedAt: null,
    releasedAt: null,
    createdAt: "2026-08-22T00:00:00.000Z",
    ...overrides,
  };
}

function projectMediaListForRole(
  role: AppRole,
  media: MediaFile[],
): MediaProjection[] {
  return media
    .map((file) => projectMediaForRole(role, file))
    .filter((projected): projected is MediaProjection => projected !== null);
}

describe("media visibility firewall", () => {
  describe("projectMediaForRole — customer", () => {
    it("projects released files without storage_path", () => {
      const file = makeMediaFile({
        visibility: "released",
        releasedAt: "2026-08-22T01:00:00.000Z",
      });
      const view = projectMediaForRole("customer", file);
      expect(view).not.toBeNull();
      assertNoMediaStorageLeak(view!);
      expect(view!.visibility).toBe("released");
      expect(view!.originalName).toBe("site-photo.jpg");
    });

    it("returns null for held files (customer never receives held)", () => {
      expect(projectMediaForRole("customer", makeMediaFile())).toBeNull();
    });

    it("returns empty list when all files are held", () => {
      const heldOnly = [
        makeMediaFile({ id: "media-held-1" }),
        makeMediaFile({ id: "media-held-2", kind: "video" }),
      ];
      expect(projectMediaListForRole("customer", heldOnly)).toEqual([]);
    });

    it("returns empty list for empty input", () => {
      expect(projectMediaListForRole("customer", [])).toEqual([]);
    });

    it("filters to released only in mixed held/released lists", () => {
      const mixed = [
        makeMediaFile({ id: "held-1", visibility: "held" }),
        makeMediaFile({
          id: "released-1",
          visibility: "released",
          releasedAt: "2026-08-22T01:00:00.000Z",
        }),
        makeMediaFile({ id: "held-2", visibility: "held", kind: "video" }),
      ];
      const views = projectMediaListForRole("customer", mixed);
      expect(views).toHaveLength(1);
      expect(views[0]!.id).toBe("released-1");
      for (const view of views) {
        assertNoMediaStorageLeak(view);
        expect(view.visibility).toBe("released");
      }
    });

    it("projects unconfirmed metadata (null byte_size/content_type)", () => {
      const file = makeMediaFile({
        visibility: "released",
        releasedAt: "2026-08-22T01:00:00.000Z",
        byteSize: null,
        contentType: null,
        originalName: null,
      });
      const view = projectMediaForRole("customer", file);
      expect(view).not.toBeNull();
      expect(view!.byteSize).toBeNull();
      expect(view!.contentType).toBeNull();
      expect(view!.originalName).toBeNull();
      assertNoMediaStorageLeak(view!);
    });

    it("detects storage_path leak payloads", () => {
      expect(() =>
        assertNoMediaStorageLeak({
          id: "media-1",
          storage_path: "missions/m1/secret.jpg",
        }),
      ).toThrow(/storage_path/);
      expect(() =>
        assertNoMediaStorageLeak({
          id: "media-1",
          storagePath: "missions/m1/secret.jpg",
        }),
      ).toThrow(/storagePath/);
    });
  });

  describe("projectMediaForRole — operator", () => {
    it("includes held files with full operator fields (no storage_path)", () => {
      const view = projectMediaForRole("operator", makeMediaFile());
      expect(view).not.toBeNull();
      assertNoMediaStorageLeak(view!);
      expect(view!.visibility).toBe("held");
      expect(view!.uploadedBy).toBe("operator-user-1");
      expect(view!.confirmedAt).toBeNull();
    });

    it("includes released files for operator", () => {
      const file = makeMediaFile({
        visibility: "released",
        releasedAt: "2026-08-22T01:00:00.000Z",
      });
      const view = projectMediaForRole("operator", file);
      expect(view!.visibility).toBe("released");
      assertNoMediaStorageLeak(view!);
    });

    it("does not filter by mission assignment (authz is separate)", () => {
      const otherMissionFile = makeMediaFile({ missionId: "mission-other" });
      const view = projectMediaForRole("operator", otherMissionFile);
      expect(view).not.toBeNull();
      expect(view!.missionId).toBe("mission-other");
    });
  });

  describe("projectMediaForRole — admin", () => {
    it("sees held files including quarantined visibility", () => {
      const view = projectMediaForRole("admin", makeMediaFile());
      expect(view).not.toBeNull();
      assertNoMediaStorageLeak(view!);
      expect(view!.visibility).toBe("held");
    });

    it("sees released files", () => {
      const file = makeMediaFile({
        visibility: "released",
        releasedAt: "2026-08-22T01:00:00.000Z",
      });
      const view = projectMediaForRole("admin", file);
      expect(view!.visibility).toBe("released");
    });

    it("sees all files in mixed held/released lists", () => {
      const mixed = [
        makeMediaFile({ id: "held-1", visibility: "held" }),
        makeMediaFile({
          id: "released-1",
          visibility: "released",
          releasedAt: "2026-08-22T01:00:00.000Z",
        }),
      ];
      const views = projectMediaListForRole("admin", mixed);
      expect(views).toHaveLength(2);
      expect(views.map((v) => v.visibility)).toEqual(["held", "released"]);
    });
  });

  describe("operator media access authz (not projector-scoped)", () => {
    const assigned = "reoc-assigned";
    const other = "reoc-other";

    it("denies operator without assignment match (another operator's mission)", () => {
      expect(
        canMutateAssignedMission({
          role: "operator",
          assignedReocId: assigned,
          operatorReocId: other,
        }),
      ).toBe(false);
    });

    it("allows assigned operator to access mission media", () => {
      expect(
        canMutateAssignedMission({
          role: "operator",
          assignedReocId: assigned,
          operatorReocId: assigned,
        }),
      ).toBe(true);
    });
  });
});
