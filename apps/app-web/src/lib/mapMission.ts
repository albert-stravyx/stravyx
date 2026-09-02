import type { MissionStatus } from "@stravyx/types";
import type { Job, JobStatus, UrgencyTier } from "@/stravyx/types";

const MISSION_STATUSES: readonly MissionStatus[] = [
  "draft",
  "booked",
  "dispatched",
  "accepted",
  "allocated",
  "assessed",
  "flown",
  "delivered",
  "disputed",
  "cancelled",
];

/** Validates an untrusted status string at the API trust boundary. */
function asMissionStatus(status: string): MissionStatus | undefined {
  return (MISSION_STATUSES as readonly string[]).includes(status)
    ? (status as MissionStatus)
    : undefined;
}

/** Map ERD mission status → Make-era UI JobStatus. */
export function toJobStatus(status: string): JobStatus {
  switch (status) {
    case "accepted":
      return "accepted";
    case "allocated":
    case "assessed":
      return "in_progress";
    case "flown":
    case "delivered":
      return "completed";
    default:
      return "pending";
  }
}

export function toMissionStatus(jobStatus: JobStatus): MissionStatus {
  switch (jobStatus) {
    case "accepted":
      return "accepted";
    case "in_progress":
      return "allocated";
    case "completed":
      return "flown";
    default:
      return "dispatched";
  }
}

export const SERVICE_TO_CATEGORY: Record<string, string> = {
  photography: "aerial_photo",
  inspection: "property_inspection",
  mapping: "construction",
  emergency: "security",
};

export function categoryForService(serviceId: string): string {
  return SERVICE_TO_CATEGORY[serviceId] ?? "aerial_photo";
}

type CustomerMissionLike = {
  id: string;
  status: string;
  networkPriceCents: number;
  durationMinutes?: number;
  suburb?: string;
  fullAddress?: string;
  createdAt?: string;
  updatedAt?: string;
  description?: string;
  urgency?: string;
};

function asUrgency(code?: string | null): UrgencyTier {
  if (
    code === "scheduled" ||
    code === "standard" ||
    code === "urgent" ||
    code === "immediate"
  ) {
    return code;
  }
  return "standard";
}

export function customerMissionToJob(
  m: CustomerMissionLike,
  extras?: Partial<Job>,
): Job {
  const dollars = Math.round(m.networkPriceCents) / 100;
  const status = toJobStatus(m.status);
  const pastMatching =
    m.status === "accepted" ||
    m.status === "allocated" ||
    m.status === "assessed" ||
    m.status === "flown" ||
    m.status === "delivered" ||
    status !== "pending";
  return {
    id: m.id,
    customerId: extras?.customerId ?? "me",
    customerName: extras?.customerName ?? "You",
    status,
    missionStatus: extras?.missionStatus ?? asMissionStatus(m.status),
    serviceType: extras?.serviceType ?? "Mission",
    urgency: extras?.urgency ?? asUrgency(m.urgency),
    location: extras?.location ?? {
      address: m.fullAddress ?? m.suburb ?? "Sydney",
      lat: -33.8688,
      lng: 151.2093,
    },
    estimatedDuration: m.durationMinutes ?? extras?.estimatedDuration ?? 60,
    flightFee: Math.round(dollars / 1.4),
    totalPrice: dollars,
    description: extras?.description ?? m.description ?? "",
    createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
    operatorId: extras?.operatorId,
    operatorName:
      extras?.operatorName ?? (pastMatching ? "Demo Operator" : undefined),
    operatorRating: extras?.operatorRating ?? (pastMatching ? 4.9 : undefined),
    acceptedAt: extras?.acceptedAt,
    completedAt:
      extras?.completedAt ??
      (status === "completed"
        ? new Date(m.updatedAt ?? m.createdAt ?? Date.now())
        : undefined),
  };
}

type OfferLike = {
  offerId: string;
  missionId: string;
  status: string;
  missionStatus: string;
  suburb?: string;
  earnCents: number;
  description?: string;
  fullAddress?: string;
  /** Present only after accept; omitted on sent/unaccepted offers. */
  customerName?: string;
  urgency?: string;
  durationMinutes?: number;
  createdAt?: string;
  updatedAt?: string;
};

function parseIsoDate(value: string | undefined): Date | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

/** Operator available board: offer-backed jobs (suburb-only until accept). */
export function offerToJob(o: OfferLike): Job & { offerId: string } {
  const earn = o.earnCents / 100;
  const flightFee = Math.round(earn / 0.85);
  const status = toJobStatus(o.missionStatus);
  const createdAt = parseIsoDate(o.createdAt) ?? parseIsoDate(o.updatedAt) ?? new Date(0);
  const completedAt =
    status === "completed"
      ? parseIsoDate(o.updatedAt) ?? parseIsoDate(o.createdAt)
      : undefined;
  return {
    offerId: o.offerId,
    id: o.missionId,
    customerId: "customer",
    customerName: o.customerName ?? "Customer",
    status,
    missionStatus: asMissionStatus(o.missionStatus),
    serviceType: "Mission",
    urgency: asUrgency(o.urgency),
    location: {
      address: o.fullAddress ?? o.suburb ?? "Sydney",
      lat: -33.8688,
      lng: 151.2093,
    },
    estimatedDuration: o.durationMinutes ?? 60,
    flightFee,
    totalPrice: flightFee,
    description: o.description ?? "",
    createdAt,
    completedAt,
    operatorName: status !== "pending" ? "Demo Operator" : undefined,
  };
}

type AdminMissionLike = {
  missionId: string;
  status: string;
  networkPriceCents: number;
  flightFeeCents: number;
  fullAddress?: string;
  suburb?: string;
  urgency?: string;
  durationMinutes?: number;
  description?: string;
  createdAt?: string;
};

export type MissionRow = CustomerMissionLike | AdminMissionLike;

/**
 * GET /missions returns customer-shaped or admin-shaped rows depending on the
 * caller's role. `missionId` is present only on the admin projection.
 */
export function missionRowToJob(m: MissionRow): Job {
  return "missionId" in m ? adminMissionToJob(m) : customerMissionToJob(m);
}

export function adminMissionToJob(m: AdminMissionLike): Job {
  return {
    id: m.missionId,
    customerId: "customer",
    customerName: "Customer",
    status: toJobStatus(m.status),
    missionStatus: asMissionStatus(m.status),
    serviceType: "Mission",
    urgency: asUrgency(m.urgency),
    location: {
      address: m.fullAddress ?? m.suburb ?? "Sydney",
      lat: -33.8688,
      lng: 151.2093,
    },
    estimatedDuration: m.durationMinutes ?? 60,
    flightFee: m.flightFeeCents / 100,
    totalPrice: m.networkPriceCents / 100,
    description: m.description ?? "",
    createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
  };
}
