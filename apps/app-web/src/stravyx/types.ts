import type { MissionStatus } from "@stravyx/types";

export type JobStatus = "pending" | "accepted" | "in_progress" | "completed";

export type UrgencyTier = "scheduled" | "standard" | "urgent" | "immediate";

export interface UrgencyPricing {
  tier: UrgencyTier;
  label: string;
  multiplier: number;
  timeframe: string;
  description: string;
  color: string;
  textColor: string;
}

export interface Job {
  id: string;
  customerId: string;
  customerName: string;
  operatorId?: string;
  operatorName?: string;
  operatorRating?: number;
  status: JobStatus;
  /**
   * Raw ERD mission status ("accepted" | "allocated" | "flown" | "delivered" | ...).
   * `status` above is a coarse UI bucket (flown and delivered both map to
   * "completed"); this field lets components distinguish "flown, awaiting
   * delivery" from "delivered" without widening the coarse status enum.
   */
  missionStatus?: MissionStatus;
  serviceType: string;
  urgency: UrgencyTier;
  location: {
    address: string;
    suburb?: string;
    lat: number;
    lng: number;
  };
  estimatedDuration: number;
  flightFee: number;
  totalPrice: number;
  description: string;
  scheduledDate?: string;
  scheduledTime?: string;
  createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "customer" | "operator";
  rating?: number;
  totalJobs?: number;
}

export type ArtifactCategory = "visual_thermal" | "mapping_3d" | "telemetry_logs";

export interface ArtifactCategoryInfo {
  label: string;
  description: string;
  extensions: string[];
}

export const ARTIFACT_CATEGORIES: Record<ArtifactCategory, ArtifactCategoryInfo> = {
  visual_thermal: {
    label: "Visual & Thermal Media",
    description: "Standard and RAW photos, video, and thermal/orthomosaic imagery.",
    extensions: ["jpg", "jpeg", "dng", "raw", "mp4", "mov", "tiff", "tif"],
  },
  mapping_3d: {
    label: "Mapping & 3D Data",
    description: "Point clouds, 3D meshes, and geographic overlay files.",
    extensions: ["las", "laz", "xyz", "obj", "fbx", "kmz", "kml"],
  },
  telemetry_logs: {
    label: "Flight Telemetry & Logs",
    description: "Flight logs and raw GNSS/PPK correction data.",
    extensions: ["csv", "txt", "bin", "rtk", "sbf"],
  },
};

export function getArtifactCategory(fileName: string): ArtifactCategory | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  for (const [category, info] of Object.entries(ARTIFACT_CATEGORIES) as [ArtifactCategory, ArtifactCategoryInfo][]) {
    if (info.extensions.includes(ext)) return category;
  }
  return null;
}

export const URGENCY_TIERS: Record<UrgencyTier, UrgencyPricing> = {
  scheduled: {
    tier: "scheduled",
    label: "SCHEDULED",
    multiplier: 0.85,
    timeframe: "Up to 1 week",
    description: "Best value for planned recurring enterprise operations.",
    color: "#f5f5f5",
    textColor: "#737373",
  },
  standard: {
    tier: "standard",
    label: "STANDARD",
    multiplier: 1.0,
    timeframe: "24-48 hours",
    description: "Foundation rate for planned commercial missions.",
    color: "#c0d9e8",
    textColor: "#2d2d2d",
  },
  urgent: {
    tier: "urgent",
    label: "URGENT",
    multiplier: 1.35,
    timeframe: "2-4 hours",
    description: "Confirmed within 2-4 hours for time-sensitive needs.",
    color: "#ef9f27",
    textColor: "#2a0e06",
  },
  immediate: {
    tier: "immediate",
    label: "IMMEDIATE",
    multiplier: 2.25,
    timeframe: "Based on active pilots in your area",
    description: "Auto-dispatch for time-critical jobs — infrastructure incidents, security callouts, urgent site assessments.",
    color: "#d85a30",
    textColor: "#ffffff",
  },
};
