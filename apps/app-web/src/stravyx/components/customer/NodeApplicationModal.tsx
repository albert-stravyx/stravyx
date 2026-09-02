import { useState } from "react";
import { X, Building, MapPin, Phone, Mail, User, CheckCircle2, Loader2, ChevronDown } from "lucide-react";

interface NodeApplicationModalProps {
  onClose: () => void;
}

type Step = "form" | "submitting" | "success";

const PROPERTY_TYPES = [
  "Residential Rooftop",
  "Commercial Property",
  "Industrial / Warehouse",
  "Rural / Agricultural Land",
  "Marina / Waterfront",
  "Other",
];

export function NodeApplicationModal({ onClose }: NodeApplicationModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    propertyType: "",
    address: "",
    clearance: "",
    powerAvailable: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const validate = () => {
    const next: Partial<typeof form> = {};
    if (!form.name.trim()) next.name = "Required";
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) next.email = "Valid email required";
    if (!form.phone.trim()) next.phone = "Required";
    if (!form.propertyType) next.propertyType = "Required";
    if (!form.address.trim()) next.address = "Required";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setStep("submitting");

    // Simulate webhook POST
    setTimeout(() => {
      fetch("https://hooks.example.com/stravyx-node-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, submittedAt: new Date().toISOString() }),
      }).catch(() => {});
      setStep("success");
    }, 1800);
  };

  const inputCls = (field: keyof typeof form) =>
    `w-full px-4 py-3 rounded-[10px] border text-[14px] focus:outline-none transition-colors ${
      errors[field]
        ? "border-[#e05555] focus:border-[#e05555]"
        : "border-[#e8e8e8] focus:border-[#5cb89c]"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white w-full md:max-w-[520px] md:mx-4 rounded-t-[24px] md:rounded-[20px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#f0f0f0] flex-shrink-0">
          <div>
            <p className="text-[18px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              Apply to Host a Node
            </p>
            <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
              Our team will assess your location within 2 business days.
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#f5f5f5] transition-colors flex-shrink-0">
            <X size={18} className="text-[#737373]" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1">
          {step === "form" && (
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

              {/* Name + Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                    Full Name *
                  </label>
                  <div className="relative">
                    <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
                    <input
                      type="text"
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={set("name")}
                      className={inputCls("name") + " pl-9"}
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    />
                  </div>
                  {errors.name && <p className="text-[11px] mt-1 text-[#e05555]">{errors.name}</p>}
                </div>

                <div>
                  <label className="block mb-1.5 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                    Email *
                  </label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
                    <input
                      type="email"
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={set("email")}
                      className={inputCls("email") + " pl-9"}
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    />
                  </div>
                  {errors.email && <p className="text-[11px] mt-1 text-[#e05555]">{errors.email}</p>}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block mb-1.5 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
                  <input
                    type="tel"
                    placeholder="+61 400 000 000"
                    value={form.phone}
                    onChange={set("phone")}
                    className={inputCls("phone") + " pl-9"}
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  />
                </div>
                {errors.phone && <p className="text-[11px] mt-1 text-[#e05555]">{errors.phone}</p>}
              </div>

              {/* Property type */}
              <div>
                <label className="block mb-1.5 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                  Property Type *
                </label>
                <div className="relative">
                  <Building size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
                  <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b0b0b0] pointer-events-none" />
                  <select
                    value={form.propertyType}
                    onChange={set("propertyType")}
                    className={inputCls("propertyType") + " pl-9 pr-9 appearance-none bg-white"}
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    <option value="">Select property type…</option>
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {errors.propertyType && <p className="text-[11px] mt-1 text-[#e05555]">{errors.propertyType}</p>}
              </div>

              {/* Address */}
              <div>
                <label className="block mb-1.5 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                  Property Address *
                </label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#b0b0b0]" />
                  <input
                    type="text"
                    placeholder="123 Main St, Sydney NSW 2000"
                    value={form.address}
                    onChange={set("address")}
                    className={inputCls("address") + " pl-9"}
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  />
                </div>
                {errors.address && <p className="text-[11px] mt-1 text-[#e05555]">{errors.address}</p>}
              </div>

              {/* Clearance + Power */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block mb-1.5 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                    Available Clearance
                  </label>
                  <div className="relative">
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b0b0b0] pointer-events-none" />
                    <select
                      value={form.clearance}
                      onChange={set("clearance")}
                      className={inputCls("clearance") + " pr-9 appearance-none bg-white"}
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <option value="">Select…</option>
                      <option>3–6 m²</option>
                      <option>6–12 m²</option>
                      <option>12–25 m²</option>
                      <option>25 m²+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block mb-1.5 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                    Power Available?
                  </label>
                  <div className="relative">
                    <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#b0b0b0] pointer-events-none" />
                    <select
                      value={form.powerAvailable}
                      onChange={set("powerAvailable")}
                      className={inputCls("powerAvailable") + " pr-9 appearance-none bg-white"}
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    >
                      <option value="">Select…</option>
                      <option>Yes — standard 240V</option>
                      <option>Yes — solar available</option>
                      <option>No — needs installation</option>
                      <option>Unsure</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block mb-1.5 text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>
                  Additional Notes
                </label>
                <textarea
                  placeholder="Anything else we should know about your property or location…"
                  value={form.notes}
                  onChange={set("notes")}
                  rows={3}
                  className="w-full px-4 py-3 rounded-[10px] border border-[#e8e8e8] focus:border-[#5cb89c] focus:outline-none text-[14px] resize-none transition-colors"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-[12px] text-white text-[15px] transition-all"
                style={{
                  fontFamily: "DM Sans, sans-serif", fontWeight: 700,
                  backgroundColor: "#d85a30",
                  boxShadow: "0 4px 14px rgba(216,90,48,0.3)",
                }}
              >
                Submit Application
              </button>

              <p className="text-center text-[11px] pb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
                By submitting you agree to Stravyx's network infrastructure terms. No commitment required.
              </p>
            </form>
          )}

          {step === "submitting" && (
            <div className="flex flex-col items-center justify-center py-20 px-6">
              <Loader2 size={40} className="text-[#5cb89c] animate-spin mb-4" />
              <p className="text-[16px] mb-1" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
                Sending your application…
              </p>
              <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                Just a moment
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-[#e8f5f0] flex items-center justify-center mb-4">
                <CheckCircle2 size={32} className="text-[#5cb89c]" />
              </div>
              <p className="text-[22px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
                Application Received
              </p>
              <p className="text-[14px] mb-2" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373", lineHeight: "1.6", maxWidth: "340px" }}>
                Thanks, <strong style={{ color: "#2d2d2d" }}>{form.name}</strong>. Our infrastructure team will review your property and be in touch within 2 business days.
              </p>
              <p className="text-[13px] mb-8" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
                Confirmation sent to {form.email}
              </p>
              <button
                onClick={onClose}
                className="px-8 py-3 rounded-[12px] text-white"
                style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, backgroundColor: "#5cb89c" }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
