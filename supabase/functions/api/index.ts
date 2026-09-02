import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { jwtScopedClient, serviceClient } from "./client.ts";
import { corsHeaders, json } from "./http.ts";
import { networkPriceCents } from "./pricing.ts";
import { createMission } from "./routes/createMission.ts";
import { listMissions } from "./routes/listMissions.ts";
import { acceptOffer } from "./routes/acceptOffer.ts";
import { advanceMissionStatus } from "./routes/missionMutate.ts";
import {
  confirmMediaUpload,
  createMediaUploadUrl,
  deliverMissionMedia,
  listMissionMedia,
} from "./routes/media.ts";
import { deleteMissionMedia } from "./routes/mediaDelete.ts";
import { listCustomerNotifications } from "./routes/notifications.ts";
import { signup } from "./routes/signup.ts";
import { parseAppRole } from "./routes/mediaShared.ts";
import { projectMeProfile } from "./meProfile.ts";
import {
  confirmOperatorCredential,
  createOperatorCredentialUploadUrl,
  listOperatorCredentials,
} from "./routes/operatorCredentials.ts";
import {
  listPendingOperators,
  verifyOperator,
} from "./routes/adminOperatorVerify.ts";
import { setOperatorAvailability } from "./routes/operatorAvailability.ts";
import type { RequestContext } from "./client.ts";

function pathOf(req: Request) {
  const u = new URL(req.url);
  // /api/... or /functions/v1/api/...
  const raw = u.pathname.replace(/^\/functions\/v1\/api/, "").replace(/^\/api/, "");
  return raw || "/";
}

