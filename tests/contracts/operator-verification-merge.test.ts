import { describe, expect, it } from "vitest";
import type { VerificationStatus } from "@stravyx/types";
import {
  operatorCredentialUploadsLocked,
  operatorVerificationCopy,
} from "../../apps/app-web/src/lib/operatorVerificationCopy.ts";
import {
  mergeOperatorVerification,
  nextVerificationSeq,
} from "../../apps/app-web/src/lib/operatorVerificationMerge.ts";

function meSource(
  verificationStatus: VerificationStatus | null,
  verified: boolean | null,
  rejectionReason: string | null = null,
) {
  return { verificationStatus, verified, rejectionReason };
}

function listSnapshot(
  verificationStatus: VerificationStatus | null,
  verified: boolean | null = false,
) {
  return { verificationStatus, verified };
}

function derived(
  me: ReturnType<typeof meSource>,
  list: ReturnType<typeof listSnapshot> | null,
  freshness?: { meSeq: number; listSeq: number },
) {
  const merged = mergeOperatorVerification(me, list, freshness);
  return {
    merged,
    copy: operatorVerificationCopy(merged),
    uploadsLocked: operatorCredentialUploadsLocked(
      merged.verificationStatus,
      merged.verified,
    ),
  };
}

describe("mergeOperatorVerification", () => {
  it("prefers me rejected over stale list pending_review so uploads can be replaced", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("rejected", false, "ReOC certificate is unreadable"),
      listSnapshot("pending_review"),
    );
    expect(merged.verificationStatus).toBe("rejected");
    expect(merged.verified).toBe(false);
    expect(merged.rejectionReason).toBe("ReOC certificate is unreadable");
    expect(copy.tone).toBe("rejected");
    expect(copy.headline.toLowerCase()).toContain("rejected");
    expect(copy.body).toContain("ReOC certificate is unreadable");
    expect(uploadsLocked).toBe(false);
  });

  it("prefers me verified over stale list pending_review and locks uploads", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("verified", true),
      listSnapshot("pending_review"),
    );
    expect(merged.verificationStatus).toBe("verified");
    expect(merged.verified).toBe(true);
    expect(copy.tone).toBe("verified");
    expect(copy.body.toLowerCase()).toContain("stravyx admin");
    expect(uploadsLocked).toBe(true);
  });

  it("keeps list pending_review when me is still pending_docs after local submit", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("pending_docs", false),
      listSnapshot("pending_review"),
    );
    expect(merged.verificationStatus).toBe("pending_review");
    expect(merged.verified).toBe(false);
    expect(copy.tone).toBe("pending_review");
    expect(copy.body.toLowerCase()).toContain("admin review");
    expect(uploadsLocked).toBe(true);
  });

  it("does not regress list pending_review to me pending_docs", () => {
    const { merged, copy } = derived(
      meSource("pending_docs", false),
      listSnapshot("pending_review"),
    );
    expect(merged.verificationStatus).toBe("pending_review");
    expect(copy.tone).toBe("pending_review");
    expect(copy.tone).not.toBe("pending_docs");
  });

  it("uses me pending_review when the credentials list snapshot is null", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("pending_review", false),
      null,
    );
    expect(merged.verificationStatus).toBe("pending_review");
    expect(copy.tone).toBe("pending_review");
    expect(uploadsLocked).toBe(true);
  });

  it("still follows me rejected when a credentials refetch failed and left list pending_review", () => {
    const staleListAfterFailedRefetch = listSnapshot("pending_review");
    const { merged, copy, uploadsLocked } = derived(
      meSource("rejected", false, "Documents were unreadable."),
      staleListAfterFailedRefetch,
    );
    expect(merged.verificationStatus).toBe("rejected");
    expect(merged.rejectionReason).toBe("Documents were unreadable.");
    expect(copy.tone).toBe("rejected");
    expect(uploadsLocked).toBe(false);
  });

  it("uses me pending_review when list is pending_docs (admin-facing poll ahead of list)", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("pending_review", false),
      listSnapshot("pending_docs"),
    );
    expect(merged.verificationStatus).toBe("pending_review");
    expect(copy.tone).toBe("pending_review");
    expect(uploadsLocked).toBe(true);
  });

  it("prefers newer me rejected over older list pending_review so uploads unlock after admin reject", () => {
    const reason = "ReOC certificate is unreadable";
    const { merged, copy, uploadsLocked } = derived(
      meSource("rejected", false, reason),
      listSnapshot("pending_review"),
      { meSeq: 4, listSeq: 2 },
    );
    expect(merged.verificationStatus).toBe("rejected");
    expect(merged.verified).toBe(false);
    expect(merged.rejectionReason).toBe(reason);
    expect(copy.tone).toBe("rejected");
    expect(copy.headline.toLowerCase()).toContain("rejected");
    expect(copy.body).toContain(reason);
    expect(uploadsLocked).toBe(false);
  });

  it("prefers newer list pending_review over stale me rejected after resubmit", () => {
    const staleReason = "ReOC certificate is unreadable";
    const { merged, copy, uploadsLocked } = derived(
      meSource("rejected", false, staleReason),
      listSnapshot("pending_review"),
      { meSeq: 2, listSeq: 5 },
    );
    expect(merged.verificationStatus).toBe("pending_review");
    expect(merged.verified).toBe(false);
    expect(copy.tone).toBe("pending_review");
    expect(copy.tone).not.toBe("rejected");
    expect(copy.headline.toLowerCase()).not.toContain("rejected");
    expect(copy.headline).not.toContain(staleReason);
    expect(copy.body).not.toContain(staleReason);
    expect(copy.body.toLowerCase()).not.toMatch(/reason:/);
    expect(uploadsLocked).toBe(true);
  });

  it("prefers newer list rejected over stale me pending_review so uploads unlock", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("pending_review", false),
      listSnapshot("rejected"),
      { meSeq: 3, listSeq: 6 },
    );
    expect(merged.verificationStatus).toBe("rejected");
    expect(merged.verified).toBe(false);
    expect(copy.tone).toBe("rejected");
    expect(uploadsLocked).toBe(false);
  });

  it("prefers newer list pending_review over older me pending_docs after local submit", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("pending_docs", false),
      listSnapshot("pending_review"),
      { meSeq: 1, listSeq: 3 },
    );
    expect(merged.verificationStatus).toBe("pending_review");
    expect(merged.verified).toBe(false);
    expect(copy.tone).toBe("pending_review");
    expect(uploadsLocked).toBe(true);
  });

  it("prefers newer me pending_review over older list pending_docs", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("pending_review", false),
      listSnapshot("pending_docs"),
      { meSeq: 7, listSeq: 4 },
    );
    expect(merged.verificationStatus).toBe("pending_review");
    expect(copy.tone).toBe("pending_review");
    expect(uploadsLocked).toBe(true);
  });

  it("lets verified win regardless of seq when me is older verified", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("verified", true),
      listSnapshot("pending_review"),
      { meSeq: 1, listSeq: 9 },
    );
    expect(merged.verificationStatus).toBe("verified");
    expect(merged.verified).toBe(true);
    expect(copy.tone).toBe("verified");
    expect(uploadsLocked).toBe(true);
  });

  it("lets verified win regardless of seq when list is newer verified", () => {
    const { merged, copy, uploadsLocked } = derived(
      meSource("pending_review", false),
      listSnapshot("verified", true),
      { meSeq: 2, listSeq: 8 },
    );
    expect(merged.verificationStatus).toBe("verified");
    expect(merged.verified).toBe(true);
    expect(copy.tone).toBe("verified");
    expect(uploadsLocked).toBe(true);
  });

  it("falls through to rank when seqs are equal: me rejected beats list pending_review", () => {
    const reason = "ReOC certificate is unreadable";
    const { merged, copy, uploadsLocked } = derived(
      meSource("rejected", false, reason),
      listSnapshot("pending_review"),
      { meSeq: 4, listSeq: 4 },
    );
    expect(merged.verificationStatus).toBe("rejected");
    expect(merged.verified).toBe(false);
    expect(merged.rejectionReason).toBe(reason);
    expect(copy.tone).toBe("rejected");
    expect(copy.body).toContain(reason);
    expect(uploadsLocked).toBe(false);
  });
});

