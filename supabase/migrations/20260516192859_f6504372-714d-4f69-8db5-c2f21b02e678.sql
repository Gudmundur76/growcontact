create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  enabled boolean not null default true,
  credentials jsonb not null default '{}'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.integration_connections enable row level security;

create policy "users view own connections" on public.integration_connections
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own connections" on public.integration_connections
  for insert to authenticated with check (auth.uid() = user_id);
create policy "users update own connections" on public.integration_connections
  for update to authenticated using (auth.uid() = user_id);
create policy "users delete own connections" on public.integration_connections
  for delete to authenticated using (auth.uid() = user_id);

create trigger trg_integration_connections_updated
  before update on public.integration_connections
  for each row execute function public.update_updated_at_column();

create table public.integration_sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  entity_type text not null,
  entity_id uuid,
  external_id text,
  status text not null,
  error_message text,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.integration_sync_log enable row level security;

create policy "users view own sync log" on public.integration_sync_log
  for select to authenticated using (auth.uid() = user_id);
create policy "users insert own sync log" on public.integration_sync_log
  for insert to authenticated with check (auth.uid() = user_id);

create index idx_integration_sync_log_user on public.integration_sync_log (user_id, created_at desc);