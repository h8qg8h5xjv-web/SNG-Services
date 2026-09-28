-- Business onboarding picks category and district from reference data, never
-- free text.
--
-- 1. boroughs: the reference list of London districts — the 32 boroughs and
--    the City of London, spelt as the existing data spells them ("City of
--    Westminster", "Hammersmith and Fulham"). Onboarding (/for-business, the
--    cabinet's «Создать карточку», admin QuickMaster) offers this whole list and
--    the server rejects anything else. DistrictBar and request matching keep
--    showing only districts that have published masters — a subset of this.
--    No foreign key on providers.borough yet: existing rows may be spelt
--    differently; the server-side checks cover new writes.
--
-- 2. catalog_requests: the category was free text. It becomes a reference
--    (category_id) plus a separate suggestion (category_suggestion) for
--    «Моей категории нет» — a suggestion never creates a category; the admin
--    maps it to an existing one. The old free-text `category` column stays so
--    existing rows remain readable; new rows leave it null.

create table public.boroughs (
  name        text primary key,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.boroughs enable row level security;

create policy boroughs_select on public.boroughs
  for select using (true);
create policy boroughs_write on public.boroughs
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.boroughs (name, sort_order)
select name, row_number() over (order by name)
from unnest(array[
  'Barking and Dagenham', 'Barnet', 'Bexley', 'Brent', 'Bromley', 'Camden',
  'City of London', 'City of Westminster', 'Croydon', 'Ealing', 'Enfield',
  'Greenwich', 'Hackney', 'Hammersmith and Fulham', 'Haringey', 'Harrow',
  'Havering', 'Hillingdon', 'Hounslow', 'Islington', 'Kensington and Chelsea',
  'Kingston upon Thames', 'Lambeth', 'Lewisham', 'Merton', 'Newham',
  'Redbridge', 'Richmond upon Thames', 'Southwark', 'Sutton', 'Tower Hamlets',
  'Waltham Forest', 'Wandsworth'
]) as name;

alter table public.catalog_requests
  add column category_id uuid references public.categories (id) on delete set null,
  add column category_suggestion text
    constraint catalog_requests_category_suggestion_len check (char_length(category_suggestion) <= 200);

comment on column public.catalog_requests.category is
  'Legacy free-text category (rows before migration …37). New rows use category_id / category_suggestion.';
comment on column public.catalog_requests.category_suggestion is
  '«Моей категории нет»: what the business typed. Never creates a category; the admin maps it (category_id).';
