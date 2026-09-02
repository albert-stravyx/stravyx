//
// Regression: customer TrackJob CompleteCard stays mounted across
// flown → delivered. `isDownloadMediaReleased` is the reload signal
// passed into DownloadPanel (`released`). Root Vitest cannot resolve
// `react` from tests/contracts (it is an app-web dependency), so this
// file must not import react, Testing Library, or the TSX panel.
// The panel's effect deps are `[load, released]`; the helper is the
// contract for when that flag is true.
import { describe, expect, it } from "vitest";
import { isDownloadMediaReleased } from "../../apps/app-web/src/lib/downloadPanelReleased.ts";
import { isLatestInFlightFetch } from "../../apps/app-web/src/lib/isLatestInFlightFetch.ts";

describe("isDownloadMediaReleased", () => {
  it("is true only for delivered", () => {
    expect(isDownloadMediaReleased(undefined)).toBe(false);
    expect(isDownloadMediaReleased("flown")).toBe(false);
    expect(isDownloadMediaReleased("accepted")).toBe(false);
    expect(isDownloadMediaReleased("delivered")).toBe(true);
  });
});

describe("isLatestInFlightFetch (DownloadPanel loading-clear gate)", () => {
  it("does not clear loading when this fetchSeq is behind the latest started seq", () => {
    expect(isLatestInFlightFetch(1, 2)).toBe(false);
  });

  it("clears loading when this fetchSeq is the latest started seq", () => {
    expect(isLatestInFlightFetch(2, 2)).toBe(true);
  });

  it("only the matching seq clears after a newer fetch has finished", () => {
    const latestInFlightSeqAfterNewerFinished = 2;
    expect(isLatestInFlightFetch(1, latestInFlightSeqAfterNewerFinished)).toBe(
      false,
    );
    expect(isLatestInFlightFetch(2, latestInFlightSeqAfterNewerFinished)).toBe(
      true,
    );
  });
});
