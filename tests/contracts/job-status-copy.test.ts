import { describe, expect, it } from "vitest";
import {
  customerActiveJobBanner,
  customerJobStatusLabel,
  statusToActiveStep,
  trackJobHeaderTitle,
  trackJobMapBadge,
} from "../../apps/app-web/src/lib/jobStatusCopy.ts";

describe("job status copy", () => {
  it("labels accepted as Operator Assigned, not En Route", () => {
    expect(customerJobStatusLabel("accepted")).toBe("Operator Assigned");
    expect(customerActiveJobBanner("accepted")).toBe("Operator assigned");
    expect(trackJobMapBadge("accepted")).toBe("Operator assigned");
    expect(trackJobHeaderTitle("accepted")).toBe("Operator Assigned");
    expect(statusToActiveStep("accepted")).toBe(2);
  });

  it("reserves Live Tracking and mission-active copy for in_progress", () => {
    expect(trackJobHeaderTitle("in_progress")).toBe("Live Tracking");
    expect(trackJobMapBadge("in_progress")).toBe("Mission active");
    expect(customerActiveJobBanner("in_progress")).toBe("In progress");
    expect(statusToActiveStep("in_progress")).toBe(5);
  });

  it("does not show Live Tracking while still finding an operator", () => {
    expect(trackJobHeaderTitle("pending")).toBe("Finding Operator");
    expect(trackJobMapBadge("pending")).toBe("Finding operator…");
  });
});
