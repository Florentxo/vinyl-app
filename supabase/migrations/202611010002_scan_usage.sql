create table if not exists public.scan_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists scan_usage_user_month_idx on public.scan_usage (user_id, created_at);

alter table public.scan_usage enable row level security;

create policy "scan_usage_select_own" on public.scan_usage
  for select using (user_id = auth.uid());
create policy "scan_usage_insert_own" on public.scan_usage
  for insert with check (user_id = auth.uid());
