-- GoTrue admin createUser writes app_metadata on a follow-up UPDATE of
-- auth.users, not on the INSERT the AFTER INSERT trigger sees. Mirror a
-- later valid role onto profiles.primary_role so /me does not keep the
-- INSERT default of 'customer'. Never read role from user_metadata.

create or replace function public.sync_profile_role_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_role text;
begin
  next_role := new.raw_app_meta_data->>'role';
  if next_role is null then
    return new;
  end if;
  if next_role not in ('customer', 'operator', 'admin') then
    return new;
  end if;
  if tg_op = 'UPDATE' and next_role is not distinct from (old.raw_app_meta_data->>'role') then
    return new;
  end if;

  update public.profiles
  set
    primary_role = next_role::public.app_role,
    updated_at = now()
  where id = new.id
    and primary_role is distinct from next_role::public.app_role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_app_metadata_updated on auth.users;
create trigger on_auth_user_app_metadata_updated
  after update of raw_app_meta_data on auth.users
  for each row execute function public.sync_profile_role_from_auth();
