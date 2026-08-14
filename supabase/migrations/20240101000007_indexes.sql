-- 0007_indexes.sql
-- Indexes sized to the actual query patterns of the catalog and afisha.

-- Providers: browsed by category and by borough, almost always filtered to published.
create index idx_providers_category on public.providers (category_id);
create index idx_providers_borough on public.providers (borough);
create index idx_providers_published_category
  on public.providers (category_id) where status = 'published';

-- Services belong to a provider and are listed together.
create index idx_services_provider on public.services (provider_id);

-- Schedules read by provider + weekday when computing slots.
create index idx_schedules_provider_dow on public.schedules (provider_id, day_of_week);

-- Bookings queried by provider over a date range, and by service when summing capacity.
create index idx_bookings_provider_starts on public.bookings (provider_id, starts_at);
create index idx_bookings_service_starts on public.bookings (service_id, starts_at);
create index idx_bookings_status on public.bookings (status);

-- Events: the feed is ordered by starts_at and hides the past; also filtered by category/borough.
create index idx_events_published_starts
  on public.events (starts_at) where status = 'published';
create index idx_events_category on public.events (category);
create index idx_events_borough on public.events (borough);
create index idx_events_organizer on public.events (organizer_provider_id);
