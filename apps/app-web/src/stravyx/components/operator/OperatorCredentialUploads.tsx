import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { formatBytes } from "@/lib/missionMediaFormat";
import {
  CREDENTIAL_ACCEPT,
  credentialFileClientError,
  credentialKindLabel,
  fileForCredentialKind,
  inferCredentialMime,
  requiredCredentialKinds,
  userSafeCredentialApiMessage,
} from "@/lib/operatorVerificationCopy";
import type { OperatorCredentialFileItem, OperatorCredentialKind } from "@stravyx/types";

async function putFileToSignedUrl(
  signedUrl: string,
  file: File,
  contentType: string,
): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: file,
  });
  if (!res.ok) {
    throw new Error(`Upload to storage failed (HTTP ${res.status})`);
  }
}

function fileStatusLabel(file: OperatorCredentialFileItem | null): string {
  if (!file) return "Not uploaded";
  if (file.confirmedAt) {
    const name = file.originalName?.trim() || "Document on file";
    const size = formatBytes(file.byteSize);
    return `${name} · ${size} · submitted`;
  }
  return "Upload started but not confirmed — choose the file again.";
}

export function OperatorCredentialUploads({
  files,
  uploadsDisabled,
  onConfirmed,
}: {
  files: readonly OperatorCredentialFileItem[];
  uploadsDisabled: boolean;
  onConfirmed: () => Promise<void>;
}) {
  const [busyKind, setBusyKind] = useState<OperatorCredentialKind | null>(null);
  const [kindError, setKindError] = useState<Partial<Record<OperatorCredentialKind, string>>>({});

  const runUpload = useCallback(
    async (kind: OperatorCredentialKind, file: File) => {
      const clientError = credentialFileClientError(file);
      if (clientError) {
        setKindError((prev) => ({ ...prev, [kind]: clientError }));
        return;
      }
      const contentType = inferCredentialMime(file);
      if (!contentType) {
        setKindError((prev) => ({ ...prev, [kind]: "Use a PDF, JPEG, or PNG file." }));
        return;
      }
      setBusyKind(kind);
      setKindError((prev) => ({ ...prev, [kind]: undefined }));
      try {
        const { id, upload } = await api.createOperatorCredentialUploadUrl({
          kind,
          filename: file.name,
          contentType,
        });
        await putFileToSignedUrl(upload.signedUrl, file, contentType);
        await api.confirmOperatorCredential(id, {
          byteSize: file.size,
          originalName: file.name,
          contentType,
        });
        await onConfirmed();
      } catch (error) {
        setKindError((prev) => ({
          ...prev,
          [kind]: userSafeCredentialApiMessage(error, "Could not upload this document. Try again."),
        }));
      } finally {
        setBusyKind(null);
      }
    },
    [onConfirmed],
  );

  return (
    <div className="space-y-3">
      {requiredCredentialKinds().map((kind) => (
        <CredentialKindRow
          key={kind}
          kind={kind}
          file={fileForCredentialKind(files, kind)}
          busy={busyKind === kind}
          disabled={uploadsDisabled || (busyKind !== null && busyKind !== kind)}
          error={kindError[kind] ?? null}
          onFile={(next) => {
            void runUpload(kind, next);
          }}
        />
      ))}
    </div>
  );
}

function CredentialKindRow({
  kind,
  file,
  busy,
  disabled,
  error,
  onFile,
}: {
  kind: OperatorCredentialKind;
  file: OperatorCredentialFileItem | null;
  busy: boolean;
  disabled: boolean;
  error: string | null;
  onFile: (file: File) => void;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const statusId = `${inputId}-status`;
  const hintId = `${inputId}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmed = Boolean(file?.confirmedAt);
  const label = credentialKindLabel(kind);

  return (
    <div className="bg-white border border-[#e8e8e8] rounded-[16px] p-4">
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: confirmed ? "#e8f5f0" : "#f5f5f5" }}
        >
          {busy ? (
            <Loader2 size={18} className="text-[#5cb89c] animate-spin" aria-hidden="true" />
          ) : confirmed ? (
            <CheckCircle2 size={18} className="text-[#2d6b53]" aria-hidden="true" />
          ) : (
            <FileUp size={18} className="text-[#737373]" aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <label
            htmlFor={inputId}
            className="block text-[15px] mb-0.5"
            style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}
          >
            {label}
          </label>
          <p id={hintId} className="text-[12px] mb-1" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            PDF, JPEG, or PNG · 10 MB max
          </p>
          <p id={statusId} className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: confirmed ? "#2d6b53" : "#737373" }}>
            <span className="sr-only">Status: </span>
            {busy ? "Uploading…" : fileStatusLabel(file)}
          </p>
          {error ? (
            <p id={errorId} role="alert" className="mt-1 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
              {error}
            </p>
          ) : null}
          <div className="mt-3">
            <input
              ref={inputRef}
              id={inputId}
              type="file"
              accept={CREDENTIAL_ACCEPT}
              disabled={disabled}
              aria-describedby={error ? `${hintId} ${statusId} ${errorId}` : `${hintId} ${statusId}`}
              className="sr-only"
              onChange={(event) => {
                const next = event.target.files?.[0];
                event.target.value = "";
                if (next) onFile(next);
              }}
            />
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="px-4 py-2 rounded-[10px] border border-[#5cb89c] hover:bg-[#f0faf7] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, fontSize: "13px", color: "#2d6b53" }}
            >
              {confirmed ? `Replace ${label}` : `Upload ${label}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
