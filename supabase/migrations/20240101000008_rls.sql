-- 0008_rls.sql
-- Row Level Security. Public can read only published content; all writes are
-- admin-only. service_role (used by the seed script and privileged server code)
-- bypasses RLS entirely, so anonymous booking creation happens server-side.

alter table public.categories            enable row level security;
alter table public.languages             enable row level security;
alter table public.providers             enable row level security;
alter table public.provider_languages    enable row level security;
alter table public.provider_translations enable row level security;
alter table public.services              enable row level security;
alter table public.schedules             enable row level security;
alter table public.schedule_exceptions   enable row level security;
alter table public.bookings              enable row level security;
alter table public.events                enable row level security;

-- Base grants. RLS still filters rows; without table grants the policies never run.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- ---------------------------------------------------------------------------
-- Reference data: readable by everyone, writable by admins.
-- ---------------------------------------------------------------------------
create policy categories_select on public.categories
  for select using (true);
create policy categories_write on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy languages_select on public.languages
  for select using (true);
create policy languages_write on public.languages
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Providers and owned data: public sees published; admin sees and writes all.
-- ---------------------------------------------------------------------------
create policy providers_select on public.providers
  for select using (status = 'published' or public.is_admin());
create policy providers_write on public.providers
  for all using (public.is_admin()) with check (public.is_admin());

create policy provider_languages_select on public.provider_languages
  for select using (
    public.is_admin() or exists (
      select 1 from public.providers p
      where p.id = provider_languages.provider_id and p.status = 'published'
    )
  );
create policy provider_languages_write on public.provider_languages
  for all using (public.is_admin()) with check (public.is_admin());

create policy provider_translations_select on public.provider_translations
  for select using (
    public.is_admin() or exists (
      select 1 from public.providers p
      where p.id = provider_translations.provider_id and p.status = 'published'
    )
  );
create policy provider_translations_write on public.provider_translations
  for all using (public.is_admin()) with check (public.is_admin());

create policy services_select on public.services
  for select using (
    public.is_admin() or exists (
      select 1 from public.providers p
      where p.id = services.provider_id and p.status = 'published'
    )
  );
create policy services_write on public.services
  for all using (public.is_admin()) with check (public.is_admin());

create policy schedules_select on public.schedules
  for select using (
    public.is_admin() or exists (
      select 1 from public.providers p
      where p.id = schedules.provider_id and p.status = 'published'
    )
  );
create policy schedules_write on public.schedules
  for all using (public.is_admin()) with check (public.is_admin());

create policy schedule_exceptions_select on public.schedule_exceptions
  for select using (
    public.is_admin() or exists (
      select 1 from public.providers p
      where p.id = schedule_exceptions.provider_id and p.status = 'published'
    )
  );
create policy schedule_exceptions_write on public.schedule_exceptions
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Bookings: no public read. Admin reads/writes; anonymous booking creation is
-- done server-side with the service role (which bypasses RLS).
-- ---------------------------------------------------------------------------
create policy bookings_select on public.bookings
  for select using (public.is_admin());
create policy bookings_write on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Events: public sees published; admin sees and writes all.
-- ---------------------------------------------------------------------------
create policy events_select on public.events
  for select using (status = 'published' or public.is_admin());
create policy events_write on public.events
  for all using (public.is_admin()) with check (public.is_admin());
