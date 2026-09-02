import { useState } from "react";
import { ArrowLeft, Award, ShieldCheck } from "lucide-react";
import { Input, Label, PrimaryButton } from "./LoginAuthUi";
import { AddressSearchField } from "./AddressSearchField";
import type { GeocodedPlace } from "@/lib/maptilerGeocode";
import {
  canonicalOperatorSignupCredentials,
  operatorSignupFieldErrors,
} from "@/lib/operatorVerificationCopy";

const DRONE_TYPES = ["Fixed Wing", "Multirotor", "Hybrid", "FPV Racing", "Heavy Lift", "Thermal"];

export type OperatorSignupExtras = {
  phone: string;
  arn: string;
  reocNumber: string;
  serviceArea: string;
};

export function OperatorProfileStep({
  onNext,
  onBack,
  submitting = false,
  error,
}: {
  onNext: (extras: OperatorSignupExtras) => void | Promise<void>;
  onBack: () => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const [phone, setPhone] = useState("");
  const [arn, setArn] = useState("");
  const [reocNumber, setReocNumber] = useState("");
  const [arnError, setArnError] = useState<string | null>(null);
  const [reocError, setReocError] = useState<string | null>(null);
  const [experience, setExperience] = useState("");
  const [selectedDrones, setSelectedDrones] = useState<string[]>([]);
  const [areaQuery, setAreaQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace | null>(null);

  const toggleDrone = (d: string) =>
    setSelectedDrones((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  const credentials = canonicalOperatorSignupCredentials(arn, reocNumber);
  const valid = Boolean(
    phone &&
      credentials.ok &&
      experience &&
      selectedDrones.length > 0 &&
      selectedPlace,
  );

  return (
    <div className="w-full max-w-md">
      <button type="button" onClick={onBack} disabled={submitting} className="flex items-center gap-2 mb-6 hover:text-[#2d2d2d] transition-colors disabled:opacity-40" style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className="mb-6">
        <h1 className="text-[26px] mb-1.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>Operator details</h1>
        <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>ARN and ReOC are required. You cannot skip credentials.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const parsed = canonicalOperatorSignupCredentials(arn, reocNumber);
          if (parsed.ok === false) {
            setArnError(parsed.errors.arn);
            setReocError(parsed.errors.reocNumber);
            return;
          }
          if (!selectedPlace || !valid || submitting) return;
          void onNext({
            phone,
            arn: parsed.arn,
            reocNumber: parsed.reocNumber,
            serviceArea: selectedPlace.label,
          });
        }}
        className="space-y-4"
        noValidate
      >
        <div>
          <Label htmlFor="signup-operator-phone">Phone Number</Label>
          <div className="flex gap-2">
            <div className="px-3 py-3 border border-[#e8e8e8] rounded-[10px] flex items-center gap-1.5 flex-shrink-0 bg-[#f9f9f9]">
              <span className="text-[16px]">🇦🇺</span>
              <span className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>+61</span>
            </div>
            <Input
              id="signup-operator-phone"
              type="tel"
              placeholder="400 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              autoComplete="tel"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="signup-operator-arn">ARN</Label>
          <div className="relative">
            <Award size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c0c0c0]" aria-hidden="true" />
            <input
              id="signup-operator-arn"
              type="text"
              inputMode="numeric"
              placeholder="6–7 digits"
              value={arn}
              onChange={(e) => {
                setArn(e.target.value);
                if (arnError) setArnError(null);
              }}
              onBlur={() => {
                const next = operatorSignupFieldErrors(arn, reocNumber);
                setArnError(next.arn);
              }}
              aria-invalid={arnError ? true : undefined}
              aria-describedby={arnError ? "signup-operator-arn-error" : "signup-operator-arn-hint"}
              className="w-full pl-10 pr-4 py-3 border border-[#e8e8e8] rounded-[10px] focus:outline-none focus:border-[#5cb89c] transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif", fontSize: "15px" }}
              required
            />
          </div>
          <p id="signup-operator-arn-hint" className="mt-1 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            Aviation Reference Number — 6 or 7 digits.
          </p>
          {arnError ? (
            <p id="signup-operator-arn-error" role="alert" className="mt-1 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
              {arnError}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="signup-operator-reoc">ReOC</Label>
          <div className="relative">
            <ShieldCheck size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c0c0c0]" aria-hidden="true" />
            <input
              id="signup-operator-reoc"
              type="text"
              placeholder="CASA.ReOC.1234"
              value={reocNumber}
              onChange={(e) => {
                setReocNumber(e.target.value);
                if (reocError) setReocError(null);
              }}
              onBlur={() => {
                const next = operatorSignupFieldErrors(arn, reocNumber);
                setReocError(next.reocNumber);
              }}
              aria-invalid={reocError ? true : undefined}
              aria-describedby={reocError ? "signup-operator-reoc-error" : "signup-operator-reoc-hint"}
              className="w-full pl-10 pr-4 py-3 border border-[#e8e8e8] rounded-[10px] focus:outline-none focus:border-[#5cb89c] transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif", fontSize: "15px" }}
              required
            />
          </div>
          <p id="signup-operator-reoc-hint" className="mt-1 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            Remote Operator’s Certificate — CASA.ReOC. plus 4 digits.
          </p>
          {reocError ? (
            <p id="signup-operator-reoc-error" role="alert" className="mt-1 text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>
              {reocError}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="signup-operator-experience">Years of Experience</Label>
          <select
            id="signup-operator-experience"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            className="w-full px-4 py-3 border border-[#e8e8e8] rounded-[10px] focus:outline-none focus:border-[#5cb89c] transition-colors bg-white"
            style={{ fontFamily: "DM Sans, sans-serif", fontSize: "15px" }}
            required
          >
            <option value="">Select…</option>
            <option>Less than 1 year</option>
            <option>1–2 years</option>
            <option>3–5 years</option>
            <option>5+ years</option>
          </select>
        </div>
        <div>
          <Label id="signup-operator-drones-label">Drone Types <span style={{ color: "#b0b0b0" }}>(select all that apply)</span></Label>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby="signup-operator-drones-label">
            {DRONE_TYPES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDrone(d)}
                aria-pressed={selectedDrones.includes(d)}
                className="px-3 py-1.5 rounded-full border transition-all text-[13px]"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontWeight: selectedDrones.includes(d) ? 600 : 400,
                  borderColor: selectedDrones.includes(d) ? "#5cb89c" : "#e8e8e8",
                  backgroundColor: selectedDrones.includes(d) ? "#e8f5f0" : "white",
                  color: selectedDrones.includes(d) ? "#2d6b53" : "#737373",
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <AddressSearchField
          id="signup-service-area"
          label="Primary Service Area"
          compact
          query={areaQuery}
          onQueryChange={(next) => {
            setAreaQuery(next);
            if (!selectedPlace || next !== selectedPlace.label) setSelectedPlace(null);
          }}
          onSelect={setSelectedPlace}
          placeholder="Search an Australian suburb or region"
        />

        {error ? (
          <p role="alert" className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>{error}</p>
        ) : null}

        <PrimaryButton type="submit" disabled={!valid || submitting}>
          {submitting ? "Creating account…" : "Complete Sign Up"}
        </PrimaryButton>
      </form>
    </div>
  );
}
