-- 20240101000031_user_sync.sql
-- §3 client cabinet: magic-link is optional. Without it everything lives in the
-- browser (localStorage), as now. With it, the signed-in user's saved slugs and
-- request refs/tokens are backed up here so they transfer between devices —
-- pushed on sign-in and pulled ("restore") on another device. Owner-only RLS;
-- the row holds only the user's own pointers, no other person's data.

create table public.user_sync (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  saved      text[] not null default '{}',
  requests   jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_sync enable row level security;

create policy user_sync_owner_all on public.user_sync
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
