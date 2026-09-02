-- Additive operator verification: ARN/ReOC columns, workflow status, credential
-- files, and a private Storage bucket. Demo seed still inserts verified=true
-- without the new columns; the trigger backfills verification_status.

alter table public.reoc_profiles
  add column if not exists arn text,
  add column if not exists reoc_number text,
  add column if not exists verification_status text,
  add column if not exists rejection_reason text;

update public.reoc_profiles
set verification_status = case
  when verified then 'verified'
  else 'pending_docs'
end
where verification_status is null;

alter table public.reoc_profiles
  alter column verification_status set default 'pending_docs';

alter table public.reoc_profiles
  alter column verification_status set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'reoc_profiles_verification_status_check'
      and conrelid = 'public.reoc_profiles'::regclass
  ) then
    alter table public.reoc_profiles
      add constraint reoc_profiles_verification_status_check
      check (verification_status in ('pending_docs', 'pending_review', 'verified', 'rejected'));
  end if;
end $$;

create or replace function public.sync_reoc_verification_flag()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    -- Seed path: verified=true without an explicit status (demo_users.sql).
    if new.verified is true then
      new.verification_status := 'verified';
      new.verified := true;
      return new;
    end if;
    if new.verification_status is null then
      new.verification_status := 'pending_docs';
    end if;
    new.verified := (new.verification_status = 'verified');
    return new;
  end if;

  -- UPDATE: the field that actually changed drives the other.
  if new.verification_status is distinct from old.verification_status then
    if new.verification_status is null then
      new.verification_status := 'pending_docs';
    end if;
    new.verified := (new.verification_status = 'verified');
  elsif new.verified is distinct from old.verified then
    if new.verified is true then
      new.verification_status := 'verified';
      new.verified := true;
    else
      if new.verification_status = 'verified' then
        new.verification_status := 'pending_docs';
      end if;
      new.verified := false;
    end if;
  else
    if new.verification_status is null then
      new.verification_status := 'pending_docs';
    end if;
    new.verified := (new.verification_status = 'verified');
  end if;

  return new;
end;
$$;

drop trigger if exists reoc_profiles_sync_verification_flag on public.reoc_profiles;

create trigger reoc_profiles_sync_verification_flag
before insert or update on public.reoc_profiles
for each row
execute function public.sync_reoc_verification_flag();

create table if not exists public.operator_credential_files (
  id uuid primary key default gen_random_uuid(),
  reoc_profile_id uuid not null references public.reoc_profiles (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  storage_path text not null,
  content_type text,
  original_name text,
  byte_size bigint,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint operator_credential_files_kind_check
    check (kind in ('reoc_certificate', 'repl', 'certificate_of_currency')),
  constraint operator_credential_files_reoc_kind_unique unique (reoc_profile_id, kind)
);

create index if not exists operator_credential_files_reoc_idx
  on public.operator_credential_files (reoc_profile_id);

alter table public.operator_credential_files enable row level security;

grant all on table public.operator_credential_files to postgres, service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'operator-credentials',
  'operator-credentials',
  false,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
