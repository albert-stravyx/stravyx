import type {
  AppRole,
  CreateMissionInput,
  CreateMissionResult,
  CustomerNotificationsResponse,
  CustomerMissionSummary,
  CustomerQuote,
  MediaProjection,
  MeResponse,
  OperatorCredentialConfirmInput,
  OperatorCredentialUploadUrlInput,
  OperatorCredentialUploadUrlResponse,
  OperatorCredentialsListResponse,
  OperatorOfferListItem,
  PendingOperatorItem,
  QuoteInput,
  SignupInput,
  SignupResult,
  VerifyOperatorInput,
} from "@stravyx/types";

export type ApiClientOptions = {
  baseUrl: string;
  getAccessToken?: () => Promise<string | null>;
  /** Force a session refresh before retrying a 401 once. */
  refreshAccessToken?: () => Promise<string | null>;
  /** Supabase anon/publishable key — required by Functions gateway best practice */
  getApiKey?: () => string | null;
};

type RequestInitWithRetry = RequestInit & { __retried?: boolean };

/**
 * Supabase Functions gateway JWT check needs an `Authorization` header.
 * Logged-out calls (signup, quote, health) have no user JWT, so send the
 * publishable anon key as Bearer — the same pattern supabase-js uses.
 */
export function edgeAuthorizationHeader(
  accessToken: string | null,
  apiKey: string | null,
): string | null {
  if (accessToken) return `Bearer ${accessToken}`;
  if (apiKey) return `Bearer ${apiKey}`;
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getStringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function parseApiErrorBody(body: string): { code: string | null; detail: string | null } {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!isRecord(parsed)) {
      return { code: null, detail: null };
    }
    return {
      code: getStringField(parsed, "code"),
      detail: getStringField(parsed, "detail"),
    };
  } catch {
    return { code: null, detail: null };
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly detail: string | null;

  constructor(
    message: string,
    params: { status: number; code: string | null; detail: string | null },
  ) {
    super(message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.detail = params.detail;
  }
}

async function request<T>(
  opts: ApiClientOptions,
  path: string,
  init?: RequestInitWithRetry,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const token = opts.getAccessToken ? await opts.getAccessToken() : null;
  const apiKey = opts.getApiKey?.() ?? null;
  const authorization = edgeAuthorizationHeader(token, apiKey);
  if (authorization) headers.set("Authorization", authorization);
  if (apiKey) headers.set("apikey", apiKey);

  const res = await fetch(`${opts.baseUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
  });
  if (res.status === 401 && opts.refreshAccessToken && !init?.__retried) {
    const refreshed = await opts.refreshAccessToken();
    if (refreshed) {
      return request<T>(opts, path, { ...init, __retried: true });
    }
  }
  if (!res.ok) {
    const body = await res.text();
    const parsedError = parseApiErrorBody(body);
    throw new ApiError(`API ${res.status} ${path}: ${body}`, {
      status: res.status,
      code: parsedError.code,
      detail: parsedError.detail,
    });
  }
  return res.json() as Promise<T>;
}

export function createApiClient(opts: ApiClientOptions) {
  return {
    health: () => request<{ ok: boolean; service?: string; phase?: string }>(opts, "/api/health"),

    quote: (input: QuoteInput) =>
      request<CustomerQuote>(opts, "/api/pricing/quote", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    signup: (input: SignupInput) =>
      request<SignupResult>(opts, "/api/signup", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    me: () => request<MeResponse>(opts, "/api/me"),

    setOperatorAvailability: (input: { online: boolean }) =>
      request<{ ok: boolean; reocId: string; online: boolean }>(
        opts,
        "/api/operator/availability",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),

    createMission: (input: CreateMissionInput) =>
      request<CreateMissionResult>(opts, "/api/missions", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    listMissions: () =>
      request<{
        missions?: CustomerMissionSummary[] | AdminMissionRow[];
        offers?: OperatorOfferListItem[];
      }>(opts, "/api/missions"),

    listNotifications: () =>
      request<CustomerNotificationsResponse>(opts, "/api/notifications"),

    acceptOffer: (offerId: string) =>
      request<{
        ok: boolean;
        missionId: string;
        fullAddress?: string;
        suburb?: string;
      }>(opts, `/api/offers/${offerId}/accept`, { method: "POST" }),

    updateMissionStatus: (
      missionId: string,
      status: "allocated" | "flown",
    ) =>
      request<{ ok: boolean; missionId: string; status: string }>(
        opts,
        `/api/missions/${missionId}/status`,
        {
          method: "POST",
          body: JSON.stringify({ status }),
        },
      ),

    getUploadUrl: (
      missionId: string,
      input: { filename: string; contentType?: string },
    ) =>
      request<UploadUrlResponse>(opts, `/api/missions/${missionId}/media/upload-url`, {
        method: "POST",
        body: JSON.stringify(input),
      }),

    confirmUpload: (
      missionId: string,
      mediaId: string,
      input: { byteSize: number; contentType?: string; originalName: string },
    ) =>
      request<{
        ok: boolean;
        missionId: string;
        mediaId: string;
        storedByteSize: number;
        clientByteSize: number;
      }>(
        opts,
        `/api/missions/${missionId}/media/${mediaId}/confirm`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),

    deliverMission: (missionId: string) =>
      request<{
        ok: boolean;
        missionId: string;
        status: "delivered";
        releasedCount: number;
      }>(opts, `/api/missions/${missionId}/deliver`, { method: "POST" }),

    listMissionMedia: (missionId: string) =>
      request<{ media: MissionMediaListItem[] }>(opts, `/api/missions/${missionId}/media`),

    deleteMissionMedia: (missionId: string, mediaId: string) =>
      request<DeleteMissionMediaResponse>(
        opts,
        `/api/missions/${missionId}/media/${mediaId}`,
        { method: "DELETE" },
      ),

    listOperatorCredentials: () =>
      request<OperatorCredentialsListResponse>(opts, "/api/operator/credentials"),

    createOperatorCredentialUploadUrl: (input: OperatorCredentialUploadUrlInput) =>
      request<OperatorCredentialUploadUrlResponse>(opts, "/api/operator/credentials/upload-url", {
        method: "POST",
        body: JSON.stringify(input),
      }),

    confirmOperatorCredential: (id: string, input: OperatorCredentialConfirmInput) =>
      request<{
        ok: boolean;
        id: string;
        reocId: string;
        kind: string;
        storedByteSize: number;
        clientByteSize: number;
      }>(opts, `/api/operator/credentials/${id}/confirm`, {
        method: "POST",
        body: JSON.stringify(input),
      }),

    listPendingOperators: () =>
      request<{ operators: PendingOperatorItem[] }>(opts, "/api/admin/operators/pending"),

    verifyOperator: (reocId: string, input: VerifyOperatorInput) =>
      request<{
        ok: boolean;
        reocId: string;
        decision: "approve" | "reject";
        verificationStatus: string;
        verified: boolean;
      }>(opts, `/api/admin/operators/${reocId}/verify`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
  };
}

export type DeleteMissionMediaResponse = {
  ok: boolean;
  missionId: string;
  mediaId: string;
  /**
   * Optional for backward compatibility with independently deployed Edge builds.
   * `true` means storage remove reported no error (best effort; object-list verification is not enforced).
   */
  storageRemoved?: boolean;
  cleanup?: { code: string; detail: string };
};

/** Admin list row shape from Edge GET /missions */
export type AdminMissionRow = {
  missionId: string;
  status: string;
  networkPriceCents: number;
  flightFeeCents: number;
  layer2Cents: number;
  operatorEarnCents: number;
  platformFeeCents: number;
  fullAddress?: string;
  suburb?: string;
};

export type UploadUrlResponse = {
  mediaId: string;
  missionId: string;
  upload: {
    path: string;
    token: string;
    signedUrl: string;
  };
};

export type MissionMediaListItem = MediaProjection & {
  downloadUrl: string;
  expiresAt: string;
  expiresInSeconds: number;
};

export type UserRole = AppRole;

export type StravyxApiClient = ReturnType<typeof createApiClient>;
