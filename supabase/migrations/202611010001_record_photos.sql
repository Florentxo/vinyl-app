alter table public.records
  add column if not exists cover_source text not null default 'discogs'
    check (cover_source in ('discogs', 'custom')),
  add column if not exists custom_cover_path text;

create table if not exists public.record_photos (
  id uuid primary key default gen_random_uuid(),
  record_id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind in ('front', 'back', 'disc')),
  disc_number int not null default 0 check (disc_number >= 0),
  side text not null default '' check (side in ('', 'A', 'B')),
  path text not null,
  created_at timestamptz not null default now(),
  check (
    (kind in ('front', 'back') and disc_number = 0 and side = '') or
    (kind = 'disc' and disc_number >= 1 and side in ('A', 'B'))
  ),
  unique (record_id, kind, disc_number, side)
);

create index if not exists record_photos_record_idx on public.record_photos (user_id, record_id);

alter table public.record_photos enable row level security;

create policy "record_photos_select_own" on public.record_photos
  for select using (user_id = auth.uid());
create policy "record_photos_insert_own" on public.record_photos
  for insert with check (user_id = auth.uid());
create policy "record_photos_update_own" on public.record_photos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "record_photos_delete_own" on public.record_photos
  for delete using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('record-photos', 'record-photos', false, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "record_photos_objects_select_own" on storage.objects
  for select using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "record_photos_objects_insert_own" on storage.objects
  for insert with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "record_photos_objects_delete_own" on storage.objects
  for delete using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);
