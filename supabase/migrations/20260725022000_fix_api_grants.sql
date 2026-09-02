-- Restore standard Supabase API role grants (tables created via MCP missed these).
grant usage on schema public to anon, authenticated, service_role;

grant all on all tables in schema public to postgres, service_role;
grant all on all sequences in schema public to postgres, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Lead tables: anon insert; catalogue readable.
grant insert on public.academy_enquiries, public.operator_leads, public.contact_leads, public.enterprise_leads, public.business_leads to anon;
grant select on public.urgency_tiers, public.pricing_configs, public.mission_categories, public.equipment_classes to anon;

alter default privileges in schema public grant all on tables to postgres, service_role;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
