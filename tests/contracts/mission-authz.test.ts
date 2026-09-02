import { describe, expect, it } from "vitest";
import {
  canDeleteMediaFile,
  canMutateAssignedMission,
  canTransitionDemoMissionStatus,
  isDemoStatusTransition,
} from "@stravyx/types";
import { advanceMissionStatus } from "../../supabase/functions/api/routes/missionMutate.ts";

describe("isDemoStatusTransition", () => {
  it("allows allocated, flown, delivered", () => {
    expect(isDemoStatusTransition("allocated")).toBe(true);
    expect(isDemoStatusTransition("flown")).toBe(true);
    expect(isDemoStatusTransition("delivered")).toBe(true);
  });

  it("rejects invalid statuses", () => {
    expect(isDemoStatusTransition("booked")).toBe(false);
    expect(isDemoStatusTransition("accepted")).toBe(false);
    expect(isDemoStatusTransition("")).toBe(false);
  });
});

describe("canTransitionDemoMissionStatus", () => {
  it("allows flown → delivered", () => {
    expect(canTransitionDemoMissionStatus("flown", "delivered")).toBe(true);
  });

  it("rejects non-flown statuses → delivered", () => {
    const nonFlownStatuses = [
      "draft",
      "booked",
      "dispatched",
      "accepted",
      "allocated",
      "assessed",
      "disputed",
      "cancelled",
    ] as const;
    for (const fromStatus of nonFlownStatuses) {
      expect(canTransitionDemoMissionStatus(fromStatus, "delivered")).toBe(
        false,
      );
    }
  });

  it("allows allocated → flown (no regression to demo allowlist)", () => {
    expect(canTransitionDemoMissionStatus("allocated", "flown")).toBe(true);
  });

  it("allows any prior status → allocated", () => {
    expect(canTransitionDemoMissionStatus("accepted", "allocated")).toBe(true);
    expect(canTransitionDemoMissionStatus("dispatched", "allocated")).toBe(
      true,
    );
  });

  it("allows any prior status → flown except delivered gate is separate", () => {
    expect(canTransitionDemoMissionStatus("allocated", "flown")).toBe(true);
    expect(canTransitionDemoMissionStatus("assessed", "flown")).toBe(true);
  });
});

describe("deliver transition mutate authz", () => {
  const assigned = "reoc-assigned";
  const other = "reoc-other";

  it("allows assigned operator to drive flown → delivered", () => {
    expect(canTransitionDemoMissionStatus("flown", "delivered")).toBe(true);
    expect(
      canMutateAssignedMission({
        role: "operator",
        assignedReocId: assigned,
        operatorReocId: assigned,
      }),
    ).toBe(true);
  });

  it("allows admin to drive flown → delivered regardless of assignment", () => {
    expect(canTransitionDemoMissionStatus("flown", "delivered")).toBe(true);
    expect(
      canMutateAssignedMission({
        role: "admin",
        assignedReocId: assigned,
        operatorReocId: other,
      }),
    ).toBe(true);
  });

  it("denies unassigned operator even when transition from flown is valid", () => {
    expect(canTransitionDemoMissionStatus("flown", "delivered")).toBe(true);
    expect(
      canMutateAssignedMission({
        role: "operator",
        assignedReocId: assigned,
        operatorReocId: other,
      }),
    ).toBe(false);
  });

  it("denies customer from driving delivered transition", () => {
    expect(canTransitionDemoMissionStatus("flown", "delivered")).toBe(true);
    expect(
      canMutateAssignedMission({
        role: "customer",
        assignedReocId: assigned,
        operatorReocId: null,
      }),
    ).toBe(false);
  });
});

describe("canMutateAssignedMission", () => {
  const assigned = "reoc-assigned";
  const other = "reoc-other";

  it("denies customer", () => {
    expect(
      canMutateAssignedMission({
        role: "customer",
        assignedReocId: assigned,
        operatorReocId: null,
      }),
    ).toBe(false);
  });

  it("denies operator without assignment match", () => {
    expect(
      canMutateAssignedMission({
        role: "operator",
        assignedReocId: assigned,
        operatorReocId: other,
      }),
    ).toBe(false);
    expect(
      canMutateAssignedMission({
        role: "operator",
        assignedReocId: assigned,
        operatorReocId: null,
      }),
    ).toBe(false);
    expect(
      canMutateAssignedMission({
        role: "operator",
        assignedReocId: null,
        operatorReocId: assigned,
      }),
    ).toBe(false);
  });

  it("allows operator with assigned_reoc_id match", () => {
    expect(
      canMutateAssignedMission({
        role: "operator",
        assignedReocId: assigned,
        operatorReocId: assigned,
      }),
    ).toBe(true);
  });

  it("allows admin regardless of assignment", () => {
    expect(
      canMutateAssignedMission({
        role: "admin",
        assignedReocId: null,
        operatorReocId: null,
      }),
    ).toBe(true);
    expect(
      canMutateAssignedMission({
        role: "admin",
        assignedReocId: assigned,
        operatorReocId: other,
      }),
    ).toBe(true);
  });
});

describe("canDeleteMediaFile", () => {
  it("allows admin for held media", () => {
    expect(
      canDeleteMediaFile({
        role: "admin",
        isUploader: false,
        visibility: "held",
      }),
    ).toBe(true);
  });

  it("denies admin for released media", () => {
    expect(
      canDeleteMediaFile({
        role: "admin",
        isUploader: true,
        visibility: "released",
      }),
    ).toBe(false);
  });

  it("allows uploader operator for held media", () => {
    expect(
      canDeleteMediaFile({
        role: "operator",
        isUploader: true,
        visibility: "held",
      }),
    ).toBe(true);
  });

  it("denies non-uploader operator for held media", () => {
    expect(
      canDeleteMediaFile({
        role: "operator",
        isUploader: false,
        visibility: "held",
      }),
    ).toBe(false);
  });

  it("denies uploader operator for released media", () => {
    expect(
      canDeleteMediaFile({
        role: "operator",
        isUploader: true,
        visibility: "released",
      }),
    ).toBe(false);
  });

  it("denies customer for held and released media", () => {
    expect(
      canDeleteMediaFile({
        role: "customer",
        isUploader: true,
        visibility: "held",
      }),
    ).toBe(false);
    expect(
      canDeleteMediaFile({
        role: "customer",
        isUploader: true,
        visibility: "released",
      }),
    ).toBe(false);
  });

  it("denies unknown role", () => {
    expect(
      canDeleteMediaFile({
        role: "manager",
        isUploader: true,
        visibility: "held",
      }),
    ).toBe(false);
  });
});

describe("status route delivered guard", () => {
  it("rejects delivered status on /missions/:id/status with stable code", async () => {
    const req = new Request("http://localhost/api/missions/mission-1/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "delivered" }),
    });

    const adminAccessGuard = new Proxy({}, {
      get() {
        throw new Error("admin_unexpected_access");
      },
    }) as Parameters<typeof advanceMissionStatus>[2]["admin"];
    const ctx: Parameters<typeof advanceMissionStatus>[2] = {
      cors: {},
      admin: adminAccessGuard,
      userClient: adminAccessGuard,
      userId: "operator-user-1",
      role: "operator",
    };

    const response = await advanceMissionStatus("mission-1", req, ctx);
    expect(response.status).toBe(409);
    const payload = await response.json() as {
      error?: string;
      code?: string;
      detail?: string;
    };
    expect(payload.error).toBe("Delivered status must use dedicated deliver endpoint");
    expect(payload.code).toBe("use_deliver_endpoint");
    expect(payload.detail).toContain("POST /missions/:id/deliver");
  });
});
