import { projectMeProfile, type AppRole, type MeProfile, type OperatorOfferListItem } from "@stravyx/types";
import { offerToJob } from "./mapMission";
import type { Job } from "../stravyx/types";
import {
  advanceFetchSequenceGate,
  isFetchResponseCurrent,
  type FetchSequenceGate,
} from "./fetchSequenceGate";

export interface OperatorMeLike {
  profile?: MeProfile | null;
  userId: string;
  email?: string;
  role?: string | null;
}

export function meProfileFromSettled(
  result: PromiseSettledResult<OperatorMeLike>,
): MeProfile | null {
  if (result.status !== "fulfilled") return null;
  const me = result.value;
  return (
    me.profile ??
    projectMeProfile(null, {
      userId: me.userId,
      email: me.email,
      role: (me.role ?? "operator") as AppRole,
    })
  );
}

export function operatorJobsFromOffers(offers: readonly OperatorOfferListItem[]): {
  offerByMission: Record<string, string>;
  jobs: Job[];
  pendingJobs: Job[];
} {
  const offerByMission: Record<string, string> = {};
  const jobs = offers.map((offer) => {
    offerByMission[offer.missionId] = offer.offerId;
    return offerToJob(offer);
  });
  return {
    offerByMission,
    jobs,
    pendingJobs: jobs.filter((job) => job.status === "pending"),
  };
}

export async function loadOperatorPoll(client: {
  listMissions: () => Promise<{ offers?: OperatorOfferListItem[] }>;
  me: () => Promise<OperatorMeLike>;
}): Promise<{
  profile: MeProfile | null;
  missionsResult: PromiseSettledResult<{ offers?: OperatorOfferListItem[] }>;
}> {
  const [missionsResult, meResult] = await Promise.allSettled([
    client.listMissions(),
    client.me(),
  ]);
  return {
    profile: meProfileFromSettled(meResult),
    missionsResult,
  };
}

export function stampMeProfileAfterMutation(
  gateRef: { current: FetchSequenceGate },
  seqRef: { current: number },
  setMeProfile: (profile: MeProfile) => void,
  profile: MeProfile,
): void {
  gateRef.current = advanceFetchSequenceGate(gateRef.current, seqRef.current);
  setMeProfile(profile);
}

export async function refreshOperatorPoll(input: {
  client: {
    listMissions: () => Promise<{ offers?: OperatorOfferListItem[] }>;
    me: () => Promise<OperatorMeLike>;
  };
  fetchSeq: number;
  gateRef: { current: FetchSequenceGate };
  setMeProfile: (profile: MeProfile) => void;
  setOfferByMission: (map: Record<string, string>) => void;
  setAvailableJobs: (jobs: Job[]) => void;
  setJobs: (jobs: Job[]) => void;
  applyOperatorRefresh: (payload: { list: Job[]; fetchSeq: number }) => void;
}): Promise<void> {
  const loaded = await loadOperatorPoll(input.client);
  if (!isFetchResponseCurrent(input.gateRef.current, input.fetchSeq)) return;
  input.gateRef.current = advanceFetchSequenceGate(input.gateRef.current, input.fetchSeq);
  if (loaded.profile) input.setMeProfile(loaded.profile);
  if (loaded.missionsResult.status === "rejected") {
    throw loaded.missionsResult.reason;
  }
  const mapped = operatorJobsFromOffers(loaded.missionsResult.value.offers ?? []);
  input.setOfferByMission(mapped.offerByMission);
  input.setAvailableJobs(mapped.pendingJobs);
  input.applyOperatorRefresh({ list: mapped.jobs, fetchSeq: input.fetchSeq });
  input.setJobs(mapped.jobs);
}

