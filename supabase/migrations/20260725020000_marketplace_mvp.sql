-- Demo marketplace MVP subset (ERD v0.3) + seed data.
-- Fan-out: online verified ReOCs only (no PostGIS eligibility yet).

create extension if not exists "pgcrypto";

-- Enums
do $$ begin
  create type public.mission_status as enum (
    'draft','booked','dispatched','accepted','allocated','assessed',
    'flown','delivered','disputed','cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.offer_status as enum (
    'sent','accepted','declined','expired','taken'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.app_role as enum ('customer','operator','admin');
exception when duplicate_object then null;
end $$;

-- Catalogue
create table if not exists public.urgency_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  multiplier numeric not null,
  dispatch_window interval not null,
  rank int not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.pricing_configs (
  id uuid primary key default gen_random_uuid(),
  version int not null unique,
  base_rate_cents_per_hour int not null,
  currency char(3) not null default 'AUD',
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.mission_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  mvp_enabled boolean not null default true,
  equipment_factor numeric not null default 1.0,
  created_at timestamptz not null default now()
);

create table if not exists public.equipment_classes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  factor numeric not null default 1.0,
  created_at timestamptz not null default now()
);

-- Identity (demo-simplified)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  primary_role public.app_role not null default 'customer',
  hubspot_contact_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abn_acn text,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.reoc_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id),
  owner_user_id uuid not null references public.profiles (id),
  online boolean not null default false,
  verified boolean not null default false,
  max_urgency_tier_id uuid references public.urgency_tiers (id),
  rating_avg numeric,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Missions
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles (id),
  category_id uuid not null references public.mission_categories (id),
  urgency_tier_id uuid not null references public.urgency_tiers (id),
  pricing_config_id uuid not null references public.pricing_configs (id),
  status public.mission_status not null default 'draft',
  duration_minutes int not null,
  equipment_factor numeric not null default 1.0,
  network_price_cents bigint not null,
  flight_fee_cents bigint not null,
  layer2_cents bigint not null,
  currency char(3) not null default 'AUD',
  assigned_reoc_id uuid references public.reoc_profiles (id),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.mission_locations (
  mission_id uuid primary key references public.missions (id) on delete cascade,
  suburb text not null,
  full_address text not null,
  lat double precision,
  lng double precision
);

create table if not exists public.mission_offers (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  reoc_profile_id uuid not null references public.reoc_profiles (id),
  status public.offer_status not null default 'sent',
  offered_at timestamptz not null default now(),
  expires_at timestamptz not null,
  responded_at timestamptz,
  unique (mission_id, reoc_profile_id)
);

-- First-to-accept race safety
create unique index if not exists mission_offers_one_accepted
  on public.mission_offers (mission_id)
  where status = 'accepted';

create table if not exists public.mission_status_events (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  from_status public.mission_status,
  to_status public.mission_status not null,
  actor_id uuid references public.profiles (id),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  amount_cents bigint not null,
  currency char(3) not null default 'AUD',
  status text not null default 'mock_held',
  provider_payment_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.media_files (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions (id) on delete cascade,
  uploaded_by uuid references public.profiles (id),
  storage_path text not null,
  kind text not null default 'raw',
  created_at timestamptz not null default now()
);

-- RLS
alter table public.urgency_tiers enable row level security;
alter table public.pricing_configs enable row level security;
alter table public.mission_categories enable row level security;
alter table public.equipment_classes enable row level security;
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.reoc_profiles enable row level security;
alter table public.missions enable row level security;
alter table public.mission_locations enable row level security;
alter table public.mission_offers enable row level security;
alter table public.mission_status_events enable row level security;
alter table public.payments enable row level security;
alter table public.media_files enable row level security;

-- Catalogue readable by authenticated
create policy urgency_tiers_read on public.urgency_tiers for select to authenticated using (true);
create policy pricing_configs_read on public.pricing_configs for select to authenticated using (true);
create policy mission_categories_read on public.mission_categories for select to authenticated using (true);
create policy equipment_classes_read on public.equipment_classes for select to authenticated using (true);

create policy profiles_read_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Missions: customer sees own; operators see via offers / assignment (Edge enforces money projection)
create policy missions_customer_select on public.missions
  for select to authenticated using (customer_id = auth.uid());
create policy missions_customer_insert on public.missions
  for insert to authenticated with check (customer_id = auth.uid());

create policy mission_locations_customer on public.mission_locations
  for select to authenticated
  using (exists (select 1 from public.missions m where m.id = mission_id and m.customer_id = auth.uid()));

create policy offers_operator_select on public.mission_offers
  for select to authenticated
  using (
    exists (
      select 1 from public.reoc_profiles r
      where r.id = reoc_profile_id and r.owner_user_id = auth.uid()
    )
  );

-- Seed catalogue (idempotent via unique codes)
insert into public.urgency_tiers (code, label, multiplier, dispatch_window, rank)
values
  ('scheduled', 'SCHEDULED', 0.85, interval '7 days', 1),
  ('standard', 'STANDARD', 1.0, interval '48 hours', 2),
  ('urgent', 'URGENT', 1.35, interval '60 minutes', 3),
  ('immediate', 'IMMEDIATE', 2.25, interval '5 minutes', 4)
on conflict (code) do nothing;

insert into public.pricing_configs (version, base_rate_cents_per_hour, is_active)
values (1, 25000, true)
on conflict (version) do nothing;

insert into public.mission_categories (code, name, mvp_enabled, equipment_factor)
values
  ('aerial_photo', 'Aerial photography and videography', true, 1.0),
  ('property_inspection', 'Property and building inspection', true, 1.1),
  ('construction', 'Construction / site progress', true, 1.15),
  ('event_coverage', 'Event coverage', true, 1.0),
  ('security', 'Security and surveillance', true, 1.2)
on conflict (code) do nothing;

insert into public.equipment_classes (code, name, factor)
values
  ('standard_quad', 'Standard multirotor', 1.0),
  ('enterprise', 'Enterprise platform', 1.25)
on conflict (code) do nothing;
