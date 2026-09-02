import { describe, expect, it } from "vitest";
import {
  parseAuMobile as packageParseAuMobile,
  projectMeProfile as packageProjectMeProfile,
  canDeleteMediaFile as packageCanDeleteMediaFile,
  canTransitionDemoMissionStatus as packageCanTransitionDemoMissionStatus,
  projectMediaForRole as packageProjectMediaForRole,
  parseArn as packageParseArn,
  parseReoc as packageParseReoc,
  hasAllRequiredCredentialsConfirmed as packageHasAllRequiredCredentialsConfirmed,
  canReplaceOperatorCredentials as packageCanReplaceOperatorCredentials,
  type AppRole as PackageAppRole,
  type MediaFile as PackageMediaFile,
} from "@stravyx/types";
import {
  canDeleteMediaFile as edgeCanDeleteMediaFile,
  canTransitionDemoMissionStatus as edgeCanTransitionDemoMissionStatus,
} from "../../supabase/functions/api/missionAuthz.ts";
import {
  projectMediaForRole as edgeProjectMediaForRole,
} from "../../supabase/functions/api/mediaVisibility.ts";
import { parseAuMobile as edgeParseAuMobile } from "../../supabase/functions/api/phone.ts";
import { projectMeProfile as edgeProjectMeProfile } from "../../supabase/functions/api/meProfile.ts";
import {
  parseArn as edgeParseArn,
  parseReoc as edgeParseReoc,
  hasAllRequiredCredentialsConfirmed as edgeHasAllRequiredCredentialsConfirmed,
  canReplaceOperatorCredentials as edgeCanReplaceOperatorCredentials,
} from "../../supabase/functions/api/casaCredentials.ts";

describe("edge mirror parity: media visibility projector", () => {
  const heldFixture: PackageMediaFile = {
    id: "media-1",
    missionId: "mission-1",
    uploadedBy: "user-1",
    kind: "raw",
    visibility: "held",
    byteSize: 1024,
    contentType: "image/jpeg",
    originalName: "roof.jpg",
    confirmedAt: "2026-08-21T00:00:00.000Z",
    releasedAt: null,
    createdAt: "2026-08-21T00:00:00.000Z",
  };
  const releasedFixture: PackageMediaFile = {
    ...heldFixture,
    id: "media-2",
    visibility: "released",
    releasedAt: "2026-08-21T01:00:00.000Z",
  };
  const nullMetadataFixture: PackageMediaFile = {
    ...releasedFixture,
    id: "media-3",
    byteSize: null,
    contentType: null,
    originalName: null,
    confirmedAt: null,
  };

  const roles: PackageAppRole[] = ["customer", "operator", "admin"];
  const fixtures: PackageMediaFile[] = [
    heldFixture,
    releasedFixture,
    nullMetadataFixture,
  ];

  for (const role of roles) {
    for (const fixture of fixtures) {
      it(`matches package projection for role=${role}, media=${fixture.id}`, () => {
        const packageProjection = packageProjectMediaForRole(role, fixture);
        const edgeProjection = edgeProjectMediaForRole(role, fixture);
        expect(edgeProjection).toEqual(packageProjection);
      });
    }
  }

  for (const fixture of fixtures) {
    it(`keeps held media hidden from customers when applicable (${fixture.id})`, () => {
      if (fixture.visibility === "held") {
        expect(packageProjectMediaForRole("customer", fixture)).toBeNull();
        expect(edgeProjectMediaForRole("customer", fixture)).toBeNull();
        return;
      }

      expect(packageProjectMediaForRole("customer", fixture)).not.toBeNull();
      expect(edgeProjectMediaForRole("customer", fixture)).not.toBeNull();
    });
  }
});

describe("edge mirror parity: delivered transition gate", () => {
  const transitions = [
    { fromStatus: "flown", toStatus: "delivered" as const },
    { fromStatus: "allocated", toStatus: "delivered" as const },
    { fromStatus: "accepted", toStatus: "allocated" as const },
    { fromStatus: "assessed", toStatus: "flown" as const },
  ];

  for (const transition of transitions) {
    it(`matches package decision for ${transition.fromStatus} -> ${transition.toStatus}`, () => {
      const packageDecision = packageCanTransitionDemoMissionStatus(
        transition.fromStatus,
        transition.toStatus,
      );
      const edgeDecision = edgeCanTransitionDemoMissionStatus(
        transition.fromStatus,
        transition.toStatus,
      );
      expect(edgeDecision).toBe(packageDecision);
    });
  }
});

