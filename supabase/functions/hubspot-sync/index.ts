// hubspot-sync — v4
// v3: form_source / abn / onboarding_status mapping + PATCH on email conflict
// v4: homeowner suburb maps to standard `city`; strip unknown HubSpot properties and retry

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-hubspot-sync-secret",
};

type LeadRow = Record<string, unknown> & {
  id: string;
  hubspot_contact_id?: string | null;
  __table?: string;
};

type HubspotProps = Record<string, string>;

function str(v: unknown): string | undefined {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : undefined;
}

function splitName(raw?: unknown): { firstname?: string; lastname?: string } {
  const v = str(raw);
  if (!v) return {};
  const parts = v.split(/\s+/);
  return { firstname: parts[0], lastname: parts.slice(1).join(" ") || undefined };
}

function splitContact(raw?: unknown): { email?: string; phone?: string; raw?: string } {
  const v = str(raw);
  if (!v) return {};
  if (v.includes("@")) return { email: v };
  const digits = v.replace(/[^\d+]/g, "");
  if (digits.length >= 8) return { phone: v };
  return { raw: v };
}

function utmProps(row: LeadRow): HubspotProps {
  const out: HubspotProps = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"] as const) {
    const v = str(row[k]);
    if (v) out[k] = v;
  }
  return out;
}

function baseProps(row: LeadRow, table: string, leadType: string): HubspotProps {
  const out: HubspotProps = {
    stravyx_lead_id: String(row.id),
    lead_type: leadType,
    form_source: table,
    ...utmProps(row),
  };
  const status = str(row.status);
  if (status) out.onboarding_status = status;
  return out;
}

const TABLE_MAP: Record<string, (row: LeadRow) => HubspotProps> = {
  academy_enquiries: (row) => {
    const out: HubspotProps = { ...baseProps(row, "academy_enquiries", "Academy enquiry") };
    const email = str(row.email);
    if (email) out.email = email;
    const first = str(row.first_name);
    if (first) out.firstname = first;
    const mobile = str(row.mobile);
    if (mobile) out.phone = mobile;
    const state = str(row.state);
    if (state) out.academy_state = state;
    const status = str(row.current_status);
    if (status) out.academy_current_status = status;
    const timeline = str(row.timeline);
    if (timeline) out.academy_timeline = timeline;
    const quals = str(row.existing_qualifications);
    if (quals) out.academy_qualifications = quals;
    return out;
  },

  operator_leads: (row) => {
    const out: HubspotProps = { ...baseProps(row, "operator_leads", "ReOC / operator interest") };
    const c = splitContact(row.contact);
    if (c.email) out.email = c.email;
    if (c.phone) out.phone = c.phone;
    if (c.raw) out.raw_contact_value = c.raw;
    const holds = str(row.holds);
    if (holds) out.operator_licences_held = holds;
    const area = str(row.service_area);
    if (area) out.operator_service_area = area;
    return out;
  },

  contact_leads: (row) => {
    const out: HubspotProps = {
      ...baseProps(row, "contact_leads", "General enquiry"),
      ...splitName(row.name),
    };
    const email = str(row.email);
    if (email) out.email = email;
    const company = str(row.company);
    if (company) out.company = company;
    const topic = str(row.topic);
    if (topic) out.contact_topic = topic;
    const message = str(row.message);
    if (message) out.contact_message = message;
    return out;
  },

  enterprise_leads: (row) => {
    const out: HubspotProps = {
      ...baseProps(row, "enterprise_leads", "Enterprise / dock"),
      ...splitName(row.contact_name),
    };
    const email = str(row.email);
    if (email) out.email = email;
    const phone = str(row.phone);
    if (phone) out.phone = phone;
    const company = str(row.company_name);
    if (company) out.company = company;
    const industry = str(row.industry);
    if (industry) out.enterprise_industry = industry;
    const sites = str(row.sites_count);
    if (sites) out.enterprise_sites_count = sites;
    const need = str(row.what_do_you_need);
    if (need) out.enterprise_need = need;
    return out;
  },

  business_leads: (row) => {
    const out: HubspotProps = {
      ...baseProps(row, "business_leads", "Free flight claim (business)"),
    };
    const c = splitContact(row.contact);
    if (c.email) out.email = c.email;
    if (c.phone) out.phone = c.phone;
    if (c.raw) out.raw_contact_value = c.raw;
    const abn = str(row.abn);
    if (abn) out.abn = abn;
    return out;
  },

  home_owner_leads: (row) => {
    const out: HubspotProps = { ...baseProps(row, "home_owner_leads", "Homeowner") };
    const c = splitContact(row.contact);
    if (c.email) out.email = c.email;
    if (c.phone) out.phone = c.phone;
    if (c.raw) out.raw_contact_value = c.raw;
    const need = str(row.need);
    // Prefer custom prop when present; HubSpot rejects unknown keys, so also set description.
    if (need) {
      out.homeowner_need = need;
      out.description = need;
    }
    const suburb = str(row.suburb);
    // Standard HubSpot contact property (avoids missing homeowner_suburb custom prop).
    if (suburb) out.city = suburb;
    return out;
  },

  talent_interests: (row) => {
    const out: HubspotProps = {
      ...baseProps(row, "talent_interests", "Talent / careers"),
      ...splitName(row.name),
    };
    const email = str(row.email);
    if (email) out.email = email;
    const area = str(row.area_of_interest);
    if (area) out.talent_area_of_interest = area;
    const linkedin = str(row.linkedin_url);
    if (linkedin) out.talent_linkedin_url = linkedin;
    const note = str(row.note);
    if (note) out.talent_note = note;
    return out;
  },
};

