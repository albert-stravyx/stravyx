-- Lead tables matching live stravyx.com Supabase inserts + HubSpot sync refs.
-- RLS: anon INSERT only; no public SELECT.

create extension if not exists "pgcrypto";

create table if not exists public.academy_enquiries (
  id uuid primary key default gen_random_uuid(),
  first_name text,
  mobile text,
  email text not null,
  state text,
  current_status text,
  timeline text,
  existing_qualifications text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  hubspot_contact_id text,
  idempotency_key text unique default gen_random_uuid()::text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.operator_leads (
  id uuid primary key default gen_random_uuid(),
  holds text,
  service_area text,
  contact text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  hubspot_contact_id text,
  idempotency_key text unique default gen_random_uuid()::text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.contact_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  topic text,
  company text,
  message text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  hubspot_contact_id text,
  idempotency_key text unique default gen_random_uuid()::text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.enterprise_leads (
  id uuid primary key default gen_random_uuid(),
  company_name text,
  contact_name text,
  phone text,
  email text not null,
  industry text,
  sites_count text,
  what_do_you_need text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  hubspot_contact_id text,
  idempotency_key text unique default gen_random_uuid()::text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists public.business_leads (
  id uuid primary key default gen_random_uuid(),
  abn text,
  contact text not null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_term text,
  utm_content text,
  hubspot_contact_id text,
  idempotency_key text unique default gen_random_uuid()::text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.academy_enquiries enable row level security;
alter table public.operator_leads enable row level security;
alter table public.contact_leads enable row level security;
alter table public.enterprise_leads enable row level security;
alter table public.business_leads enable row level security;

-- Public website may insert; never select (service role bypasses RLS for HubSpot worker).
create policy academy_enquiries_anon_insert on public.academy_enquiries
  for insert to anon, authenticated with check (true);
create policy operator_leads_anon_insert on public.operator_leads
  for insert to anon, authenticated with check (true);
create policy contact_leads_anon_insert on public.contact_leads
  for insert to anon, authenticated with check (true);
create policy enterprise_leads_anon_insert on public.enterprise_leads
  for insert to anon, authenticated with check (true);
create policy business_leads_anon_insert on public.business_leads
  for insert to anon, authenticated with check (true);

grant insert on public.academy_enquiries to anon, authenticated;
grant insert on public.operator_leads to anon, authenticated;
grant insert on public.contact_leads to anon, authenticated;
grant insert on public.enterprise_leads to anon, authenticated;
grant insert on public.business_leads to anon, authenticated;
