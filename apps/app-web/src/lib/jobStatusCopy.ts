import type { JobStatus } from "../stravyx/types";

/** Customer-facing coarse-status copy. `accepted` is assigned, not en route. */
export function customerJobStatusLabel(status: JobStatus): string {
  switch (status) {
    case "pending":
      return "Finding Operator";
    case "accepted":
      return "Operator Assigned";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
  }
}

export function customerActiveJobBanner(status: JobStatus): string {
  switch (status) {
    case "pending":
      return "Finding operator…";
    case "accepted":
      return "Operator assigned";
    case "in_progress":
      return "In progress";
    case "completed":
      return "Completed";
  }
}

export function trackJobHeaderTitle(status: JobStatus): string {
  if (status === "completed") return "Job Complete";
  if (status === "in_progress") return "Live Tracking";
  if (status === "accepted") return "Operator Assigned";
  return "Finding Operator";
}

export function trackJobMapBadge(status: JobStatus): string | null {
  switch (status) {
    case "pending":
      return "Finding operator…";
    case "accepted":
      return "Operator assigned";
    case "in_progress":
      return "Mission active";
    case "completed":
      return null;
  }
}

/** Index into TrackJob STEPS (0-based). accepted stays on Operator Assigned. */
export function statusToActiveStep(status: JobStatus): number {
  switch (status) {
    case "pending":
      return 1;
    case "accepted":
      return 2;
    case "in_progress":
      return 5;
    case "completed":
      return 7;
  }
}

export function statusToOverallPercent(status: JobStatus): number {
  switch (status) {
    case "pending":
      return 13;
    case "accepted":
      return 25;
    case "in_progress":
      return 65;
    case "completed":
      return 100;
  }
}