const ALLOWED = Object.keys(TABLE_MAP);

function missingPropertyNames(errBody: unknown): string[] {
  const names = new Set<string>();
  const errors = (errBody as { errors?: Array<{ context?: { propertyName?: string[] }; message?: string }> })
    ?.errors;
  if (Array.isArray(errors)) {
    for (const e of errors) {
      for (const n of e.context?.propertyName ?? []) names.add(n);
      const m = e.message?.match(/Property "([^"]+)" does not exist/);
      if (m?.[1]) names.add(m[1]);
    }
  }
  const msg = (errBody as { message?: string })?.message ?? "";
  // HubSpot messages use normal quotes, e.g. Property "foo" does not exist
  for (const m of msg.matchAll(/Property "([^"]+)" does not exist/g)) {
    names.add(m[1]!);
  }
  return [...names];
}

async function createOrUpdateContact(
  token: string,
  props: HubspotProps,
): Promise<{ ok: true; id: string; reused?: boolean } | { ok: false; error: unknown; sent: HubspotProps }> {
  let working = { ...props };

  for (let attempt = 0; attempt < 3; attempt++) {
    const hsRes = await fetch("https://api.hubapi.com/crm/v3/objects/contacts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ properties: working }),
    });

    if (hsRes.status === 409 && working.email) {
      const search = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts/search",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            filterGroups: [
              { filters: [{ propertyName: "email", operator: "EQ", value: working.email }] },
            ],
            limit: 1,
          }),
        },
      );
      const searchJson = await search.json();
      const id = searchJson?.results?.[0]?.id;
      if (!id) return { ok: false, error: { conflict_unresolved: searchJson }, sent: working };

      const updateRes = await fetch(
        `https://api.hubapi.com/crm/v3/objects/contacts/${id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ properties: working }),
        },
      );
      const updateJson = await updateRes.json();
      if (updateRes.ok) return { ok: true, id: String(id), reused: true };

      const missing = missingPropertyNames(updateJson);
      if (missing.length && attempt < 2) {
        for (const n of missing) delete working[n];
        continue;
      }
      return { ok: false, error: updateJson, sent: working };
    }

    const hsJson = await hsRes.json();
    if (hsRes.ok) return { ok: true, id: String(hsJson.id) };

    const missing = missingPropertyNames(hsJson);
    if (missing.length && attempt < 2) {
      for (const n of missing) delete working[n];
      continue;
    }
    return { ok: false, error: hsJson, sent: working };
  }

  return { ok: false, error: "retries_exhausted", sent: working };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const token = Deno.env.get("HUBSPOT_ACCESS_TOKEN");
  if (!token) {
    return new Response(JSON.stringify({ error: "HUBSPOT_ACCESS_TOKEN not configured" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const expected = Deno.env.get("HUBSPOT_SYNC_SECRET");
  if (!expected) {
    return new Response(JSON.stringify({ error: "HUBSPOT_SYNC_SECRET not configured" }), {
      status: 500,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
  const got = req.headers.get("x-hubspot-sync-secret");
  if (got !== expected) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const body = await req.json().catch(() => ({}));
  const table = String(body.table ?? body.record?.table ?? "");

  let rows: LeadRow[] = [];
  if (body.record && ALLOWED.includes(table)) {
    rows = [{ ...(body.record as LeadRow), __table: table }];
  } else if (ALLOWED.includes(table)) {
    const { data } = await supabase
      .from(table)
      .select("*")
      .is("hubspot_contact_id", null)
      .limit(25);
    rows = ((data ?? []) as LeadRow[]).map((r) => ({ ...r, __table: table }));
  } else {
    for (const t of ALLOWED) {
      const { data } = await supabase
        .from(t)
        .select("*")
        .is("hubspot_contact_id", null)
        .limit(10);
      for (const r of data ?? []) rows.push({ ...(r as LeadRow), __table: t });
    }
  }

  const results: unknown[] = [];

  for (const row of rows) {
    const t = row.__table ?? table;
    if (row.hubspot_contact_id) continue;

    const mapper = TABLE_MAP[t];
    if (!mapper) {
      results.push({ id: row.id, skipped: `no field map for table "${t}"` });
      continue;
    }

    const props = mapper(row);
    const outcome = await createOrUpdateContact(token, props);
    if (!outcome.ok) {
      results.push({ id: row.id, error: outcome.error, sent: outcome.sent });
      continue;
    }

    await supabase.from(t).update({ hubspot_contact_id: outcome.id }).eq("id", row.id);
    results.push({
      id: row.id,
      hubspot_contact_id: outcome.id,
      ...(outcome.reused ? { reused: true, updated: true } : {}),
    });
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
