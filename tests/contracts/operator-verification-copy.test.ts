import { describe, expect, it } from "vitest";
import {
  canonicalOperatorSignupCredentials,
  CREDENTIAL_KIND_LABELS,
  credentialFileClientError,
  inferCredentialMime,
  OPERATOR_NOT_VERIFIED_TOAST,
  operatorSignupFieldErrors,
  operatorVerificationCopy,
  operatorCredentialUploadsLocked,
  requiredCredentialKinds,
} from "../../apps/app-web/src/lib/operatorVerificationCopy.ts";

function allCopyBlobs(): string {
  const pendingDocs = operatorVerificationCopy({
    verificationStatus: "pending_docs",
    verified: false,
    rejectionReason: null,
  });
  const pendingReview = operatorVerificationCopy({
    verificationStatus: "pending_review",
    verified: false,
    rejectionReason: null,
  });
  const rejected = operatorVerificationCopy({
    verificationStatus: "rejected",
    verified: false,
    rejectionReason: "Documents were unreadable.",
  });
  const verified = operatorVerificationCopy({
    verificationStatus: "verified",
    verified: true,
    rejectionReason: null,
  });
  const unknown = operatorVerificationCopy({
    verificationStatus: null,
    verified: false,
    rejectionReason: null,
  });
  return [
    pendingDocs.headline,
    pendingDocs.body,
    pendingDocs.statusLabel,
    pendingReview.headline,
    pendingReview.body,
    pendingReview.statusLabel,
    rejected.headline,
    rejected.body,
    rejected.statusLabel,
    verified.headline,
    verified.body,
    verified.statusLabel,
    unknown.headline,
    unknown.body,
    unknown.statusLabel,
    OPERATOR_NOT_VERIFIED_TOAST,
    ...Object.values(CREDENTIAL_KIND_LABELS),
    operatorSignupFieldErrors("bad", "bad").arn,
    operatorSignupFieldErrors("bad", "bad").reocNumber,
  ].join("\n");
}

describe("operator verification copy", () => {
  it("is honest for pending and rejected states", () => {
    const pendingDocs = operatorVerificationCopy({
      verificationStatus: "pending_docs",
      verified: false,
      rejectionReason: null,
    });
    expect(pendingDocs.headline).toBe("Not verified");
    expect(pendingDocs.body.toLowerCase()).toContain("not verified");
    expect(pendingDocs.body).toContain("ReOC certificate");
    expect(pendingDocs.body).toContain("RePL");
    expect(pendingDocs.body).toContain("certificate of currency");
    expect(pendingDocs.body.toLowerCase()).not.toContain("casa connected");
    expect(pendingDocs.body.toLowerCase()).not.toContain("licence valid");

    const pendingReview = operatorVerificationCopy({
      verificationStatus: "pending_review",
      verified: false,
      rejectionReason: null,
    });
    expect(pendingReview.body.toLowerCase()).toContain("admin review");
    expect(pendingReview.body.toLowerCase()).toContain("cannot accept");

    const rejected = operatorVerificationCopy({
      verificationStatus: "rejected",
      verified: false,
      rejectionReason: "ReOC certificate is unreadable",
    });
    expect(rejected.headline.toLowerCase()).toContain("rejected");
    expect(rejected.body).toContain("ReOC certificate is unreadable");
    expect(rejected.body.toLowerCase()).toMatch(/re-upload|resubmit/);
  });

  it("does not include fake CASA validity or an invented ARN", () => {
    const blob = allCopyBlobs();
    expect(blob).not.toContain("270 days");
    expect(blob).not.toContain("2024-0078415");
  });

  it("describes verified as a Stravyx admin check, not a live CASA API", () => {
    const verified = operatorVerificationCopy({
      verificationStatus: "verified",
      verified: true,
      rejectionReason: null,
    });
    expect(verified.body.toLowerCase()).toContain("stravyx admin");
    expect(verified.body.toLowerCase()).toContain("not a live casa");
  });

  it("locks uploads after submit-for-review and after admin verify", () => {
    expect(operatorCredentialUploadsLocked("pending_docs", false)).toBe(false);
    expect(operatorCredentialUploadsLocked("rejected", false)).toBe(false);
    expect(operatorCredentialUploadsLocked("pending_review", false)).toBe(true);
    expect(operatorCredentialUploadsLocked("verified", true)).toBe(true);
    expect(operatorCredentialUploadsLocked("pending_docs", true)).toBe(true);
  });
});

describe("operator signup field helpers", () => {
  it("rejects malformed ARN and ReOC before submit", () => {
    expect(operatorSignupFieldErrors("12", "nope").arn).not.toBeNull();
    expect(operatorSignupFieldErrors("12", "nope").reocNumber).not.toBeNull();
    const ok = canonicalOperatorSignupCredentials("1234567", "casa.reoc.0420");
    expect(ok).toEqual({ ok: true, arn: "1234567", reocNumber: "CASA.ReOC.0420" });
  });
});

describe("credential file client checks", () => {
  it("accepts PDF/JPEG/PNG and a 10 MB cap, and does not treat image/jpg as allowed", () => {
    expect(inferCredentialMime({ name: "doc.pdf", type: "application/pdf" })).toBe("application/pdf");
    expect(inferCredentialMime({ name: "photo.jpg", type: "image/jpeg" })).toBe("image/jpeg");
    expect(inferCredentialMime({ name: "photo.jpg", type: "image/jpg" })).toBeNull();
    expect(inferCredentialMime({ name: "shot.png", type: "image/png" })).toBe("image/png");
    expect(
      credentialFileClientError({ name: "doc.pdf", type: "application/pdf", size: 10_485_761 }),
    ).toMatch(/10 MB/);
    expect(requiredCredentialKinds()).toEqual([
      "reoc_certificate",
      "repl",
      "certificate_of_currency",
    ]);
  });
});
