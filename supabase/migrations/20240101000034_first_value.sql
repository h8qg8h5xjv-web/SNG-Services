-- 20240101000034_first_value.sql
-- "Time to first value" — the headline metric. A single `first_value` event is
-- written per session at the visitor's first real action (a contact reveal or a
-- request), carrying the elapsed time from their first visit in value_ms. The
-- median is shown in admin analytics.

alter table public.provider_events
  add column value_ms integer check (value_ms is null or value_ms >= 0);

alter table public.provider_events
  drop constraint provider_events_event_type_check;
alter table public.provider_events
  add constraint provider_events_event_type_check check (
    event_type in (
      'impression', 'click', 'booking_started', 'booking_completed',
      'search_empty', 'contact_reveal', 'first_value'
    )
  );

-- provider_id may be null for search_empty and for first_value (a request with no
-- specific provider); every other event still requires one.
alter table public.provider_events
  drop constraint chk_search_empty_no_provider;
alter table public.provider_events
  add constraint chk_provider_id_presence check (
    provider_id is not null or event_type in ('search_empty', 'first_value')
  );
