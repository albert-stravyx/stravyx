import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { Logo } from "../Logo";

interface AllServicesPageProps {
  onBack: () => void;
  onBook: (serviceId: string) => void;
}

const ALL_SERVICES = [
  {
    id: "security",
    name: "Security & Surveillance",
    bookingId: "inspection",
    tagline: "Eyes in the sky, 24/7",
    description: "Real-time aerial monitoring for events, sites, and perimeter security with live video feeds.",
    features: ["Live feed streaming", "Thermal imaging", "Wide-area coverage"],
    image: "https://images.unsplash.com/photo-1618482914248-29272d021005?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#7070d0",
  },
  {
    id: "infrastructure",
    name: "Infrastructure & Rail",
    bookingId: "inspection",
    tagline: "Inspect without disruption",
    description: "Safe, efficient inspection of rail corridors, bridges, powerlines, and civil infrastructure.",
    features: ["No service interruption", "HD & thermal capture", "Detailed reporting"],
    image: "https://images.unsplash.com/photo-1474487548417-781cb71495f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#5580a0",
  },
  {
    id: "mapping",
    name: "Mapping & Survey",
    bookingId: "mapping",
    tagline: "Precision data from above",
    description: "Survey-grade 2D and 3D mapping for planning, engineering, and legal boundary applications.",
    features: ["2cm GSD accuracy", "3D point clouds", "GIS-ready outputs"],
    image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#d09030",
  },
  {
    id: "agriculture",
    name: "Agriculture",
    bookingId: "mapping",
    tagline: "Smarter farming from above",
    description: "NDVI crop health mapping, irrigation analysis, and seasonal monitoring for farms of any size.",
    features: ["NDVI mapping", "Yield prediction", "Irrigation analysis"],
    image: "https://images.unsplash.com/photo-1560493676-04071c5f467b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#5c9e5c",
  },
  {
    id: "construction",
    name: "Construction",
    bookingId: "photography",
    tagline: "Track every stage of the build",
    description: "Regular aerial progress captures for project management, compliance, and stakeholder reporting.",
    features: ["Progress tracking", "Volume calculations", "Site compliance"],
    image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#b07040",
  },
  {
    id: "property",
    name: "Property & Real Estate",
    bookingId: "photography",
    tagline: "Listings that stand out",
    description: "Stunning aerial photography and video for residential and commercial property marketing.",
    features: ["Stills & video", "Virtual tours", "Same-day turnaround"],
    image: "https://images.unsplash.com/photo-1628116904346-44a605db3b6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#5cb89c",
  },
  {
    id: "emergency",
    name: "Emergency Response",
    bookingId: "emergency",
    tagline: "On-site in minutes",
    description: "Rapid deployment for search and rescue, fire monitoring, flood assessment, and critical incidents.",
    features: ["24/7 availability", "Thermal & live feed", "SES coordination"],
    image: "https://images.unsplash.com/photo-1530077098399-b5b2bc5a0b45?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#d85a30",
  },
  {
    id: "environmental",
    name: "Environmental Monitoring",
    bookingId: "mapping",
    tagline: "See the full picture",
    description: "Habitat mapping, erosion assessment, waterway health, and biodiversity monitoring at scale.",
    features: ["Habitat mapping", "Erosion analysis", "Repeat surveys"],
    image: "https://images.unsplash.com/photo-1504208434309-cb69f4fe52b0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#4a8a6e",
  },
  {
    id: "asset",
    name: "Asset Inspection",
    bookingId: "inspection",
    tagline: "Inspect hard-to-reach assets safely",
    description: "Close-range inspection of towers, rooftops, pipelines, and industrial plant without scaffolding.",
    features: ["No scaffolding needed", "Thermal detection", "Written reports"],
    image: "https://images.unsplash.com/photo-1511454493857-0a29f2c023c7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#707070",
  },
  {
    id: "events",
    name: "Events",
    bookingId: "photography",
    tagline: "Capture the scale of every moment",
    description: "Aerial photography and live coverage for festivals, sports, corporate events, and private functions.",
    features: ["Live streaming", "Crowd aerials", "Highlight reels"],
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&w=800",
    color: "#9060b0",
  },
];

export function AllServicesPage({ onBack, onBook }: AllServicesPageProps) {
  return (
    <div className="fixed inset-0 bg-[#fafafa] flex flex-col z-40">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-[#e8e8e8] px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full hover:bg-[#f5f5f5] flex items-center justify-center transition-colors"
          >
            <ArrowLeft size={18} className="text-[#737373]" />
          </button>
          <div className="h-6 w-px bg-[#e8e8e8]" />
          <Logo className="h-10 md:h-12" />
        </div>
        <div className="hidden md:block text-right">
          <p className="text-[15px]" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>All Services</p>
          <p className="text-[12px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>{ALL_SERVICES.length} categories available</p>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[960px] mx-auto px-4 md:px-8 py-6 pb-24 md:pb-10">

          {/* Hero text */}
          <div className="mb-6">
            <h1 className="text-[28px] md:text-[34px] mb-2" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700, color: "#2d2d2d" }}>
              What can we do for you?
            </h1>
            <p className="text-[15px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#737373" }}>
              Browse our full range of certified drone services — tap any category to book.
            </p>
          </div>

          {/* Services grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ALL_SERVICES.map(({ id, name, bookingId, tagline, description, features, image, color }) => (
              <div
                key={id}
                className="relative rounded-[20px] overflow-hidden group cursor-pointer flex flex-col"
                style={{ minHeight: "280px" }}
                onClick={() => onBook(bookingId)}
              >
                {/* Full-bleed image */}
                <img
                  src={image}
                  alt={name}
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                />

                {/* Gradient overlay */}
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.35) 40%, rgba(0,0,0,0.85) 100%)" }}
                />

                {/* Category colour accent bar */}
                <div className="absolute top-0 inset-x-0 h-1" style={{ backgroundColor: color }} />

                {/* Content */}
                <div className="relative mt-auto px-4 pb-4 pt-6">
                  <p className="text-white text-[17px] mb-0.5 leading-snug" style={{ fontFamily: "DM Serif Display, Georgia, serif", fontWeight: 700 }}>
                    {name}
                  </p>
                  <p className="text-white/70 text-[12px] mb-3 leading-relaxed" style={{ fontFamily: "DM Sans, sans-serif" }}>
                    {tagline}
                  </p>

                  <div className="flex items-center justify-between gap-2">
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
                      className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[12px] transition-all group-hover:scale-[1.04]"
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

          {/* Bottom note */}
          <p className="text-center text-[13px] mt-8" style={{ fontFamily: "DM Sans, sans-serif", color: "#b0b0b0" }}>
            Don't see exactly what you need? <button className="underline" style={{ color: "#d85a30" }} onClick={() => onBook("")}>Chat with our assistant</button> and we'll find the right fit.
          </p>
        </div>
      </div>
    </div>
  );
}
