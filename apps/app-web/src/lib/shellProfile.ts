import type { MeProfile } from "@stravyx/types";

export const UNSET_FIELD = "Not set";

function firstLetter(token: string): string | null {
  const match = token.match(/[A-Za-z]/);
  return match ? match[0].toUpperCase() : null;
}

/**
 * 1–2 letters from the person's name, falling back to the email local-part.
 * Never returns a hardcoded demo identity ("JS" / "SJ").
 */
export function initialsFromName(fullName: string, email: string): string {
  const tokens = fullName.trim().split(/\s+/).filter((token) => token.length > 0);
  const fromName = tokens
    .slice(0, 2)
    .map(firstLetter)
    .filter((letter): letter is string => letter !== null);
  if (fromName.length > 0) {
    return fromName.join("");
  }
  const local = email.split("@")[0] ?? "";
  const fromEmail = firstLetter(local);
  if (fromEmail) {
    return fromEmail;
  }
  return "?";
}

export function displayOrUnset(value: string | null | undefined): string {
  if (typeof value !== "string") {
    return UNSET_FIELD;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : UNSET_FIELD;
}

export function formatPhoneForShell(
  profile: Pick<MeProfile, "phoneDisplay"> | null,
): string {
  return displayOrUnset(profile?.phoneDisplay);
}

export function firstNameFromFullName(fullName: string): string {
  const token = fullName.trim().split(/\s+/).find((part) => part.length > 0);
  return token ?? "";
}

export function formatMemberSince(createdAt: string | null | undefined): string {
  if (typeof createdAt !== "string" || createdAt.trim().length === 0) {
    return UNSET_FIELD;
  }
  const parsed = new Date(createdAt);
  if (Number.isNaN(parsed.getTime())) {
    return UNSET_FIELD;
  }
  const month = parsed.toLocaleString("en-AU", { month: "short", timeZone: "UTC" });
  const year = String(parsed.getUTCFullYear()).slice(-2);
  return `${month} '${year}`;
}

export function shellInitials(profile: MeProfile | null): string {
  return initialsFromName(profile?.fullName ?? "", profile?.email ?? "");
}
