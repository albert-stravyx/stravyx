-- Media delivery pipeline: private storage bucket + additive media metadata columns.

insert into storage.buckets (id, name, public, file_size_limit)
values ('mission-media', 'mission-media', false, 52428800)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

alter table public.media_files
  add column if not exists visibility text not null default 'held',
  add column if not exists byte_size bigint,
  add column if not exists content_type text,
  add column if not exists original_name text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists released_at timestamptz;

create index if not exists media_files_mission_visibility_idx
  on public.media_files (mission_id, visibility);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'media_files_visibility_check'
      and conrelid = 'public.media_files'::regclass
  ) then
    alter table public.media_files
      add constraint media_files_visibility_check
      check (visibility in ('held', 'released'));
  end if;
end $$;
