// Display helpers for signed-in shells. These must derive initials, phone
// and empty-field copy from MeProfile (or a missing name/email) — never
// hardcoded "JS" / "SJ" / "John Smith" / "Sarah Johnson".
// Import the `.ts` module only: no React, no DOM.
import { describe, expect, it } from "vitest";
import type { MeProfile } from "@stravyx/types";
import {
  displayOrUnset,
  firstNameFromFullName,
  formatMemberSince,
  formatPhoneForShell,
  initialsFromName,
} from "../../apps/app-web/src/lib/shellProfile.ts";

function profile(overrides: Partial<MeProfile> = {}): MeProfile {
  return {
    id: "user-1",
    email: "ada@example.com",
    fullName: "Ada Lovelace",
    primaryRole: "customer",
    phoneE164: "+61400000000",
    phoneDisplay: "+61 400 000 000",
    company: "Analytical Engines",
    defaultLocation: "Adelaide SA",
    operatorLicenceNumber: null,
    serviceArea: null,
    createdAt: "2026-08-24T00:00:00.000Z",
    ...overrides,
  };
}

describe("initialsFromName", () => {
  it("uses the first letter of the first two name tokens", () => {
    expect(initialsFromName("Ada Lovelace", "ada@example.com")).toBe("AL");
    expect(initialsFromName("ada operator", "op@example.com")).toBe("AO");
  });

  it("returns a single letter when only one name token is present", () => {
    expect(initialsFromName("Ada", "ada@example.com")).toBe("A");
  });

  it("falls back to the email local-part when the name is blank", () => {
    expect(initialsFromName("", "ada@example.com")).toBe("A");
    expect(initialsFromName("   ", "kai.nguyen@stravyx.com")).toBe("K");
  });

  it("never returns the retired demo initials JS or SJ", () => {
    expect(initialsFromName("Ada Lovelace", "ada@example.com")).not.toBe("JS");
    expect(initialsFromName("Ada Lovelace", "ada@example.com")).not.toBe("SJ");
    expect(initialsFromName("", "")).not.toBe("JS");
    expect(initialsFromName("", "")).not.toBe("SJ");
  });

  it("returns a single non-demo letter when both name and email are empty", () => {
    const initials = initialsFromName("", "");
    expect(initials).toMatch(/^[A-Z?]$/);
    expect(initials).not.toBe("JS");
    expect(initials).not.toBe("SJ");
  });
});

describe("displayOrUnset", () => {
  it("returns the trimmed value when present", () => {
    expect(displayOrUnset("  Adelaide SA  ")).toBe("Adelaide SA");
  });

  it("returns Not set for null, undefined, or whitespace", () => {
    expect(displayOrUnset(null)).toBe("Not set");
    expect(displayOrUnset(undefined)).toBe("Not set");
    expect(displayOrUnset("")).toBe("Not set");
    expect(displayOrUnset("   ")).toBe("Not set");
  });
});

describe("formatPhoneForShell", () => {
  it("uses phoneDisplay when present", () => {
    expect(formatPhoneForShell(profile())).toBe("+61 400 000 000");
  });

  it("returns Not set when the profile or display is missing", () => {
    expect(formatPhoneForShell(profile({ phoneDisplay: null, phoneE164: null }))).toBe("Not set");
    expect(formatPhoneForShell(null)).toBe("Not set");
  });
});

describe("firstNameFromFullName", () => {
  it("returns the first token, or empty when unset", () => {
    expect(firstNameFromFullName("Ada Lovelace")).toBe("Ada");
    expect(firstNameFromFullName("")).toBe("");
    expect(firstNameFromFullName("   ")).toBe("");
  });
});

describe("formatMemberSince", () => {
  it("formats a createdAt timestamp as a short month-year", () => {
    expect(formatMemberSince("2026-08-24T00:00:00.000Z")).toMatch(/Aug ['’]26/);
  });

  it("returns Not set when createdAt is missing or unparseable", () => {
    expect(formatMemberSince(null)).toBe("Not set");
    expect(formatMemberSince("")).toBe("Not set");
    expect(formatMemberSince("not-a-date")).toBe("Not set");
  });
});
