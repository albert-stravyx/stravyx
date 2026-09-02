-- Demo accounts for the 5-minute marketplace script.
-- Password for all: DemoPass123!
-- Idempotent: skips if emails already exist.

create extension if not exists pgcrypto;

do $$
declare
  customer_id uuid := 'a1111111-1111-4111-8111-111111111111';
  operator_id uuid := 'a2222222-2222-4222-8222-222222222222';
  admin_id    uuid := 'a3333333-3333-4333-8333-333333333333';
  org_id      uuid := 'b1111111-1111-4111-8111-111111111111';
  pw text := crypt('DemoPass123!', gen_salt('bf'));
  instance uuid := '00000000-0000-0000-0000-000000000000';
begin
  -- Customer
  if not exists (select 1 from auth.users where email = 'customer@demo.stravyx.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      is_sso_user, is_anonymous
    ) values (
      instance, customer_id, 'authenticated', 'authenticated',
      'customer@demo.stravyx.com', pw, now(),
      '{"provider":"email","providers":["email"],"role":"customer"}'::jsonb,
      '{"full_name":"Demo Customer"}'::jsonb,
      now(), now(), '', '', '', '', false, false
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      customer_id, customer_id,
      jsonb_build_object('sub', customer_id::text, 'email', 'customer@demo.stravyx.com', 'email_verified', true),
      'email', customer_id::text, now(), now(), now()
    );
  end if;

  -- Operator
  if not exists (select 1 from auth.users where email = 'operator@demo.stravyx.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      is_sso_user, is_anonymous
    ) values (
      instance, operator_id, 'authenticated', 'authenticated',
      'operator@demo.stravyx.com', pw, now(),
      '{"provider":"email","providers":["email"],"role":"operator"}'::jsonb,
      '{"full_name":"Demo Operator"}'::jsonb,
      now(), now(), '', '', '', '', false, false
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      operator_id, operator_id,
      jsonb_build_object('sub', operator_id::text, 'email', 'operator@demo.stravyx.com', 'email_verified', true),
      'email', operator_id::text, now(), now(), now()
    );
  end if;

  -- Admin
  if not exists (select 1 from auth.users where email = 'admin@demo.stravyx.com') then
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      is_sso_user, is_anonymous
    ) values (
      instance, admin_id, 'authenticated', 'authenticated',
      'admin@demo.stravyx.com', pw, now(),
      '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
      '{"full_name":"Demo Admin"}'::jsonb,
      now(), now(), '', '', '', '', false, false
    );
    insert into auth.identities (
      id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
    ) values (
      admin_id, admin_id,
      jsonb_build_object('sub', admin_id::text, 'email', 'admin@demo.stravyx.com', 'email_verified', true),
      'email', admin_id::text, now(), now(), now()
    );
  end if;

  -- Ensure profiles (trigger may already have created them)
  insert into public.profiles (id, email, full_name, primary_role)
  values
    (customer_id, 'customer@demo.stravyx.com', 'Demo Customer', 'customer'),
    (operator_id, 'operator@demo.stravyx.com', 'Demo Operator', 'operator'),
    (admin_id, 'admin@demo.stravyx.com', 'Demo Admin', 'admin')
  on conflict (id) do update set
    primary_role = excluded.primary_role,
    full_name = excluded.full_name,
    email = excluded.email;

  insert into public.organizations (id, name, abn_acn)
  values (org_id, 'Sydney Demo ReOC', '00 000 000 000')
  on conflict (id) do nothing;

  insert into public.reoc_profiles (organization_id, owner_user_id, online, verified)
  select org_id, operator_id, true, true
  where not exists (
    select 1 from public.reoc_profiles where owner_user_id = operator_id
  );
end $$;
