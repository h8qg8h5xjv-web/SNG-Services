-- 0002_reference.sql
-- Reference tables: categories and service languages.
-- These are content the operator controls; names live in the DB, never hardcoded in components.

create table public.categories (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name_en    text not null,
  name_ru    text not null,
  icon       text not null,          -- Tabler icon name, e.g. 'scissors'
  sort_order integer not null default 0
);

-- Service languages: ISO 639-1 code + name in the language's own script.
-- English is deliberately absent: it is the interface base, not a marker of a business.
create table public.languages (
  code        text primary key,      -- ISO 639-1, e.g. 'ru', 'ka', 'kk'
  name_native text not null,
  sort_order  integer not null default 0
);
