/** Shared domain models (no circular re-exports). */

import type { MeProfile } from "./meProfile";

export type MissionStatus =
  | "draft"
  | "booked"
  | "dispatched"
  | "accepted"
  | "allocated"
  | "assessed"
  | "flown"
  | "delivered"
  | "disputed"
  | "cancelled";

export type AppRole = "customer" | "operator" | "admin";

/** Auth roles a self-serve signup may assign. Admin cannot be self-assigned. */
export type SignupRole = Extract<AppRole, "customer" | "operator">;

export interface SignupInput {
  email: string;
  password: string;
  fullName: string;
  role: SignupRole;
  phone?: string;
  company?: string;
  defaultLocation?: string;
  operatorLicenceNumber?: string;
  serviceArea?: string;
  arn?: string;
  reocNumber?: string;
}

export interface SignupResult {
  userId: string;
  email: string;
  role: SignupRole;
}

export function parseSignupRole(value: unknown): SignupRole | null {
  if (value === "customer" || value === "operator") return value;
  return null;
}

export type UrgencyTierCode = "scheduled" | "standard" | "urgent" | "immediate";

export const URGENCY_MULTIPLIERS: Record<UrgencyTierCode, number> = {
  scheduled: 0.85,
  standard: 1.0,
  urgent: 1.35,
  immediate: 2.25,
};

export const DEFAULT_BASE_RATE_CENTS_PER_HOUR = 25_000;

export interface QuoteInput {
  durationMinutes: number;
  urgency: UrgencyTierCode;
  equipmentFactor?: number;
  baseRateCentsPerHour?: number;
}

export interface CustomerQuote {
  networkPriceCents: number;
  currency: "AUD";
  durationMinutes: number;
  urgency: UrgencyTierCode;
}

export interface OperatorOfferProjection {
  missionId: string;
  suburb: string;
  earnCents: number;
  currency: "AUD";
  urgency: UrgencyTierCode;
}

/** Accepted/assigned operator view: suburb economics plus address and customer display name. */
export interface OperatorAcceptedMissionProjection extends OperatorOfferProjection {
  fullAddress: string;
  customerName: string;
}

export interface AdminMissionProjection {
  missionId: string;
  status: MissionStatus;
  networkPriceCents: number;
  flightFeeCents: number;
  layer2Cents: number;
  operatorEarnCents: number;
  platformFeeCents: number;
  fullAddress: string;
  suburb: string;
}

export interface MissionEconomics {
  missionId: string;
  status: MissionStatus;
  networkPriceCents: number;
  flightFeeCents: number;
  layer2Cents: number;
  fullAddress: string;
  suburb: string;
  urgency: UrgencyTierCode;
}

export interface CreateMissionInput {
  durationMinutes: number;
  urgency: UrgencyTierCode;
  categoryCode?: string;
  fullAddress?: string;
  suburb?: string;
  description?: string;
  lat?: number;
  lng?: number;
}

export interface CustomerMissionSummary {
  id: string;
  status: MissionStatus;
  networkPriceCents: number;
  currency: "AUD";
  durationMinutes: number;
  suburb?: string;
  createdAt?: string;
}

export interface CreateMissionResult {
  id: string;
  status: MissionStatus;
  networkPriceCents: number;
  currency: "AUD";
  urgency: UrgencyTierCode;
  suburb: string;
  durationMinutes: number;
}

export interface OperatorOfferListItem {
  offerId: string;
  missionId: string;
  status: string;
  missionStatus: MissionStatus;
  suburb?: string;
  earnCents: number;
  currency: "AUD";
  description?: string;
  fullAddress?: string;
  /** Present only after the operator has accepted; omitted on sent/unaccepted offers. */
  customerName?: string;
  /** Mission created_at — used for operator dashboard earn buckets. */
  createdAt?: string;
  /** Mission updated_at — proxy for completion time when status is flown/delivered. */
  updatedAt?: string;
}

export interface MeResponse {
  userId: string;
  email?: string;
  role: AppRole;
  profile?: MeProfile | null;
}

export type MediaVisibility = "held" | "released";

export interface MediaFile {
  id: string;
  missionId: string;
  uploadedBy: string | null;
  kind: string;
  visibility: MediaVisibility;
  byteSize: number | null;
  contentType: string | null;
  originalName: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface CustomerMediaProjection {
  id: string;
  missionId: string;
  kind: string;
  visibility: "released";
  byteSize: number | null;
  contentType: string | null;
  originalName: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export interface OperatorMediaProjection {
  id: string;
  missionId: string;
  uploadedBy: string | null;
  kind: string;
  visibility: MediaVisibility;
  byteSize: number | null;
  contentType: string | null;
  originalName: string | null;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export type AdminMediaProjection = OperatorMediaProjection;
export type MediaProjection =
  | CustomerMediaProjection
  | OperatorMediaProjection
  | AdminMediaProjection;

export interface CustomerNotificationItem {
  id: string;
  missionId: string;
  suburb: string | null;
  toStatus: string;
  createdAt: string;
}

export interface CustomerNotificationsResponse {
  notifications: CustomerNotificationItem[];
}