Deno.serve(async (req) => {
  const cors = corsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const path = pathOf(req);
  const authHeader = req.headers.get("Authorization");

  try {
    if (req.method === "GET" && (path === "/" || path === "/health")) {
      return json({
        ok: true,
        service: "stravyx-api",
        phase: "1A",
        env: {
          hasUrl: Boolean(supabaseUrl),
          hasAnon: Boolean(anonKey),
          hasService: Boolean(serviceKey),
        },
      }, 200, cors);
    }

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return json({ error: "Server misconfigured: missing Supabase env" }, 500, cors);
    }

    const admin = serviceClient(supabaseUrl, serviceKey);

    if (req.method === "POST" && path === "/pricing/quote") {
      const body = await req.json();
      const durationMinutes = Number(body.durationMinutes);
      const urgency = String(body.urgency ?? "standard");
      const equipmentFactor = Number(body.equipmentFactor ?? 1);
      const cents = networkPriceCents(durationMinutes, urgency, equipmentFactor);
      return json({
        networkPriceCents: cents,
        currency: "AUD",
        durationMinutes,
        urgency,
      }, 200, cors);
    }

    if (req.method === "POST" && path === "/signup") {
      return await signup(req, cors, {
        auth: admin.auth,
        upsertProfile: async (row) => {
          const { error } = await admin.from("profiles").upsert(
            {
              id: row.id,
              email: row.email,
              full_name: row.full_name,
              primary_role: row.primary_role,
              phone_e164: row.phone_e164,
              company: row.company,
              default_location: row.default_location,
              operator_licence_number: row.operator_licence_number,
              service_area: row.service_area,
            },
            { onConflict: "id" },
          );
          if (!error) return { error: null };
          return {
            error: {
              message: error.message,
              code: error.code,
              details: error.details ?? undefined,
            },
          };
        },
        insertOrganization: async (row) => {
          const { data, error } = await admin
            .from("organizations")
            .insert({ name: row.name })
            .select("id")
            .single();
          if (!error && data && typeof data.id === "string") {
            return { data: { id: data.id }, error: null };
          }
          return {
            data: null,
            error: error
              ? {
                message: error.message,
                code: error.code,
                details: error.details ?? undefined,
              }
              : { message: "organization insert returned no id" },
          };
        },
        insertReocProfile: async (row) => {
          const { error } = await admin.from("reoc_profiles").insert({
            owner_user_id: row.owner_user_id,
            organization_id: row.organization_id,
            arn: row.arn,
            reoc_number: row.reoc_number,
            verified: row.verified,
            online: row.online,
            verification_status: row.verification_status,
          });
          if (!error) return { error: null };
          return {
            error: {
              message: error.message,
              code: error.code,
              details: error.details ?? undefined,
            },
          };
        },
      });
    }

    // Remaining routes require a user JWT
    const jwt = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) {
      return json({ error: "Unauthorized", reason: "missing_token" }, 401, cors);
    }

    // Validate JWT via Auth API (more reliable than relying on client header wiring)
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) {
      return json({
        error: "Unauthorized",
        reason: "invalid_token",
        detail: userErr?.message ?? "no_user",
      }, 401, cors);
    }
    const user = userData.user;
    const userClient = jwtScopedClient(supabaseUrl, anonKey, jwt);
    // Prefer JWT-scoped client for own profile (RLS); fall back to service role.
    const { data: profileOwn } = await userClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    const { data: profileAdmin } = profileOwn
      ? { data: profileOwn }
      : await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
    const profile = profileOwn ?? profileAdmin;
    const role = (profile?.primary_role as string | undefined) ??
      (user.app_metadata?.role as string | undefined) ??
      "customer";

    if (req.method === "GET" && path === "/me") {
      const { data: reoc } = await admin
        .from("reoc_profiles")
        .select("arn, reoc_number, verification_status, verified, rejection_reason, online")
        .eq("owner_user_id", user.id)
        .limit(1)
        .maybeSingle();
      return json({
        userId: user.id,
        email: user.email,
        role,
        profile: projectMeProfile(profile, {
          userId: user.id,
          email: user.email,
          role: parseAppRole(role),
        }, reoc),
      }, 200, cors);
    }

    const ctx: RequestContext = {
      cors,
      admin,
      userClient,
      userId: user.id,
      role,
    };

    if (req.method === "POST" && path === "/missions") {
      return await createMission(req, ctx);
    }

    if (req.method === "GET" && path === "/missions") {
      return await listMissions(ctx);
    }

    if (req.method === "GET" && path === "/notifications") {
      return await listCustomerNotifications(ctx);
    }

    const acceptMatch = path.match(/^\/offers\/([^/]+)\/accept$/);
    if (req.method === "POST" && acceptMatch) {
      return await acceptOffer(acceptMatch[1]!, ctx);
    }

    const statusMatch = path.match(/^\/missions\/([^/]+)\/status$/);
    if (req.method === "POST" && statusMatch) {
      return await advanceMissionStatus(statusMatch[1]!, req, ctx);
    }

    const mediaUploadMatch = path.match(/^\/missions\/([^/]+)\/media\/upload-url$/);
    if (req.method === "POST" && mediaUploadMatch) {
      return await createMediaUploadUrl(mediaUploadMatch[1]!, req, ctx);
    }

    const mediaConfirmMatch = path.match(/^\/missions\/([^/]+)\/media\/([^/]+)\/confirm$/);
    if (req.method === "POST" && mediaConfirmMatch) {
      return await confirmMediaUpload(mediaConfirmMatch[1]!, mediaConfirmMatch[2]!, req, ctx);
    }

    const missionDeliverMatch = path.match(/^\/missions\/([^/]+)\/deliver$/);
    if (req.method === "POST" && missionDeliverMatch) {
      return await deliverMissionMedia(missionDeliverMatch[1]!, ctx);
    }

    const missionMediaListMatch = path.match(/^\/missions\/([^/]+)\/media$/);
    if (req.method === "GET" && missionMediaListMatch) {
      return await listMissionMedia(missionMediaListMatch[1]!, ctx);
    }

    const missionMediaDeleteMatch = path.match(/^\/missions\/([^/]+)\/media\/([^/]+)$/);
    if (req.method === "DELETE" && missionMediaDeleteMatch) {
      return await deleteMissionMedia(
        missionMediaDeleteMatch[1]!,
        missionMediaDeleteMatch[2]!,
        ctx,
      );
    }

    if (req.method === "POST" && path === "/operator/credentials/upload-url") {
      return await createOperatorCredentialUploadUrl(req, ctx);
    }

    const credentialConfirmMatch = path.match(/^\/operator\/credentials\/([^/]+)\/confirm$/);
    if (req.method === "POST" && credentialConfirmMatch) {
      return await confirmOperatorCredential(credentialConfirmMatch[1]!, req, ctx);
    }

    if (req.method === "GET" && path === "/operator/credentials") {
      return await listOperatorCredentials(req, ctx);
    }

    if (req.method === "POST" && path === "/operator/availability") {
      return await setOperatorAvailability(req, ctx);
    }

    if (req.method === "GET" && path === "/admin/operators/pending") {
      return await listPendingOperators(ctx);
    }

    const adminVerifyMatch = path.match(/^\/admin\/operators\/([^/]+)\/verify$/);
    if (req.method === "POST" && adminVerifyMatch) {
      return await verifyOperator(adminVerifyMatch[1]!, req, ctx);
    }

    return json({ error: "Not found", path }, 404, cors);
  } catch (e) {
    return json({ error: String(e) }, 500, cors);
  }
});
