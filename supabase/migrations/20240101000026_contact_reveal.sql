-- 20240101000026_contact_reveal.sql
-- Competitor-analysis idea #4: count when a visitor opens a contact channel.
-- The public provider card's Call / Message / Website buttons log a
-- 'contact_reveal' event with the channel used. Same pseudonymous model as the
-- rest of the analytics (no IP, no user-agent — only the cookie session_id).
-- Members may read their OWN provider's events so the cabinet can show a stats
-- block; nobody else can (RLS, not front-end code, enforces this).

-- New event_type value.
alter table public.provider_events
  drop constraint provider_events_event_type_check;
alter table public.provider_events
  add constraint provider_events_event_type_check check (
    event_type in (
      'impression', 'click', 'booking_started', 'booking_completed',
      'search_empty', 'contact_reveal'
    )
  );

-- Which channel was opened. Only meaningful for a contact_reveal.
alter table public.provider_events
  add column contact_channel text
    check (contact_channel in ('call', 'message', 'website'));
alter table public.provider_events
  add constraint chk_contact_channel_only_for_reveal check (
    contact_channel is null or event_type = 'contact_reveal'
  );

-- A provider member reads their own provider's analytics (cabinet stats block).
-- Writes still go through the service role, so no insert/update policy is added.
create policy provider_events_member_read on public.provider_events
  for select using (public.is_provider_member(provider_id));
