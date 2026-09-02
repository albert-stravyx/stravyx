import { createClient } from "jsr:@supabase/supabase-js@2";

/** Service-role client. Bypasses RLS — only for handlers that authorise the caller themselves. */
export function serviceClient(url: string, serviceKey: string) {
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** JWT-scoped client. Preferred for reads the caller owns, so RLS still applies. */
export function jwtScopedClient(url: string, anonKey: string, jwt: string) {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Derived from the factory rather than written by hand: the schema generics are
 * inferred from the real call, so handler signatures stay assignable.
 */
export type ServiceClient = ReturnType<typeof serviceClient>;

/** Per-request state shared by every authenticated route handler. */
export interface RequestContext {
  cors: Record<string, string>;
  admin: ServiceClient;
  userClient: ServiceClient;
  userId: string;
  role: string;
}
