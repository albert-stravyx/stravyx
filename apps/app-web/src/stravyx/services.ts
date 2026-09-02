import { Camera, Building, MapPin as MapPinIcon, Zap, type LucideIcon } from "lucide-react";

export interface Service {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
  tagline: string;
  description: string;
  features: string[];
  from: number;
  image: string;
}

export const SERVICES: Service[] = [
  {
    id: "photography",
    name: "Aerial Photography",
    icon: Camera,
    color: "#5cb89c",
    tagline: "Stunning visuals from above",
    description: "Cinema-grade stills and 4K video for real estate listings, construction milestones, marketing campaigns, and events.",
    features: ["4K HDR video", "RAW photo delivery", "Same-day turnaround"],
    from: 150,
    image: "https://images.unsplash.com/photo-1554218169-79f6ec3a48e5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=800",
  },
  {
    id: "inspection",
    name: "Property Inspection",
    icon: Building,
    color: "#7070d0",
    tagline: "See what's hard to reach",
    description: "Detailed roof, facade, and structural surveys for insurance, pre-purchase assessments, and maintenance planning.",
    features: ["High-res thermal imaging", "Detailed defect report", "Insurance-ready"],
    from: 200,
    image: "https://images.unsplash.com/photo-1758304481643-6fdd6864b895?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=800",
  },
  {
    id: "mapping",
    name: "Land Mapping",
    icon: MapPinIcon,
    color: "#d09030",
    tagline: "Precision data at scale",
    description: "Survey-grade 2D orthomosaics, 3D point clouds, and elevation models for development, agriculture, and resources.",
    features: ["2cm GSD accuracy", "GIS-ready outputs", "3D model included"],
    from: 300,
    image: "https://images.unsplash.com/photo-1558388556-2261d4cc1938?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=800",
  },
  {
    id: "emergency",
    name: "Emergency Response",
    icon: Zap,
    color: "#d85a30",
    tagline: "Deployed in seconds",
    description: "Auto-dispatched operators for infrastructure incidents, site security callouts, and time-critical assessments — private aerial support, independent of emergency services.",
    features: ["Live video feed", "Thermal imaging", "24/7 availability"],
    from: 500,
    image: "https://images.unsplash.com/photo-1510686929997-e959239474f6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixlib=rb-4.1.0&q=85&w=800",
  },
];
