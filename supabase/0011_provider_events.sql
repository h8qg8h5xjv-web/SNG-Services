-- 0011_provider_events.sql
-- Pseudonymous analytics log for provider listings — the foundation for future
-- paid promotion (ranking is centralized separately in lib/ranking.ts). No IP
-- and no user-agent are stored: not needed for stats, and extra personal data
-- under GDPR. session_id is a random per-browser id from a cookie, not tied to
-- an identity.

create table public.provider_events (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  event_type  text not null
                check (event_type in ('impression', 'click', 'booking_started', 'booking_completed')),
  position    integer,                 -- rank in the list at display time
  surface     text
                check (surface in ('home', 'category', 'search', 'provider', 'booking')),
  session_id  text,                    -- pseudonymous, from a cookie
  category_id uuid references public.categories(id) on delete set null,
  locale      text,
  occurred_at timestamptz not null default now()
);

-- Aggregation is by provider and by day.
create index idx_provider_events_provider_time
  on public.provider_events (provider_id, occurred_at);
create index idx_provider_events_time on public.provider_events (occurred_at);

alter table public.provider_events enable row level security;

-- Admins read (analytics). Writes go through the service role (bypasses RLS),
-- so no public insert policy is defined.
create policy provider_events_admin_read on public.provider_events
  for select using (public.is_admin());
