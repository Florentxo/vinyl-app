alter table public.records
  add column if not exists discogs_release_id bigint
  check (discogs_release_id > 0);
