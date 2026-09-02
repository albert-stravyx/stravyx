import type { MissionStatus } from "@stravyx/types";

/**
 * Customer download panel treats media as released only after the mission
 * is `delivered`. Edge still projects the list; this flag is a reload
 * trigger, not a client-side visibility filter.
 */
export function isDownloadMediaReleased(
  missionStatus: MissionStatus | undefined,
): boolean {
  return missionStatus === "delivered";
}