describe("edge mirror parity: media delete authz", () => {
  const roles = ["admin", "operator", "customer", "unknown"] as const;
  const uploaderStates = [true, false] as const;
  const visibilities = ["held", "released"] as const;

  for (const role of roles) {
    for (const isUploader of uploaderStates) {
      for (const visibility of visibilities) {
        it(
          `matches package delete decision role=${role}, uploader=${String(isUploader)}, visibility=${visibility}`,
          () => {
            const packageDecision = packageCanDeleteMediaFile({
              role,
              isUploader,
              visibility,
            });
            const edgeDecision = edgeCanDeleteMediaFile({
              role,
              isUploader,
              visibility,
            });
            expect(edgeDecision).toBe(packageDecision);
          },
        );
      }
    }
  }
});

describe("edge mirror parity: parseAuMobile", () => {
  const samples: unknown[] = [
    "400 000 000",
    "0400 000 000",
    "+61 400 000 000",
    "",
    "   ",
    null,
    undefined,
    "08 1234 5678",
    "not-a-phone",
    400000000,
  ];

  for (const sample of samples) {
    it(`matches package parse for ${JSON.stringify(sample)}`, () => {
      expect(edgeParseAuMobile(sample)).toEqual(packageParseAuMobile(sample));
    });
  }
});

describe("edge mirror parity: projectMeProfile", () => {
  const fallback = {
    userId: "user-1",
    email: "ada@example.com",
    role: "operator" as const,
  };
  const row = {
    id: "user-1",
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
  };

  it("matches package projection including CRM field stripping", () => {
    const packageProjection = packageProjectMeProfile(row, fallback);
    const edgeProjection = edgeProjectMeProfile(row, fallback);
    expect(edgeProjection).toEqual(packageProjection);
    expect(JSON.stringify(edgeProjection)).not.toContain("hubspot");
    expect(JSON.stringify(packageProjection)).not.toContain("hs-secret-99");
  });

  it("matches package projection for a missing row", () => {
    expect(edgeProjectMeProfile(null, fallback)).toEqual(
      packageProjectMeProfile(null, fallback),
    );
  });

  it("matches package projection of operator verification fields", () => {
    const reocRow = {
      arn: "123456",
      reoc_number: "CASA.ReOC.0001",
      verification_status: "pending_docs",
      verified: false,
      rejection_reason: null,
      online: false,
    };
    expect(edgeProjectMeProfile(row, fallback, reocRow)).toEqual(
      packageProjectMeProfile(row, fallback, reocRow),
    );
  });
});

describe("edge mirror parity: CASA credential parsers", () => {
  const arnSamples: unknown[] = [
    "123456",
    "1234567",
    "  7654321  ",
    "12345",
    "12345678",
    "123-456",
    "A23456",
    "",
    "   ",
    null,
    undefined,
    123456,
  ];
  const reocSamples: unknown[] = [
    "CASA.ReOC.0001",
    "casa.reoc.1234",
    "Casa.REOC.9876",
    "  casa.ReOc.0420  ",
    "CASA-ReOC-0001",
    "CASA.ReOC.12",
    "CASA.ReOC.12345",
    "",
    null,
    undefined,
    1,
  ];

  for (const sample of arnSamples) {
    it(`matches package parseArn for ${JSON.stringify(sample)}`, () => {
      expect(edgeParseArn(sample)).toEqual(packageParseArn(sample));
    });
  }

  for (const sample of reocSamples) {
    it(`matches package parseReoc for ${JSON.stringify(sample)}`, () => {
      expect(edgeParseReoc(sample)).toEqual(packageParseReoc(sample));
    });
  }

  it("matches package completeness and replaceability helpers", () => {
    const rows = [
      { kind: "reoc_certificate", confirmed_at: "2026-08-24T00:00:00.000Z" },
      { kind: "repl", confirmedAt: "2026-08-24T00:00:00.000Z" },
    ];
    expect(edgeHasAllRequiredCredentialsConfirmed(rows)).toEqual(
      packageHasAllRequiredCredentialsConfirmed(rows),
    );
    expect(edgeCanReplaceOperatorCredentials("pending_review", false)).toEqual(
      packageCanReplaceOperatorCredentials("pending_review", false),
    );
  });
});
