import { describe, expect, it } from "vitest";
import {
  PLATFORM_DURATION_MINUTES,
  formatEstimatedFlightTime,
} from "../../apps/app-web/src/lib/platformDuration.ts";

describe("platform duration", () => {
  it("is a 60 minute estimate shown as output copy", () => {
    expect(PLATFORM_DURATION_MINUTES).toBe(60);
    expect(formatEstimatedFlightTime(PLATFORM_DURATION_MINUTES)).toBe(
      "Estimated flight time: 60 min",
    );
  });
});
