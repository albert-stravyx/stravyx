import { useCallback, useEffect, useId, useState } from "react";
import { CheckCircle2, FileText, Loader2, XCircle } from "lucide-react";
import { api } from "@/lib/api";
import {
  credentialKindLabel,
  fileForCredentialKind,
  requiredCredentialKinds,
  userSafeCredentialApiMessage,
} from "@/lib/operatorVerificationCopy";
import { displayOrUnset } from "@/lib/shellProfile";
import type { PendingOperatorItem } from "@stravyx/types";

export function AdminOperatorQueue() {
  const [operators, setOperators] = useState<PendingOperatorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const data = await api.listPendingOperators();
    setOperators(data.operators);
    setError(null);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        await refresh();
      } catch (cause) {
        if (!cancelled) {
          setError(userSafeCredentialApiMessage(cause, "Could not load operators waiting for review."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const handleDecided = useCallback(
    async (fullName: string | null, decision: "approve" | "reject") => {
      await refresh();
      const who = fullName?.trim() || "Operator";
      setNotice(decision === "approve" ? `${who} is now verified.` : `${who} was rejected and can resubmit.`);
    },
    [refresh],
  );

  return (
    <section className="mb-6 md:mb-8" aria-labelledby="admin-operator-queue-heading">
      <h2
        id="admin-operator-queue-heading"
        className="text-[20px] md:text-[24px] mb-2"
        style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 600, color: "#2d2d2d" }}
      >
        Operator verification queue
      </h2>
      <p className="text-[14px] mb-4" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
        Operators in pending review. Approve after checking documents, or reject with a reason so they can resubmit.
      </p>
      {notice ? (
        <p role="status" className="mb-3 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#2d6b53" }}>
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="mb-3 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6 flex items-center gap-2">
          <Loader2 size={16} className="text-[#5cb89c] animate-spin" aria-hidden="true" />
          <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            Loading pending operators…
          </p>
        </div>
      ) : operators.length === 0 ? (
        <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-6">
          <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            No operators waiting for review.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {operators.map((item) => (
            <li key={item.reocId}>
              <PendingOperatorCard item={item} onDecided={handleDecided} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PendingOperatorCard({
  item,
  onDecided,
}: {
  item: PendingOperatorItem;
  onDecided: (fullName: string | null, decision: "approve" | "reject") => Promise<void>;
}) {
  const reasonId = useId();
  const reasonErrorId = `${reasonId}-error`;
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const name = displayOrUnset(item.fullName);
  const email = displayOrUnset(item.email);

  const runDecision = async (decision: "approve" | "reject") => {
    if (decision === "reject") {
      const trimmed = reason.trim();
      if (!trimmed) {
        setReasonError("Enter a rejection reason so the operator knows what to fix.");
        return;
      }
    }
    setBusy(decision);
    setActionError(null);
    setReasonError(null);
    try {
      await api.verifyOperator(item.reocId, {
        decision,
        ...(decision === "reject" ? { reason: reason.trim() } : {}),
      });
      await onDecided(item.fullName, decision);
    } catch (cause) {
      setActionError(userSafeCredentialApiMessage(cause, "Could not save that decision. Try again."));
    } finally {
      setBusy(null);
    }
  };

  return (
    <article className="bg-white border border-[#e8e8e8] rounded-[16px] p-5">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
        <div>
          <h3 className="text-[18px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
            {name}
          </h3>
          <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{email}</p>
          <p className="text-[13px] mt-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#2d2d2d" }}>
            <span className="text-[#b0b0b0]">ARN</span> {displayOrUnset(item.arn)}
            <span className="mx-2 text-[#e8e8e8]" aria-hidden="true">·</span>
            <span className="text-[#b0b0b0]">ReOC</span> {displayOrUnset(item.reocNumber)}
          </p>
        </div>
        <span
          className="self-start text-[10px] px-2 py-0.5 rounded-full"
          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, backgroundColor: "#fff8e8", color: "#8a6a10" }}
        >
          Pending review
        </span>
      </div>

      <ul className="space-y-2 mb-4">
        {requiredCredentialKinds().map((kind) => {
          const file = fileForCredentialKind(item.files, kind);
          const label = credentialKindLabel(kind);
          return (
            <li key={kind} className="flex items-center gap-2 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif" }}>
              <FileText size={14} className="text-[#5cb89c] flex-shrink-0" aria-hidden="true" />
              <span style={{ fontWeight: 600, color: "#2d2d2d" }}>{label}</span>
              {file?.downloadUrl ? (
                <a
                  href={file.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#2d6b53] underline underline-offset-2"
                >
                  Download {file.originalName?.trim() || label}
                </a>
              ) : (
                <span style={{ color: "#737373" }}>No downloadable file</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mb-3">
        <label htmlFor={reasonId} className="block mb-1.5 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, color: "#2d2d2d" }}>
          Rejection reason
        </label>
        <textarea
          id={reasonId}
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            if (reasonError) setReasonError(null);
          }}
          rows={2}
          aria-invalid={reasonError ? true : undefined}
          aria-describedby={reasonError ? reasonErrorId : undefined}
          className="w-full px-3 py-2 border border-[#e8e8e8] rounded-[10px] focus:outline-none focus:border-[#5cb89c] resize-y"
          style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px" }}
          placeholder="Required if you reject this operator"
        />
        {reasonError ? (
          <p id={reasonErrorId} role="alert" className="mt-1 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
            {reasonError}
          </p>
        ) : null}
      </div>

      {actionError ? (
        <p role="alert" className="mb-3 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
          {actionError}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            void runDecision("approve");
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-[#5cb89c] text-white hover:bg-[#4a9d84] transition-colors disabled:opacity-40"
          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "14px" }}
        >
          <CheckCircle2 size={16} aria-hidden="true" />
          {busy === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            void runDecision("reject");
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[10px] border border-[#e07040] text-[#a03010] hover:bg-[#fff5f0] transition-colors disabled:opacity-40"
          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "14px" }}
        >
          <XCircle size={16} aria-hidden="true" />
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </article>
  );
}
