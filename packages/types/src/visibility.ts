import type {
  AdminMediaProjection,
  AdminMissionProjection,
  AppRole,
  CustomerMediaProjection,
  CustomerQuote,
  MediaFile,
  MediaProjection,
  MissionEconomics,
  OperatorAcceptedMissionProjection,
  OperatorMediaProjection,
  OperatorOfferProjection,
} from "./models";
import { splitFromNetworkPrice } from "./pricing";

const FORBIDDEN_CUSTOMER_KEYS = [
  "flightFeeCents",
  "layer2Cents",
  "operatorEarnCents",
  "platformFeeCents",
  "flightFee",
  "totalPrice",
] as const;

/** Money firewall only. Unaccepted omission of fullAddress/customerName is a projector `in` check, not this list. */
const FORBIDDEN_OPERATOR_OFFER_KEYS = [
  "networkPriceCents",
  "layer2Cents",
  "flightFeeCents",
  "platformFeeCents",
] as const;

export function projectForCustomer(econ: MissionEconomics): CustomerQuote {
  return {
    networkPriceCents: econ.networkPriceCents,
    currency: "AUD",
    durationMinutes: 0,
    urgency: econ.urgency,
  };
}

export function projectForOperatorOffer(
  econ: MissionEconomics,
): OperatorOfferProjection {
  const { operatorEarnCents } = splitFromNetworkPrice(econ.networkPriceCents);
  return {
    missionId: econ.missionId,
    suburb: econ.suburb,
    earnCents: operatorEarnCents,
    currency: "AUD",
    urgency: econ.urgency,
  };
}

/**
 * Display name for an accepted operator mission.
 * Uses trimmed `profiles.full_name`; if that is null/blank, the local-part of
 * `profiles.email`. Returns null when neither source yields a name — that is
 * legitimate absence, not a cue to invent a label.
 * Keep Edge `listMissions` overlay in sync.
 */
export function customerDisplayNameFromProfile(profile: {
  fullName: string | null;
  email: string | null;
}): string | null {
  if (typeof profile.fullName === "string") {
    const fromName = profile.fullName.trim();
    if (fromName.length > 0) {
      return fromName;
    }
  }
  if (typeof profile.email === "string") {
    const email = profile.email.trim();
    const separator = email.indexOf("@");
    if (separator > 0) {
      const localPart = email.slice(0, separator);
      if (localPart.length > 0) {
        return localPart;
      }
    }
  }
  return null;
}

export function projectForOperatorAccepted(
  econ: MissionEconomics,
  overlay: { customerName: string },
): OperatorAcceptedMissionProjection {
  const customerName = overlay.customerName.trim();
  if (customerName.length === 0) {
    throw new Error("customerName must be a non-empty string");
  }
  return {
    ...projectForOperatorOffer(econ),
    fullAddress: econ.fullAddress,
    customerName,
  };
}

export function projectForAdmin(econ: MissionEconomics): AdminMissionProjection {
  const split = splitFromNetworkPrice(econ.networkPriceCents);
  return {
    missionId: econ.missionId,
    status: econ.status,
    networkPriceCents: econ.networkPriceCents,
    flightFeeCents: split.flightFeeCents,
    layer2Cents: split.layer2Cents,
    operatorEarnCents: split.operatorEarnCents,
    platformFeeCents: split.platformFeeCents,
    fullAddress: econ.fullAddress,
    suburb: econ.suburb,
  };
}

/**
 * Contract guard used in tests — throws if a payload leaks forbidden fields.
 *
 * Accepts any object so projection interfaces can be passed directly: interfaces
 * have no implicit index signature, and requiring `Record<string, unknown>` would
 * force every call site into a type assertion.
 */
export function assertNoLeak(role: AppRole, payload: object): void {
  const keys =
    role === "customer"
      ? FORBIDDEN_CUSTOMER_KEYS
      : role === "operator"
        ? FORBIDDEN_OPERATOR_OFFER_KEYS
        : [];
  const present = new Map<string, unknown>(Object.entries(payload));
  for (const key of keys) {
    if (present.has(key) && present.get(key) !== undefined) {
      throw new Error(`Visibility leak: role=${role} field=${key}`);
    }
  }
}

export function projectMediaForRole(
  role: AppRole,
  media: MediaFile,
): MediaProjection | null {
  /** Keep in sync with supabase/functions/api/mediaVisibility.ts. */
  if (role === "customer") {
    if (media.visibility !== "released") {
      return null;
    }
    const customerProjection: CustomerMediaProjection = {
      id: media.id,
      missionId: media.missionId,
      kind: media.kind,
      visibility: "released",
      byteSize: media.byteSize,
      contentType: media.contentType,
      originalName: media.originalName,
      confirmedAt: media.confirmedAt,
      releasedAt: media.releasedAt,
      createdAt: media.createdAt,
    };
    return customerProjection;
  }

  const operatorProjection: OperatorMediaProjection = {
    id: media.id,
    missionId: media.missionId,
    uploadedBy: media.uploadedBy,
    kind: media.kind,
    visibility: media.visibility,
    byteSize: media.byteSize,
    contentType: media.contentType,
    originalName: media.originalName,
    confirmedAt: media.confirmedAt,
    releasedAt: media.releasedAt,
    createdAt: media.createdAt,
  };

  if (role === "admin") {
    const adminProjection: AdminMediaProjection = operatorProjection;
    return adminProjection;
  }

  return operatorProjection;
}
