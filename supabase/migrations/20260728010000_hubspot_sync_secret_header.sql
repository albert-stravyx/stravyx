-- Require x-hubspot-sync-secret on hubspot-sync calls from pg_net.
-- Vault secret name: hubspot_sync_secret (same value as Edge secret HUBSPOT_SYNC_SECRET).

create or replace function public.notify_hubspot_lead_sync()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  anon_key text;
  sync_secret text;
  req_id bigint;
begin
  select ds.decrypted_secret
    into anon_key
  from vault.decrypted_secrets ds
  where ds.name = 'supabase_anon_key'
  limit 1;

  select ds.decrypted_secret
    into sync_secret
  from vault.decrypted_secrets ds
  where ds.name = 'hubspot_sync_secret'
  limit 1;

  if anon_key is null or length(anon_key) = 0 then
    raise warning 'notify_hubspot_lead_sync: vault secret supabase_anon_key missing';
    return NEW;
  end if;

  if sync_secret is null or length(sync_secret) = 0 then
    raise warning 'notify_hubspot_lead_sync: vault secret hubspot_sync_secret missing';
    return NEW;
  end if;

  select net.http_post(
    url := 'https://ruzblzcvnayajmnwyjyc.supabase.co/functions/v1/hubspot-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key,
      'x-hubspot-sync-secret', sync_secret
    ),
    body := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', to_jsonb(NEW),
      'old_record', null
    )
  ) into req_id;

  return NEW;
end;
$$;
