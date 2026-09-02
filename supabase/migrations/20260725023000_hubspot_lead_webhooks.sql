-- Lead INSERT → hubspot-sync Edge Function (pg_net async HTTP).
-- Equivalent to Dashboard Database Webhooks; MCP has no webhook create API.
-- Requires: extension pg_net; vault secret named supabase_anon_key (anon/publishable JWT).
-- Requires: Edge secret HUBSPOT_ACCESS_TOKEN on function hubspot-sync.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_hubspot_lead_sync()
returns trigger
language plpgsql
security definer
set search_path = public, net, vault
as $$
declare
  anon_key text;
  req_id bigint;
begin
  select ds.decrypted_secret
    into anon_key
  from vault.decrypted_secrets ds
  where ds.name = 'supabase_anon_key'
  limit 1;

  if anon_key is null or length(anon_key) = 0 then
    raise warning 'notify_hubspot_lead_sync: vault secret supabase_anon_key missing';
    return NEW;
  end if;

  select net.http_post(
    url := 'https://ruzblzcvnayajmnwyjyc.supabase.co/functions/v1/hubspot-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
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

revoke all on function public.notify_hubspot_lead_sync() from public;
grant execute on function public.notify_hubspot_lead_sync() to postgres, service_role;

drop trigger if exists hubspot_sync_on_insert on public.academy_enquiries;
create trigger hubspot_sync_on_insert
  after insert on public.academy_enquiries
  for each row execute function public.notify_hubspot_lead_sync();

drop trigger if exists hubspot_sync_on_insert on public.operator_leads;
create trigger hubspot_sync_on_insert
  after insert on public.operator_leads
  for each row execute function public.notify_hubspot_lead_sync();

drop trigger if exists hubspot_sync_on_insert on public.contact_leads;
create trigger hubspot_sync_on_insert
  after insert on public.contact_leads
  for each row execute function public.notify_hubspot_lead_sync();

drop trigger if exists hubspot_sync_on_insert on public.enterprise_leads;
create trigger hubspot_sync_on_insert
  after insert on public.enterprise_leads
  for each row execute function public.notify_hubspot_lead_sync();

drop trigger if exists hubspot_sync_on_insert on public.business_leads;
create trigger hubspot_sync_on_insert
  after insert on public.business_leads
  for each row execute function public.notify_hubspot_lead_sync();
