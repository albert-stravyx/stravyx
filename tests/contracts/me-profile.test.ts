import { describe, expect, it } from "vitest";
import { projectMeProfile } from "@stravyx/types";

const fallback = {
  userId: "user-1",
  email: "ada@example.com",
  role: "customer" as const,
};

describe("projectMeProfile", () => {
  it("strips hubspot_contact_id and other CRM fields", () => {
    const projected = projectMeProfile(
      {
        id: "user-1",
        email: "ada@example.com",
        full_name: "Ada Lovelace",
        primary_role: "customer",
        phone_e164: "+61400000000",
        company: "Analytical Engines",
        default_location: "Adelaide SA",
        operator_licence_number: null,
        service_area: null,
        created_at: "2026-08-24T00:00:00.000Z",
        hubspot_contact_id: "hs-secret-99",
        hubspot_sync_status: "ok",
      },
      fallback,
    );

    expect(projected).toEqual({
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
      arn: null,
      reocNumber: null,
      verificationStatus: null,
      verified: null,
      rejectionReason: null,
      online: null,
    });
    expect(Object.prototype.hasOwnProperty.call(projected, "hubspot_contact_id")).toBe(false);
    expect(JSON.stringify(projected)).not.toContain("hs-secret-99");
    expect(JSON.stringify(projected)).not.toContain("hubspot");
  });

  it("formats phoneDisplay from phone_e164 and falls back when the row is missing", () => {
    expect(
      projectMeProfile({ phone_e164: "+61412345678" }, fallback).phoneDisplay,
    ).toBe("+61 412 345 678");
    expect(projectMeProfile({ phone_e164: null }, fallback).phoneDisplay).toBeNull();

    const missing = projectMeProfile(null, fallback);
    expect(missing.id).toBe("user-1");
    expect(missing.email).toBe("ada@example.com");
    expect(missing.fullName).toBe("");
    expect(missing.primaryRole).toBe("customer");
    expect(missing.phoneE164).toBeNull();
    expect(missing.phoneDisplay).toBeNull();
    expect(missing.arn).toBeNull();
    expect(missing.reocNumber).toBeNull();
    expect(missing.verificationStatus).toBeNull();
    expect(missing.verified).toBeNull();
    expect(missing.rejectionReason).toBeNull();
    expect(missing.online).toBeNull();
  });

  it("projects operator extras and never copies CRM keys", () => {
    const projected = projectMeProfile(
      {
        id: "op-1",
        email: "op@example.com",
        full_name: "Ada Operator",
        primary_role: "operator",
        phone_e164: "+61400000000",
        company: "Sky Co",
        default_location: "Adelaide SA",
        operator_licence_number: "ReOC-1",
        service_area: "Greater Adelaide",
        created_at: "2026-08-24T00:00:00.000Z",
        hubspot_contact_id: "hs-secret-99",
        hubspot_sync_status: "ok",
      },
      { userId: "op-1", email: "op@example.com", role: "operator" },
    );

    expect(projected).toEqual({
      id: "op-1",
      email: "op@example.com",
      fullName: "Ada Operator",
      primaryRole: "operator",
      phoneE164: "+61400000000",
      phoneDisplay: "+61 400 000 000",
      company: "Sky Co",
      defaultLocation: "Adelaide SA",
      operatorLicenceNumber: "ReOC-1",
      serviceArea: "Greater Adelaide",
      createdAt: "2026-08-24T00:00:00.000Z",
      arn: null,
      reocNumber: null,
      verificationStatus: null,
      verified: null,
      rejectionReason: null,
      online: null,
    });
    expect(Object.keys(projected)).not.toContain("hubspot_contact_id");
    expect(JSON.stringify(projected)).not.toContain("hs-secret-99");
    expect(JSON.stringify(projected)).not.toContain("hubspot");
  });

  it("projects operator verification fields from the reoc row", () => {
    const projected = projectMeProfile(
      {
        id: "op-1",
        email: "op@example.com",
        full_name: "Ada Operator",
        primary_role: "operator",
        phone_e164: "+61400000000",
        company: "Sky Co",
        default_location: "Adelaide SA",
        operator_licence_number: null,
        service_area: "Greater Adelaide",
        created_at: "2026-08-24T00:00:00.000Z",
      },
      { userId: "op-1", email: "op@example.com", role: "operator" },
      {
        arn: "123456",
        reoc_number: "CASA.ReOC.0001",
        verification_status: "pending_review",
        verified: false,
        rejection_reason: null,
        online: false,
      },
    );

    expect(projected.arn).toBe("123456");
    expect(projected.reocNumber).toBe("CASA.ReOC.0001");
    expect(projected.verificationStatus).toBe("pending_review");
    expect(projected.verified).toBe(false);
    expect(projected.rejectionReason).toBeNull();
    expect(projected.online).toBe(false);
    expect(JSON.stringify(projected)).not.toContain("270");
    expect(JSON.stringify(projected)).not.toContain("2024-0078415");
  });

  it("projects a rejected operator reason without fabricating CASA validity", () => {
    const projected = projectMeProfile(
      {
        id: "op-1",
        email: "op@example.com",
        full_name: "Ada Operator",
        primary_role: "operator",
      },
      { userId: "op-1", email: "op@example.com", role: "operator" },
      {
        arn: "7654321",
        reoc_number: "CASA.ReOC.9999",
        verification_status: "rejected",
        verified: false,
        rejection_reason: "Certificate of currency expired",
      },
    );

    expect(projected.verificationStatus).toBe("rejected");
    expect(projected.verified).toBe(false);
    expect(projected.rejectionReason).toBe("Certificate of currency expired");
    expect(projected.online).toBeNull();
    expect(JSON.stringify(projected).toLowerCase()).not.toContain("licence valid");
  });

  it("keeps verification fields null for customers even if a reoc row is passed", () => {
    const projected = projectMeProfile(
      {
        id: "user-1",
        email: "ada@example.com",
        full_name: "Ada Lovelace",
        primary_role: "customer",
      },
      fallback,
      {
        arn: "123456",
        reoc_number: "CASA.ReOC.0001",
        verification_status: "verified",
        verified: true,
      },
    );
    expect(projected.arn).toBeNull();
    expect(projected.reocNumber).toBeNull();
    expect(projected.verificationStatus).toBeNull();
    expect(projected.verified).toBeNull();
    expect(projected.rejectionReason).toBeNull();
    expect(projected.online).toBeNull();
  });
});
