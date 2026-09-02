/** Demo status transitions allowed via POST /missions/:id/status. */
export const DEMO_MISSION_STATUSES = [
  "allocated",
  "flown",
  "delivered",
] as const;

export type DemoMissionStatus = (typeof DEMO_MISSION_STATUSES)[number];

export function isDemoStatusTransition(status: string): status is DemoMissionStatus {
  return (DEMO_MISSION_STATUSES as readonly string[]).includes(status);
}

export function canTransitionDemoMissionStatus(
  fromStatus: string,
  toStatus: DemoMissionStatus,
): boolean {
  if (toStatus === "delivered") {
    return fromStatus === "flown";
  }
  return true;
}

/**
 * Whether the actor may mutate assigned mission state/media.
 * Keep in sync with supabase/functions/api/missionAuthz.ts.
 */
export function canMutateAssignedMission(input: {
  role: string;
  assignedReocId: string | null | undefined;
  /** Caller's reoc_profiles.id when role is operator; otherwise ignored. */
  operatorReocId: string | null | undefined;
}): boolean {
  if (input.role === "admin") return true;
  if (input.role === "operator") {
    return Boolean(
      input.assignedReocId &&
        input.operatorReocId &&
        input.assignedReocId === input.operatorReocId,
    );
  }
  return false;
}

/**
 * Whether the actor may delete an uploaded media file.
 * Keep in sync with supabase/functions/api/missionAuthz.ts.
 */
export function canDeleteMediaFile(input: {
  role: string;
  /** True when the acting user is the uploader of the media file. */
  isUploader: boolean;
  visibility: "held" | "released";
}): boolean {
  if (input.visibility === "released") return false;
  if (input.role === "admin") return true;
  if (input.role === "operator") return input.isUploader;
  return false;
}
