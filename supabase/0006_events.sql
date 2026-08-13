-- 0006_events.sql
-- Afisha: one-off events. A separate entity from providers — they happen once
-- on a date and then disappear, rather than running on a weekly schedule.

create table public.events (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text not null unique,
  title_en              text not null,
  title_ru              text,
  description_en        text,
  description_ru        text,
  category              text not null
                          check (category in (
                            'концерт', 'стендап', 'вечеринка',
                            'выставка', 'дети', 'спорт', 'нетворкинг'
                          )),
  starts_at             timestamptz not null,
  ends_at               timestamptz,
  venue_name            text,
  address               text,
  lat                   double precision,
  lng                   double precision,
  borough               text,
  price_from_pence      integer check (price_from_pence >= 0),  -- null = free
  ticket_url            text,
  organizer_provider_id uuid references public.providers(id) on delete set null,
  languages             text[] not null default '{}',           -- event language(s); may include 'en'
  cover_image           text,
  status                text not null default 'draft'
                          check (status in ('draft', 'published')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger trg_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();
