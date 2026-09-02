import { useState } from "react";
import {
  Plus, ChevronRight, ArrowRight, CheckCircle2,
  MessageSquare, Star, Shield,
} from "lucide-react";
import { NodeApplicationModal } from "./NodeApplicationModal";
import { Job } from "../../types";
import { SERVICES } from "./customerHomeData";
import type { MeProfile } from "@stravyx/types";
import { firstNameFromFullName } from "@/lib/shellProfile";
import { UNSET_METRIC } from "@/lib/dashboardStats";
import { customerActiveJobBanner } from "@/lib/jobStatusCopy";

export function HomeFeed({ onBook, onTrackJob, onViewServices, activeJob, jobs, meProfile }: { onBook: (serviceId?: string) => void; onTrackJob: (job: Job) => void; onViewServices: () => void; activeJob: boolean; jobs: Job[]; meProfile: MeProfile | null }) {
  const [showNodeModal, setShowNodeModal] = useState(false);
  const activeJobData = jobs.find((j) => ["pending", "accepted", "in_progress"].includes(j.status));
  const firstName = firstNameFromFullName(meProfile?.fullName ?? "");

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-[#fafafa] pb-24 md:pb-8">
      {showNodeModal && <NodeApplicationModal onClose={() => setShowNodeModal(false)} />}
      {/* ── Hero ── */}
      <div
        className="relative overflow-hidden px-6 pt-8 pb-10 md:px-10 md:pt-12 md:pb-14"
      >
        {/* Hero image */}
        <img
          src="https://images.unsplash.com/photo-1477899447710-90571e12f4ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=90&w=1600"
          alt="Drone in flight"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Left-to-right gradient for text legibility */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.15) 100%)" }}
        />

        <div className="relative max-w-2xl">
          <p className="text-white/75 text-[14px] mb-1" style={{ fontFamily: "DM Sans, sans-serif" }}>
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </p>
          <h1 className="text-white text-[28px] md:text-[36px] leading-tight mb-4" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>
            The future of aerial<br />services, on demand.
          </h1>
          <button
            onClick={() => onBook()}
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-[12px] text-[#0f6e56] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
            style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: "15px", backgroundColor: "#f4efe6" }}
          >
            <Plus size={18} />
            Book a Job
          </button>
        </div>

        {/* Active job banner inside hero */}
        {activeJob && activeJobData && (
          <button
            type="button"
            onClick={() => onTrackJob(activeJobData)}
            className="mt-5 flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-[12px] px-4 py-3 max-w-sm border border-white/20 text-left w-full"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-white text-[13px] truncate" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600 }}>
                {activeJobData.serviceType} — {customerActiveJobBanner(activeJobData.status)}
              </p>
            </div>
            <ChevronRight size={16} className="text-white/70 flex-shrink-0" />
          </button>
        )}
      </div>

      <div className="max-w-4xl mx-auto px-4 md:px-8">

        {/* ── Services ── */}
        <div className="mt-2 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              Our Services
            </h2>
            <button
              onClick={onViewServices}
              className="flex items-center gap-1 text-[13px] hover:text-[#b8481f] transition-colors"
              style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#d85a30" }}
            >
              View all services <ArrowRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SERVICES.map(({ id, name, icon: Icon, color, tagline, description, features, from, image }) => (
              <div
                key={id}
                className="relative rounded-[20px] overflow-hidden group cursor-pointer"
                style={{ height: "280px" }}
                onClick={() => onBook(id)}
              >
                {/* Full-card image */}
                <img
                  src={image}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                />

                {/* Gradient overlay — strong at bottom for text legibility */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.82) 100%)" }}
                />

                {/* Top-left: service icon badge */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full" style={{ backgroundColor: `${color}dd` }}>
                  <Icon size={12} style={{ color: "#fff" }} />
                  <span className="text-[11px] text-white" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700 }}>{name}</span>
                </div>

                {/* Top-right: from price */}
                <div className="absolute top-3 right-3 text-right">
                  <span className="text-white/75 text-[10px]" style={{ fontFamily: "DM Sans, sans-serif" }}>from </span>
                  <span className="text-white text-[16px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>${from}</span>
                </div>

                {/* Bottom overlay: tagline, description, features + book button */}
                <div className="absolute bottom-0 inset-x-0 px-4 pb-4 pt-6">
                  <p className="text-white text-[17px] mb-0.5 leading-snug" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>
                    {tagline}
                  </p>
                  <p className="text-white/75 text-[12px] mb-3 leading-relaxed" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {description}
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                      {features.slice(0, 2).map((f) => (
                        <span
                          key={f}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] text-white/90 whitespace-nowrap"
                          style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 500, backgroundColor: "rgba(255,255,255,0.18)" }}
                        >
                          <CheckCircle2 size={9} />
                          {f}
                        </span>
                      ))}
                    </div>
                    <button
                      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[12px] transition-all"
                      style={{
                        fontFamily: "DM Sans, sans-serif", fontWeight: 700,
                        backgroundColor: "#d85a30",
                        boxShadow: "0 4px 12px rgba(216,90,48,0.4)",
                      }}
                    >
                      Book <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="mb-8">
          <h2 className="text-[20px] mb-5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "01", icon: MessageSquare, title: "Describe Your Job", body: "Answer 4–5 quick questions — our AI builds a detailed brief for your operator.", color: "#5cb89c" },
              { step: "02", icon: Star, title: "Get Matched Instantly", body: "We find the nearest certified operator and confirm them in under 2 minutes.", color: "#7070d0" },
              { step: "03", icon: Shield, title: "Track & Receive", body: "Follow the mission live, then download your data and receipt when complete.", color: "#d85a30" },
            ].map(({ step, icon: Icon, title, body, color }) => (
              <div key={step} className="bg-white rounded-[16px] border border-[#e8e8e8] p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
                    <Icon size={18} style={{ color }} />
                  </div>
                  <span className="text-[28px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 800, color: `${color}30` }}>
                    {step}
                  </span>
                </div>
                <p className="text-[15px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
                  {title}
                </p>
                <p className="text-[13px] leading-relaxed" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust stats ── */}
        <div
          className="rounded-[20px] p-6 mb-6 grid grid-cols-2 md:grid-cols-4 gap-4"
          style={{ background: "linear-gradient(135deg, #1c1c2e 0%, #0f6e56 100%)" }}
        >
          {[
            { value: "500+", label: "Certified operators" },
            { value: UNSET_METRIC, label: "Average rating" },
            { value: "< 2 min", label: "Match time" },
            { value: "98%", label: "Job completion" },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-[24px] md:text-[28px] text-white mb-0.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 800 }}>
                {value}
              </p>
              <p className="text-[12px] text-white/60" style={{ fontFamily: "DM Sans, sans-serif" }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Network Nodes ── */}
        <div className="mb-8">
          {/* Header */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-block px-3 py-1 rounded-full text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, backgroundColor: "#e8f5f0", color: "#2d6b53", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Stravyx Network
              </span>
              <span className="inline-block px-3 py-1 rounded-full text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, backgroundColor: "#fff8e8", color: "#7a4d0a", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Coming Soon
              </span>
            </div>
            <h2 className="text-[24px] md:text-[28px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              Host a Node. Join the Grid.
            </h2>
            <p className="text-[14px] max-w-[520px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373", lineHeight: "1.6" }}>
              Stravyx is building a distributed network of stationary drone docking nodes across Australia. Install one on your property and plug directly into the infrastructure powering the future of aerial services.
            </p>
          </div>

          {/* Hero image card */}
          <div
            className="relative rounded-[20px] overflow-hidden mb-4"
            style={{ minHeight: "220px" }}
          >
            <img
              src="https://images.unsplash.com/photo-1661155528331-d03a2a82c22b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=1080"
              alt="Stravyx node on rooftop"
              className="w-full h-full object-cover absolute inset-0"
              style={{ minHeight: "220px" }}
            />
            <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(28,28,46,0.92) 0%, rgba(28,28,46,0.6) 50%, rgba(28,28,46,0.2) 100%)" }} />
            <div className="relative p-6 md:p-8 flex flex-col justify-center" style={{ minHeight: "220px" }}>
              <p className="text-white text-[13px] mb-1" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, opacity: 0.7 }}>Passive infrastructure</p>
              <p className="text-white text-[22px] md:text-[26px] mb-3" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>
                Earn while your rooftop works.
              </p>
              <p className="text-white/70 text-[13px] mb-5 max-w-[340px]" style={{ fontFamily: "DM Sans, sans-serif", lineHeight: "1.5" }}>
                Node hosts receive a recurring revenue share every time a drone deploys from or charges at their station.
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setShowNodeModal(true); }}
                className="inline-flex items-center gap-2 self-start px-5 py-2.5 rounded-[10px] text-white text-[13px] transition-all"
                style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, backgroundColor: "#d85a30", boxShadow: "0 4px 14px rgba(216,90,48,0.4)" }}
              >
                Apply to Host
              </button>
            </div>
          </div>

          {/* Benefit cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            {[
              {
                icon: "⚡",
                title: "Passive Income",
                body: "Earn a revenue share each time a drone docks, charges, or deploys from your node — no active work required.",
                accent: "#ef9f27",
                bg: "#fff8e8",
              },
              {
                icon: "📡",
                title: "Network Coverage",
                body: "Your node extends Stravyx coverage into your area, enabling faster local response times and new service zones.",
                accent: "#5cb89c",
                bg: "#e8f5f0",
              },
              {
                icon: "🔒",
                title: "Fully Managed",
                body: "Stravyx handles installation, maintenance, and compliance. You provide the location — we handle everything else.",
                accent: "#7070d0",
                bg: "#f0f0ff",
              },
            ].map(({ icon, title, body, accent, bg }) => (
              <div key={title} className="bg-white border border-[#e8e8e8] rounded-[16px] p-5">
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-3 text-[20px]" style={{ backgroundColor: bg }}>
                  {icon}
                </div>
                <p className="text-[15px] mb-1.5" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>{title}</p>
                <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373", lineHeight: "1.55" }}>{body}</p>
              </div>
            ))}
          </div>

          {/* Node types */}
          <div className="bg-white border border-[#e8e8e8] rounded-[16px] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#f0f0f0]">
              <p className="text-[14px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, color: "#2d2d2d" }}>Compatible locations</p>
            </div>
            {[
              { label: "Residential Rooftops", detail: "Flat or pitched rooftops with 3m² clearance", badge: "Popular" },
              { label: "Commercial Properties", detail: "Warehouses, offices, shopping centres, depots", badge: "High yield" },
              { label: "Rural & Agricultural Land", detail: "Open paddocks and farmland for extended range", badge: "New" },
              { label: "Marina & Waterfront", detail: "Coastal nodes supporting maritime operations", badge: "Coming soon" },
            ].map(({ label, detail, badge }) => (
              <div key={label} className="flex items-center gap-3 px-5 py-3.5 border-b border-[#f8f8f8] last:border-b-0">
                <div className="w-2 h-2 rounded-full bg-[#5cb89c] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px]" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 600, color: "#2d2d2d" }}>{label}</p>
                  <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{detail}</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, backgroundColor: "#e8f5f0", color: "#2d6b53" }}>
                  {badge}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="bg-white border border-[#e8e8e8] rounded-[20px] p-6 text-center mb-4">
          <p className="text-[18px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
            Ready to fly?
          </p>
          <p className="text-[14px] mb-5" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
            Book a certified operator in under 2 minutes, from anywhere.
          </p>
          <button
            onClick={() => onBook()}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-[12px] text-white hover:bg-[#b8481f] transition-all shadow-[0px_4px_14px_rgba(216,90,48,0.35)]"
            style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: "15px", backgroundColor: "#5cb89c" }}
          >
            <Plus size={18} />
            Book a Job Now
          </button>
        </div>

      </div>
    </div>
  );
}
