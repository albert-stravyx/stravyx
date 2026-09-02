import { useState } from "react";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Input, Label, PrimaryButton } from "./LoginAuthUi";
import { AddressSearchField } from "./AddressSearchField";
import type { GeocodedPlace } from "@/lib/maptilerGeocode";

// ─── Signup Step 3a: Customer profile ────────────────────────────────────────

export function CustomerProfileStep({
  onNext,
  onBack,
  submitting = false,
  error,
}: {
  onNext: (extras: { phone?: string; company?: string; defaultLocation?: string }) => void | Promise<void>;
  onBack: () => void;
  submitting?: boolean;
  error?: string | null;
}) {
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<GeocodedPlace | null>(null);

  return (
    <div className="w-full max-w-md">
      <button type="button" onClick={onBack} disabled={submitting} className="flex items-center gap-2 mb-6 hover:text-[#2d2d2d] transition-colors disabled:opacity-40" style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "#737373" }}>
        <ArrowLeft size={16} /> Back
      </button>
      <div className="mb-6">
        <h1 className="text-[26px] mb-1.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>Your details</h1>
        <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>Help us personalise your experience.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!selectedPlace || submitting) return;
          void onNext({
            phone,
            company,
            defaultLocation: selectedPlace.label,
          });
        }}
        className="space-y-4"
      >
        <div>
          <Label>Phone Number</Label>
          <div className="flex gap-2">
            <div className="px-3 py-3 border border-[#e8e8e8] rounded-[10px] flex items-center gap-1.5 flex-shrink-0 bg-[#f9f9f9]">
              <span className="text-[16px]">🇦🇺</span>
              <span className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>+61</span>
            </div>
            <Input type="tel" placeholder="400 000 000" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Company / Organisation <span style={{ color: "#b0b0b0" }}>(optional)</span></Label>
          <div className="relative">
            <Briefcase size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#c0c0c0]" />
            <input
              type="text"
              placeholder="Acme Corp"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-[#e8e8e8] rounded-[10px] focus:outline-none focus:border-[#5cb89c] transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif", fontSize: "15px" }}
            />
          </div>
        </div>
        <AddressSearchField
          id="signup-default-location"
          label="Default Service Location"
          compact
          query={locationQuery}
          onQueryChange={(next) => {
            setLocationQuery(next);
            if (!selectedPlace || next !== selectedPlace.label) setSelectedPlace(null);
          }}
          onSelect={setSelectedPlace}
          placeholder="Search an Australian suburb or address"
        />

        <div className="bg-[#f9fffe] border border-[#c0e8d8] rounded-[12px] p-4">
          <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#2d6b53" }}>
            <span style={{ fontWeight: 700 }}>New customer offer —</span> Your first booking gets a 10% discount applied automatically.
          </p>
        </div>

        {error ? (
          <p role="alert" className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#d85a30" }}>{error}</p>
        ) : null}

        <PrimaryButton type="submit" disabled={!selectedPlace || submitting}>
          {submitting ? "Creating account…" : "Complete Sign Up"}
        </PrimaryButton>
        <button type="button" onClick={() => { if (!submitting) void onNext({}); }} disabled={submitting} className="w-full text-center text-[13px] hover:text-[#2d2d2d] transition-colors py-1 disabled:opacity-40" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
          Skip for now
        </button>
      </form>
    </div>
  );
}
