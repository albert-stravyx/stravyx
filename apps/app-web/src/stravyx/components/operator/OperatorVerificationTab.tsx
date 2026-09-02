import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle, Award, CheckCircle2, Clock, MapPin, ShieldCheck,
} from "lucide-react";
import { Logo } from "../Logo";
import { SectionLabel } from "./OperatorShared";
import { OperatorCredentialUploads } from "./OperatorCredentialUploads";
import type { MeProfile, OperatorCredentialFileItem, VerificationStatus } from "@stravyx/types";
import { displayOrUnset, UNSET_FIELD } from "@/lib/shellProfile";
import { api } from "@/lib/api";
import {
  operatorCredentialUploadsLocked,
  operatorVerificationCopy,
  userSafeCredentialApiMessage,
} from "@/lib/operatorVerificationCopy";
import {
  mergeOperatorVerification,
  nextVerificationSeq,
} from "@/lib/operatorVerificationMerge";

export function VerificationTab({ meProfile }: { meProfile: MeProfile | null }) {
  const [files, setFiles] = useState<OperatorCredentialFileItem[]>([]);
  const [listStatus, setListStatus] = useState<VerificationStatus | null>(
    meProfile?.verificationStatus ?? null,
  );
  const [listVerified, setListVerified] = useState<boolean | null>(meProfile?.verified ?? null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [meSeq, setMeSeq] = useState(0);
  const [listSeq, setListSeq] = useState(0);
  const seqClockRef = useRef(0);
  const prevMeVerificationRef = useRef<{
    verificationStatus: MeProfile["verificationStatus"] | undefined;
    verified: MeProfile["verified"] | undefined;
    rejectionReason: MeProfile["rejectionReason"] | undefined;
  } | null>(null);

  const refreshCredentials = useCallback(async () => {
    const list = await api.listOperatorCredentials();
    setFiles(list.files);
    setListStatus(list.verificationStatus);
    setListVerified(list.verified);
    setListError(null);
    setListSeq(nextVerificationSeq(seqClockRef));
  }, []);

  useEffect(() => {
    const next = {
      verificationStatus: meProfile?.verificationStatus,
      verified: meProfile?.verified,
      rejectionReason: meProfile?.rejectionReason,
    };
    const prev = prevMeVerificationRef.current;
    prevMeVerificationRef.current = next;
    if (
      prev !== null &&
      (prev.verificationStatus !== next.verificationStatus ||
        prev.verified !== next.verified ||
        prev.rejectionReason !== next.rejectionReason)
    ) {
      setMeSeq(nextVerificationSeq(seqClockRef));
    }
  }, [meProfile?.verificationStatus, meProfile?.verified, meProfile?.rejectionReason]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        await refreshCredentials();
      } catch (error) {
        if (!cancelled) {
          setListError(userSafeCredentialApiMessage(error, "Could not load your documents."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshCredentials, meProfile?.verified, meProfile?.verificationStatus]);

  const merged = mergeOperatorVerification(
    meProfile,
    {
      verificationStatus: listStatus,
      verified: listVerified,
    },
    { meSeq, listSeq },
  );
  const verified = merged.verified;
  const uploadsLocked = operatorCredentialUploadsLocked(
    merged.verificationStatus,
    merged.verified,
  );
  const copy = operatorVerificationCopy({
    verificationStatus: merged.verificationStatus,
    verified: merged.verified,
    rejectionReason: merged.rejectionReason,
  });
  const name = displayOrUnset(meProfile?.fullName);
  const arn = displayOrUnset(meProfile?.arn);
  const reoc = displayOrUnset(meProfile?.reocNumber);
  const area = displayOrUnset(meProfile?.serviceArea);
  const banner = bannerColors(copy.tone);

  return (
    <div className="space-y-6">
      <div
        className="flex items-start gap-3 px-4 py-3 rounded-[12px]"
        style={{ backgroundColor: banner.background, border: `1px solid ${banner.border}` }}
        role="status"
      >
        {copy.tone === "verified" ? (
          <CheckCircle2 size={18} className="flex-shrink-0 mt-0.5" style={{ color: banner.icon }} />
        ) : copy.tone === "pending_review" ? (
          <Clock size={18} className="flex-shrink-0 mt-0.5" style={{ color: banner.icon }} />
        ) : (
          <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" style={{ color: banner.icon }} />
        )}
        <div>
          <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: banner.title }}>
            {copy.headline}
          </p>
          <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: banner.body }}>
            {copy.body}
          </p>
        </div>
      </div>

      <div>
        <SectionLabel>Operator ID Card</SectionLabel>
        <div
          className="relative rounded-[20px] overflow-hidden p-6"
          style={{ background: "linear-gradient(135deg, #1c1c2e 0%, #2d3a5c 50%, #1a4a6e 100%)", minHeight: "180px" }}
        >
          <div className="absolute inset-0 opacity-10" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="absolute rounded-full border border-white/30" style={{ width: (i + 1) * 80, height: (i + 1) * 80, top: "50%", left: "70%", transform: "translate(-50%,-50%)" }} />
            ))}
          </div>

          <div className="relative flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 rounded-[14px] flex items-center justify-center border-2 border-white/20"
                style={{ backgroundColor: "rgba(255,255,255,0.1)" }}
              >
                <ShieldCheck size={28} className="text-white/50" aria-hidden="true" />
              </div>
            </div>

            <div className="flex-1">
              <p className="text-white text-[18px] mb-0.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>{name}</p>
              <p className="text-white/70 text-[12px] mb-3" style={{ fontFamily: "DM Sans, sans-serif" }}>{copy.statusLabel}</p>
              <div className="flex gap-4 flex-wrap">
                <div>
                  <p className="text-white/50 text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", textTransform: "uppercase" }}>ARN</p>
                  <p className="text-white text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>{arn}</p>
                </div>
                <div>
                  <p className="text-white/50 text-[10px]" style={{ fontFamily: "DM Sans, sans-serif", textTransform: "uppercase" }}>ReOC</p>
                  <p className="text-white text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>{reoc}</p>
                </div>
              </div>
            </div>

            <div className="absolute top-0 right-0">
              <Logo className="h-6 opacity-50" variant="white" />
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>Identifiers on file</SectionLabel>
        <div className="bg-white border border-[#e8e8e8] rounded-[16px] overflow-hidden">
          {[
            { label: "ARN", value: arn, icon: Award },
            { label: "ReOC", value: reoc, icon: ShieldCheck },
            { label: "Service area", value: area, icon: MapPin },
          ].map(({ label, value, icon: Icon }) => {
            const onFile = value !== UNSET_FIELD;
            return (
              <div key={label} className="flex items-center gap-3 px-4 py-3.5 border-b border-[#f4f4f4] last:border-b-0">
                <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: onFile ? "#e8f5f0" : "#fff0ec" }}>
                  <Icon size={15} style={{ color: onFile ? "#5cb89c" : "#e07040" }} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>{label}</p>
                  <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>{value}</p>
                </div>
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, backgroundColor: onFile ? "#e8f5f0" : "#fff0ec", color: onFile ? "#2d6b53" : "#e07040" }}
                >
                  {onFile ? "ON FILE" : "NOT SET"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <SectionLabel>Required documents</SectionLabel>
        {listError ? (
          <p role="alert" className="mb-3 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
            {listError}
          </p>
        ) : null}
        {loading ? (
          <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            Loading documents…
          </p>
        ) : (
          <OperatorCredentialUploads
            files={files}
            uploadsDisabled={uploadsLocked}
            onConfirmed={refreshCredentials}
          />
        )}
        {verified ? (
          <p className="mt-3 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            Uploads are locked because a Stravyx admin has already verified this account.
          </p>
        ) : uploadsLocked ? (
          <p className="mt-3 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            Documents are locked while a Stravyx admin reviews your submission.
          </p>
        ) : (
          <p className="mt-3 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            All three documents are required before an admin can review your account.
          </p>
        )}
      </div>
    </div>
  );
}

function bannerColors(tone: ReturnType<typeof operatorVerificationCopy>["tone"]): {
  background: string;
  border: string;
  icon: string;
  title: string;
  body: string;
} {
  switch (tone) {
    case "verified":
      return {
        background: "#e8f5f0",
        border: "#5cb89c",
        icon: "#2d6b53",
        title: "#2d6b53",
        body: "#3d7a64",
      };
    case "pending_review":
      return {
        background: "#fff8e8",
        border: "#e0b040",
        icon: "#8a6a10",
        title: "#8a6a10",
        body: "#9a7a20",
      };
    case "rejected":
      return {
        background: "#fff5f0",
        border: "#e07040",
        icon: "#a03010",
        title: "#a03010",
        body: "#c05030",
      };
    default:
      return {
        background: "#fff5f0",
        border: "#e07040",
        icon: "#e07040",
        title: "#a03010",
        body: "#c05030",
      };
  }
}
