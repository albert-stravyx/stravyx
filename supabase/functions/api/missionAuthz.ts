import { json } from "./http.ts";
import type { ServiceClient } from "./client.ts";

/** Keep in sync with packages/types/src/mission-authz.ts */
const DEMO_MISSION_STATUSES = ["allocated", "flown", "delivered"] as const;

export function isDemoStatusTransition(status: string): boolean {
  return (DEMO_MISSION_STATUSES as readonly string[]).includes(status);
}

export function canTransitionDemoMissionStatus(
  fromStatus: string,
  toStatus: string,
): boolean {
  if (toStatus === "delivered") {
    return fromStatus === "flown";
  }
  return true;
}

export function canMutateAssignedMission(input: {
  role: string;
  assignedReocId: string | null | undefined;
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

/** Keep in sync with packages/types/src/mission-authz.ts */
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

export async function operatorReocIdForUser(
  admin: ServiceClient,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("reoc_profiles")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function assertCanMutateMission(
  admin: ServiceClient,
  mission: { assigned_reoc_id?: string | null },
  userId: string,
  role: string,
  cors: Record<string, string>,
): Promise<Response | null> {
  let operatorReocId: string | null = null;
  if (role === "operator") {
    operatorReocId = await operatorReocIdForUser(admin, userId);
  }
  if (
    !canMutateAssignedMission({
      role,
      assignedReocId: mission.assigned_reoc_id,
      operatorReocId,
    })
  ) {
    return json({ error: "Forbidden" }, 403, cors);
  }
  return null;
}
