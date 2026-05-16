create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 100),
  key_prefix text not null,
  key_hash text not null unique,
  scopes text[] not null default '{candidates:read,candidates:write,scorecards:read}',
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_api_keys_user on public.api_keys(user_id);
create index idx_api_keys_hash on public.api_keys(key_hash);

alter table public.api_keys enable row level security;

create policy "users view own api keys"
  on public.api_keys for select to authenticated
  using (auth.uid() = user_id);

create policy "users insert own api keys"
  on public.api_keys for insert to authenticated
  with check (auth.uid() = user_id);

create policy "users update own api keys"
  on public.api_keys for update to authenticated
  using (auth.uid() = user_id);

create policy "users delete own api keys"
  on public.api_keys for delete to authenticated
  using (auth.uid() = user_id);