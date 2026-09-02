-- Persist signup extras on profiles. Phone is unique when present so a
-- registered mobile cannot be reused on another account. Null is allowed
-- (skip). Never store role in user_metadata.

alter table public.profiles
  add column if not exists phone_e164 text,
  add column if not exists company text,
  add column if not exists default_location text,
  add column if not exists operator_licence_number text,
  add column if not exists service_area text;

create unique index if not exists profiles_phone_e164_key
  on public.profiles (phone_e164)
  where phone_e164 is not null;
