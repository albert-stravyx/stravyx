-- Extra marketing lead tables used by Replit forms (/home-owners, /about talent).
-- Match live insert payloads + HubSpot sync triggers.

create table if not exists public.home_owner_leads (
  id uuid primary key default gen_random_uuid(),
  need text,
  suburb text,
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

create table if not exists public.talent_interests (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text not null,
  area_of_interest text,
  linkedin_url text,
  note text,
  hubspot_contact_id text,
  idempotency_key text unique default gen_random_uuid()::text,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

alter table public.home_owner_leads enable row level security;
alter table public.talent_interests enable row level security;

create policy home_owner_leads_anon_insert on public.home_owner_leads
  for insert to anon, authenticated with check (true);
create policy talent_interests_anon_insert on public.talent_interests
  for insert to anon, authenticated with check (true);

grant insert on public.home_owner_leads to anon, authenticated;
grant insert on public.talent_interests to anon, authenticated;

drop trigger if exists hubspot_sync_on_insert on public.home_owner_leads;
create trigger hubspot_sync_on_insert
  after insert on public.home_owner_leads
  for each row execute function public.notify_hubspot_lead_sync();

drop trigger if exists hubspot_sync_on_insert on public.talent_interests;
create trigger hubspot_sync_on_insert
  after insert on public.talent_interests
  for each row execute function public.notify_hubspot_lead_sync();
