-- 20240101000033_unified_cabinet.sql
-- One cabinet. Two supporting changes:
--   1) provider_events.user_id — so a signed-in visitor's contact reveals can be
--      listed back to them ("Кому я писал"). Set server-side in /api/track when a
--      session exists; null for guests. Users may read their OWN events.
--   2) user_sync.display_name — the account's optional public name.

alter table public.provider_events
  add column user_id uuid references auth.users(id) on delete set null;

create index idx_provider_events_user
  on public.provider_events (user_id)
  where user_id is not null;

-- A signed-in user reads their own events (the cabinet's "who I contacted").
-- Admin/member read policies from earlier migrations still apply alongside this.
create policy provider_events_own_read on public.provider_events
  for select using (user_id is not null and user_id = auth.uid());

alter table public.user_sync
  add column display_name text;
