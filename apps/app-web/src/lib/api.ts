import { createApiClient } from "@stravyx/api-client";
import { supabase } from "./supabase";

/** Single-flight refresh — concurrent refreshSession() races invalidate rotated refresh tokens. */
let refreshInflight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshInflight) {
    refreshInflight = (async () => {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session?.access_token) return null;
      return data.session.access_token;
    })().finally(() => {
      refreshInflight = null;
    });
  }
  return refreshInflight;
}

async function getFreshAccessToken(options?: {
  forceRefresh?: boolean;
}): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token) return null;

  const expiresAtMs = (session.expires_at ?? 0) * 1000;
  const expiredOrExpiring =
    options?.forceRefresh ||
    !expiresAtMs ||
    expiresAtMs < Date.now() + 60_000;

  if (expiredOrExpiring) {
    const token = await refreshAccessToken();
    if (token) return token;
    // Do not send a known-stale JWT — Edge getUser() will 401.
    await supabase.auth.signOut();
    return null;
  }

  return session.access_token;
}

export const api = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "",
  getAccessToken: () => getFreshAccessToken(),
  refreshAccessToken: () => getFreshAccessToken({ forceRefresh: true }),
  getApiKey: () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null,
});
