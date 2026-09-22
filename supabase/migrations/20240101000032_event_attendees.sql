-- 20240101000032_event_attendees.sql
-- §4 Afisha liveliness (not a chat): who is going to an event. "Идут N человек"
-- counts everyone; up to 5 initials are shown for those who opted to be visible
-- to the group (is_visible_to_group), mirroring the group-slot participants model.
-- Pseudonymous: session_id (cookie) dedups per browser; only a display name for
-- the initials, no other personal data, no IP. Writes go through the service role
-- (like bookings/analytics); reads are server-side (admin) — never a public read.

create table public.event_attendees (
  id                  uuid primary key default gen_random_uuid(),
  event_id            uuid not null references public.events(id) on delete cascade,
  session_id          text,
  display_name        text,
  is_visible_to_group boolean not null default true,
  created_at          timestamptz not null default now(),
  unique (event_id, session_id)
);

create index idx_event_attendees_event on public.event_attendees (event_id);

alter table public.event_attendees enable row level security;

-- Admin can read/manage; everyone else goes through the service role (writes) or
-- server-side aggregation (reads). No public policy — counts/initials are exposed
-- only in aggregate by the app, never row-by-row.
create policy event_attendees_admin_all on public.event_attendees
  for all using (public.is_admin()) with check (public.is_admin());
