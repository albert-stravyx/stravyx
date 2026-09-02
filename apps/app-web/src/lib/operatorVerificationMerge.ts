import type { VerificationStatus } from "@stravyx/types";
import { isOperatorVerified } from "./operatorVerificationCopy";

export interface OperatorVerificationListSnapshot {
  verificationStatus: VerificationStatus | null | undefined;
  verified: boolean | null | undefined;
}

export interface OperatorVerificationMeFields {
  verificationStatus: VerificationStatus | null | undefined;
  verified: boolean | null | undefined;
  rejectionReason: string | null | undefined;
}

export interface MergedOperatorVerification {
  verificationStatus: VerificationStatus | null;
  verified: boolean;
  rejectionReason: string | null;
}

export interface OperatorVerificationFreshness {
  meSeq: number;
  listSeq: number;
}

/**
 * Advance a shared monotonic clock and return the new stamp.
 * OperatorVerificationTab holds one clock (a React ref) and stamps
 * meSeq or listSeq from it so the two counters stay comparable.
 */
export function nextVerificationSeq(clock: { current: number }): number {
  clock.current += 1;
  return clock.current;
}

/**
 * Merge polled `/me` verification fields with the last successful
 * credentials-list snapshot. When statuses disagree, prefer the source
 * with the greater seq. Omitted or equal seq keeps the admin-facing rank
 * so a live `/me` reject still wins a failed list refetch, without
 * flashing back to pending_docs after a local submit-for-review.
 * Verified from either source always wins, regardless of seq.
 */
export function mergeOperatorVerification(
  me: OperatorVerificationMeFields | null | undefined,
  list: OperatorVerificationListSnapshot | null | undefined,
  freshness?: OperatorVerificationFreshness,
): MergedOperatorVerification {
  const meStatus = me?.verificationStatus ?? null;
  const listStatus = list?.verificationStatus ?? null;
  const verified =
    isOperatorVerified(me?.verified) ||
    isOperatorVerified(list?.verified) ||
    meStatus === "verified" ||
    listStatus === "verified";
  const rejectionReason = me?.rejectionReason ?? null;

  if (verified) {
    return { verificationStatus: "verified", verified: true, rejectionReason };
  }

  const statusesDisagree =
    meStatus !== null && listStatus !== null && meStatus !== listStatus;
  if (
    statusesDisagree &&
    freshness !== undefined &&
    freshness.meSeq !== freshness.listSeq
  ) {
    const chosenStatus =
      freshness.meSeq > freshness.listSeq ? meStatus : listStatus;
    return {
      verificationStatus: chosenStatus,
      verified: false,
      rejectionReason,
    };
  }

  if (meStatus === "rejected") {
    return { verificationStatus: "rejected", verified: false, rejectionReason };
  }
  if (meStatus === "pending_review" || listStatus === "pending_review") {
    return { verificationStatus: "pending_review", verified: false, rejectionReason };
  }
  if (meStatus === "pending_docs" || listStatus === "pending_docs") {
    return { verificationStatus: "pending_docs", verified: false, rejectionReason };
  }
  return {
    verificationStatus: meStatus ?? listStatus,
    verified: false,
    rejectionReason,
  };
}
