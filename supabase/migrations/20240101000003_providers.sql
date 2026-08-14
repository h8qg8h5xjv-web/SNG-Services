-- 0003_providers.sql
-- Providers and their directly owned data: languages, translations, services.

create table public.providers (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique,
  name_en            text not null,
  description_en     text not null,
  category_id        uuid not null references public.categories(id) on delete restrict,
  borough            text not null,
  address            text,
  lat                double precision,
  lng                double precision,
  phone              text,
  telegram           text,
  instagram          text,
  website            text,
  cover_image        text,           -- external URL or Supabase Storage path; resolved in the app
  fulfillment_type   text not null
                       check (fulfillment_type in ('native_booking', 'external_order', 'enquiry')),
  external_order_url text,
  status             text not null default 'draft'
                       check (status in ('draft', 'published')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- external_order_url is mandatory exactly when the provider sends the user outside.
  constraint chk_external_order_url check (
    fulfillment_type <> 'external_order' or external_order_url is not null
  )
);

-- Many-to-many: which CIS languages a provider serves in.
create table public.provider_languages (
  provider_id   uuid not null references public.providers(id) on delete cascade,
  language_code text not null references public.languages(code) on delete restrict,
  primary key (provider_id, language_code)
);

-- Per-locale translations of name/description. English lives on providers itself (the fallback base).
create table public.provider_translations (
  provider_id uuid not null references public.providers(id) on delete cascade,
  locale      text not null check (locale in ('ru', 'uk', 'kk', 'ka', 'hy')),
  name        text,
  description text,
  primary key (provider_id, locale)
);

create table public.services (
  id             uuid primary key default gen_random_uuid(),
  provider_id    uuid not null references public.providers(id) on delete cascade,
  name_en        text not null,
  name_ru        text,
  description_en text,
  description_ru text,
  duration_min   integer not null check (duration_min > 0),
  price_pence    integer not null default 0 check (price_pence >= 0),
  capacity       integer not null default 1 check (capacity > 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_providers_updated_at
  before update on public.providers
  for each row execute function public.set_updated_at();

create trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- A published provider must serve at least one CIS language.
-- This fires on the provider row; the usual flow is insert as draft, add
-- languages, then update status to 'published' (checked here).
create or replace function public.enforce_published_has_language()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'published'
     and not exists (
       select 1 from public.provider_languages pl where pl.provider_id = new.id
     ) then
    raise exception 'Published provider % must have at least one service language', new.id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_providers_published_language
  before insert or update on public.providers
  for each row execute function public.enforce_published_has_language();

-- The other direction: don't let the last language be removed from a published provider.
-- On a provider cascade-delete the parent row is already gone, so v_status is null and this passes.
create or replace function public.prevent_last_language_removal()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_remaining integer;
begin
  select status into v_status from public.providers where id = old.provider_id;
  if v_status = 'published' then
    select count(*) into v_remaining
    from public.provider_languages
    where provider_id = old.provider_id
      and language_code <> old.language_code;
    if v_remaining = 0 then
      raise exception 'Cannot remove the last language of published provider %', old.provider_id
        using errcode = 'check_violation';
    end if;
  end if;
  return old;
end;
$$;

create trigger trg_provider_languages_prevent_last
  before delete or update on public.provider_languages
  for each row execute function public.prevent_last_language_removal();
