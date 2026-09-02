import { Job, UrgencyTier, UrgencyPricing } from "../../types";
import { SERVICES } from "../../services";

export { SERVICES };

export interface BookingPageProps {
  onBack: () => void;
  onSubmit: (job: Omit<Job, "id" | "status" | "createdAt"> & { serviceId?: string }) => void;
  preselectedService?: string;
  urgencyTiers: Record<UrgencyTier, UrgencyPricing>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type StepId = "service" | "location" | "chat" | "timing" | "review";

export interface ChatQuestion {
  question: string;
  chips: string[];
  freeText?: boolean;
}

export interface ChatMessage {
  role: "ai" | "user";
  text: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

export const UNIVERSAL_QUESTIONS: ChatQuestion[] = [
  { question: "Who will be the on-site contact when the operator arrives?", chips: ["I'll be on site", "Someone else — I'll share details", "No one — site is unattended"], freeText: true },
  { question: "Is there a suitable take-off and landing space?", chips: ["Open lawn or car park", "Rooftop with clearance", "Tight urban space", "Not sure — operator to assess"] },
];

export const QUESTIONS: Record<string, ChatQuestion[]> = {
  photography: [
    { question: "What's the main purpose of this shoot?", chips: ["Real estate listing", "Construction progress", "Event coverage", "Marketing & commercial", "Personal project"] },
    { question: "What format do you need?", chips: ["Photos only", "Video only", "Both photos & video", "Not sure yet"] },
    { question: "Are there specific areas, angles, or subjects to focus on?", chips: [], freeText: true },
    { question: "What time of day works best for the shoot?", chips: ["Golden hour (sunrise/sunset)", "Midday — bright and clear", "Overcast — soft light", "Flexible — operator's call"] },
    { question: "Any access restrictions or special considerations on site?", chips: ["No restrictions", "Gated — access will be arranged", "Power lines nearby", "Animals or people present"] },
    ...UNIVERSAL_QUESTIONS,
  ],
  inspection: [
    { question: "What type of property is this?", chips: ["Residential house", "Commercial building", "Industrial facility", "Rural or farm property"] },
    { question: "Which areas need inspecting?", chips: ["Roof and gutters", "Full exterior facade", "Specific damaged area", "Complete top-to-bottom survey"] },
    { question: "What's the reason for this inspection?", chips: ["Routine maintenance", "Storm or weather damage", "Pre-purchase assessment", "Insurance claim evidence"] },
    { question: "Do you require a full data package with the footage?", chips: ["Yes — written report + footage", "Footage only is fine", "Just confirm what's needed on the day"] },
    { question: "Are there any hazards or access issues the operator should know about?", chips: ["No known hazards", "Power lines nearby", "Restricted access / gated", "People or animals on site"] },
    ...UNIVERSAL_QUESTIONS,
  ],
  mapping: [
    { question: "What is this mapping project for?", chips: ["Development planning", "Agricultural survey", "Mining or resources", "Legal boundary survey", "Environmental monitoring"] },
    { question: "What's the approximate area to be mapped?", chips: ["Under 5 hectares", "5–50 hectares", "50–200 hectares", "200+ hectares"], freeText: true },
    { question: "What deliverables do you need?", chips: ["2D orthomosaic map", "3D point cloud / model", "Topographic / elevation data", "Full data package"] },
    { question: "What accuracy level is required?", chips: ["Standard (5cm GSD)", "High precision (2cm GSD)", "Survey grade — GNSS control points", "Not sure, advise me"] },
    { question: "Are there any access or airspace restrictions we should know about?", chips: ["No restrictions", "Remote location — access is arranged", "CASA permit may be required", "Near controlled airspace"] },
    ...UNIVERSAL_QUESTIONS,
  ],
  emergency: [
    { question: "What is the nature of this incident?", chips: ["Infrastructure assessment", "Site security callout", "Time-critical visual survey", "Other private aerial support"] },
    { question: "What output do you need from the operator?", chips: ["Live video feed", "Thermal imaging", "High-res stills", "All available outputs"] },
    { question: "Are there active hazards in the area?", chips: ["No known hazards", "Power lines or infrastructure", "Unstable structure", "Restricted airspace nearby"] },
    ...UNIVERSAL_QUESTIONS,
  ],
};

export function generateBrief(service: string, location: string, answers: string[]): string {
  const svc = SERVICES.find((s) => s.id === service);
  const name = svc?.name ?? service;
  const lines = answers.filter(Boolean);
  return (
    `${name} required at ${location || "the specified location"}. ` +
    lines.join(". ") +
    "."
  );
}

// ─── Step indicator ───────────────────────────────────────────────────────────

export const STEPS: { id: StepId; label: string }[] = [
  { id: "service", label: "Discovery" },
  { id: "location", label: "Location" },
  { id: "chat", label: "Requirements" },
  { id: "timing", label: "Timing" },
  { id: "review", label: "Review" },
];

// ─── Step 1: Service discovery bot ───────────────────────────────────────────

export interface DiscoveryMessage { role: "ai" | "user"; text: string; }

// Conversation tree: phase → chips + bot follow-up
export const DISCOVERY_PHASES = [
  {
    // Phase 0 — opening question (sent by bot automatically)
    botText: null, // sent on mount
    chips: [
      "Capture photos or video of a site",
      "Inspect a building or structure",
      "Survey or measure land",
      "I have an urgent or time-critical need",
      "Not sure — help me figure it out",
    ],
  },
  // Phase 1a — photography
  {
    matchKeywords: ["photo", "video", "capture", "image", "footage"],
    botText: "Great — sounds like aerial imagery is what you need. What's the main purpose of the shoot?",
    chips: ["Selling or marketing a property", "Tracking construction progress", "Event or occasion coverage", "Commercial or creative project"],
    recommends: "photography",
  },
  // Phase 1b — inspection
  {
    matchKeywords: ["inspect", "building", "structure", "roof", "facade", "damage"],
    botText: "Understood. A drone inspection is perfect for that. What are you looking to check?",
    chips: ["Roof, gutters or facade", "Storm or weather damage", "Pre-purchase assessment", "Insurance evidence"],
    recommends: "inspection",
  },
  // Phase 1c — mapping
  {
    matchKeywords: ["survey", "map", "land", "measure", "boundary", "topograph"],
    botText: "Got it — land mapping it is. What's the mapping project for?",
    chips: ["Development or planning approval", "Agricultural or farm survey", "Mining or resources", "Legal boundary survey"],
    recommends: "mapping",
  },
  // Phase 1d — emergency
  {
    matchKeywords: ["urgent", "emergency", "critical", "time", "immediate", "fast"],
    botText: "I hear you — we can mobilise quickly. What's the situation?",
    chips: ["Search and rescue support", "Fire or flood monitoring", "Security surveillance", "Infrastructure failure assessment"],
    recommends: "emergency",
  },
  // Phase 1e — not sure
  {
    matchKeywords: ["not sure", "unsure", "don't know", "help", "figure"],
    botText: "No problem at all — let's work it out together. Which of these best describes what you're trying to achieve?",
    chips: [
      "Get images or video from above a location",
      "Check if something is damaged or structurally sound",
      "Get accurate measurements or a map of land",
      "Something time-critical that needs fast deployment",
    ],
    recommends: null, // will route on next answer
  },
];

export const SERVICE_PITCHES: Record<string, { name: string; pitch: string }> = {
  photography: {
    name: "Aerial Photography",
    pitch: "Our certified operators will capture stunning high-resolution stills and video from above — perfect for property, marketing, construction, and more.",
  },
  inspection: {
    name: "Property Inspection",
    pitch: "A detailed drone inspection gives you a complete view of any structure without scaffolding or risk. You'll receive footage and a written report.",
  },
  mapping: {
    name: "Land Mapping",
    pitch: "We'll produce accurate 2D orthomosaic maps and 3D models of your site — ideal for planning, agriculture, and survey-grade applications.",
  },
  emergency: {
    name: "Emergency Response",
    pitch: "Our rapid-deployment operators can be on-site within minutes with thermal and live-feed capability — available 24/7.",
  },
};

// Map a free-text reply to a phase index
export function matchPhase(text: string): number {
  const lower = text.toLowerCase();
  for (let i = 1; i < DISCOVERY_PHASES.length; i++) {
    const p = DISCOVERY_PHASES[i];
    if (p.matchKeywords?.some((kw) => lower.includes(kw))) return i;
  }
  return 1; // default to photography
}

// Map a phase-1e reply to a service
export function mapVagueAnswer(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("image") || lower.includes("video") || lower.includes("above")) return "photography";
  if (lower.includes("damage") || lower.includes("sound") || lower.includes("check")) return "inspection";
  if (lower.includes("measure") || lower.includes("map") || lower.includes("land")) return "mapping";
  return "emergency";
}
