-- 20240101000021_search_events.sql
-- Log unrecognised free-text service searches (REQUESTS 12.2) so gaps in the
-- text→category mapping are visible. These events have no provider, so
-- provider_id becomes nullable and a new event_type 'search_empty' carries the
-- raw query.

alter table public.provider_events
  alter column provider_id drop not null,
  add column search_query text;

alter table public.provider_events
  drop constraint provider_events_event_type_check;
alter table public.provider_events
  add constraint provider_events_event_type_check check (
    event_type in ('impression', 'click', 'booking_started', 'booking_completed', 'search_empty')
  );

-- A search_empty row has no provider; every other event still must have one.
alter table public.provider_events
  add constraint chk_search_empty_no_provider check (
    (event_type = 'search_empty') = (provider_id is null)
  );