describe("nextVerificationSeq", () => {
  it("increments a shared clock and returns the new value", () => {
    const clock = { current: 0 };
    expect(nextVerificationSeq(clock)).toBe(1);
    expect(clock.current).toBe(1);
    expect(nextVerificationSeq(clock)).toBe(2);
    expect(clock.current).toBe(2);
  });

  it("stamps meSeq after four list confirms so admin reject unlocks uploads", () => {
    const clock = { current: 0 };
    let listSeq = 0;
    let meSeq = 0;
    for (let i = 0; i < 4; i += 1) {
      listSeq = nextVerificationSeq(clock);
    }
    meSeq = nextVerificationSeq(clock);
    expect(meSeq).toBeGreaterThan(listSeq);
    expect(listSeq).toBe(4);
    expect(meSeq).toBe(5);

    const reason = "ReOC certificate is unreadable";
    const { merged, copy, uploadsLocked } = derived(
      meSource("rejected", false, reason),
      listSnapshot("pending_review"),
      { meSeq, listSeq },
    );
    expect(merged.verificationStatus).toBe("rejected");
    expect(merged.verified).toBe(false);
    expect(merged.rejectionReason).toBe(reason);
    expect(copy.tone).toBe("rejected");
    expect(copy.headline.toLowerCase()).toContain("rejected");
    expect(copy.body).toContain(reason);
    expect(uploadsLocked).toBe(false);
  });

  it("stamps a later list pending_review so resubmit locks uploads again", () => {
    const clock = { current: 0 };
    let listSeq = 0;
    let meSeq = 0;
    for (let i = 0; i < 4; i += 1) {
      listSeq = nextVerificationSeq(clock);
    }
    meSeq = nextVerificationSeq(clock);
    listSeq = nextVerificationSeq(clock);
    expect(listSeq).toBeGreaterThan(meSeq);

    const staleReason = "ReOC certificate is unreadable";
    const { merged, copy, uploadsLocked } = derived(
      meSource("rejected", false, staleReason),
      listSnapshot("pending_review"),
      { meSeq, listSeq },
    );
    expect(merged.verificationStatus).toBe("pending_review");
    expect(merged.verified).toBe(false);
    expect(copy.tone).toBe("pending_review");
    expect(copy.tone).not.toBe("rejected");
    expect(copy.headline.toLowerCase()).not.toContain("rejected");
    expect(copy.headline).not.toContain(staleReason);
    expect(copy.body).not.toContain(staleReason);
    expect(uploadsLocked).toBe(true);
  });

  it("does not stamp listSeq when a list refetch is skipped (failed refetch)", () => {
    const clock = { current: 0 };
    let listSeq = 0;
    for (let i = 0; i < 4; i += 1) {
      listSeq = nextVerificationSeq(clock);
    }
    const meSeq = nextVerificationSeq(clock);
    expect(meSeq).toBeGreaterThan(listSeq);
    expect(clock.current).toBe(meSeq);

    const { merged, copy, uploadsLocked } = derived(
      meSource("rejected", false, "Documents were unreadable."),
      listSnapshot("pending_review"),
      { meSeq, listSeq },
    );
    expect(merged.verificationStatus).toBe("rejected");
    expect(copy.tone).toBe("rejected");
    expect(uploadsLocked).toBe(false);
    expect(listSeq).toBe(4);
    expect(meSeq).toBe(5);
  });
});
