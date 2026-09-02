import { describe, expect, it } from "vitest";
import { projectMeProfile } from "@stravyx/types";
import {
  loadOperatorPoll,
  meProfileFromSettled,
  operatorJobsFromOffers,
  refreshOperatorPoll,
  stampMeProfileAfterMutation,
} from "../../apps/app-web/src/lib/operatorPollRefresh.ts";
import {
  createFetchSequenceGate,
  isFetchResponseCurrent,
} from "../../apps/app-web/src/lib/fetchSequenceGate.ts";

describe("meProfileFromSettled", () => {
  it("returns the fulfilled /me profile", () => {
    const profile = projectMeProfile(null, {
      userId: "op-1",
      email: "op@example.com",
      role: "operator",
    });
    const result: PromiseSettledResult<{
      profile: typeof profile;
      userId: string;
      email: string;
      role: string;
    }> = {
      status: "fulfilled",
      value: {
        profile,
        userId: "op-1",
        email: "op@example.com",
        role: "operator",
      },
    };
    expect(meProfileFromSettled(result)).toEqual(profile);
  });

  it("projects a fallback when /me has no profile payload", () => {
    const result: PromiseSettledResult<{
      profile: null;
      userId: string;
      email: string;
      role: string;
    }> = {
      status: "fulfilled",
      value: {
        profile: null,
        userId: "op-1",
        email: "op@example.com",
        role: "operator",
      },
    };
    const projected = meProfileFromSettled(result);
    expect(projected?.id).toBe("op-1");
    expect(projected?.email).toBe("op@example.com");
    expect(projected?.primaryRole).toBe("operator");
    expect(projected?.verified).toBeNull();
    expect(projected?.online).toBeNull();
  });

  it("returns null when /me is rejected so mission refresh can still apply", () => {
    const result: PromiseSettledResult<{ userId: string }> = {
      status: "rejected",
      reason: new Error("me unavailable"),
    };
    expect(meProfileFromSettled(result)).toBeNull();
  });
});

describe("loadOperatorPoll", () => {
  it("returns /me even when missions reject so verify gating can still update", async () => {
    const profile = projectMeProfile(null, {
      userId: "op-1",
      email: "op@example.com",
      role: "operator",
    });
    const ok = await loadOperatorPoll({
      listMissions: async () => ({
        offers: [
          {
            offerId: "offer-1",
            missionId: "mission-1",
            status: "sent",
            missionStatus: "dispatched",
            earnCents: 8500,
            currency: "AUD",
          },
        ],
      }),
      me: async () => ({
        profile,
        userId: "op-1",
        email: "op@example.com",
        role: "operator",
      }),
    });
    expect(ok.profile).toEqual(profile);
    expect(ok.missionsResult.status).toBe("fulfilled");

    const failed = await loadOperatorPoll({
      listMissions: async () => {
        throw new Error("missions unavailable");
      },
      me: async () => ({
        profile,
        userId: "op-1",
        email: "op@example.com",
        role: "operator",
      }),
    });
    expect(failed.profile).toEqual(profile);
    expect(failed.missionsResult.status).toBe("rejected");
  });
});

describe("refreshOperatorPoll", () => {
  it("applies /me before throwing a missions failure", async () => {
    const profile = projectMeProfile(null, {
      userId: "op-1",
      email: "op@example.com",
      role: "operator",
    });
    const gateRef = { current: createFetchSequenceGate() };
    let stored: ReturnType<typeof projectMeProfile> | null = null;
    await expect(
      refreshOperatorPoll({
        client: {
          listMissions: async () => {
            throw new Error("missions unavailable");
          },
          me: async () => ({
            profile,
            userId: "op-1",
            email: "op@example.com",
            role: "operator",
          }),
        },
        fetchSeq: 1,
        gateRef,
        setMeProfile: (next) => {
          stored = next;
        },
        setOfferByMission: () => undefined,
        setAvailableJobs: () => undefined,
        setJobs: () => undefined,
        applyOperatorRefresh: () => undefined,
      }),
    ).rejects.toThrow("missions unavailable");
    expect(stored).toEqual(profile);
  });
});

describe("stampMeProfileAfterMutation", () => {
  it("advances the fetch gate so an in-flight poll cannot overwrite the write", () => {
    const gateRef = { current: createFetchSequenceGate() };
    const seqRef = { current: 4 };
    let stored: ReturnType<typeof projectMeProfile> | null = null;
    const profile = projectMeProfile(null, {
      userId: "op-1",
      email: "op@example.com",
      role: "operator",
    });
    stampMeProfileAfterMutation(gateRef, seqRef, (next) => {
      stored = next;
    }, profile);
    expect(stored).toEqual(profile);
    expect(isFetchResponseCurrent(gateRef.current, 4)).toBe(false);
    expect(isFetchResponseCurrent(gateRef.current, 5)).toBe(true);
  });
});

describe("operatorJobsFromOffers", () => {
  it("indexes offer ids and keeps pending jobs for the available list", () => {
    const mapped = operatorJobsFromOffers([
      {
        offerId: "offer-1",
        missionId: "mission-1",
        status: "sent",
        missionStatus: "dispatched",
        earnCents: 8500,
        currency: "AUD",
      },
      {
        offerId: "offer-2",
        missionId: "mission-2",
        status: "accepted",
        missionStatus: "accepted",
        earnCents: 8500,
        currency: "AUD",
      },
    ]);
    expect(mapped.offerByMission).toEqual({
      "mission-1": "offer-1",
      "mission-2": "offer-2",
    });
    expect(mapped.jobs.map((job) => job.id)).toEqual(["mission-1", "mission-2"]);
    expect(mapped.pendingJobs.map((job) => job.id)).toEqual(["mission-1"]);
  });
});
