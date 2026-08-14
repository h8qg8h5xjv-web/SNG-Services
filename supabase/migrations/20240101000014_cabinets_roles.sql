-- 20240101000014_cabinets_roles.sql
-- CABINETS.md step 1/3: rewrite the access model from 2 principals (anon, admin)
-- to 4 (guest, customer, provider_owner, admin). The heavy lifting is RLS.
--
-- Principals:
--   guest (anon)        — reads published; may create a guest booking
--   customer (authed)   — own bookings (customer_id = auth.uid())
--   provider_owner      — own card + services/schedule/languages/translations/bookings,
--                         via provider_members
--   admin               — everything (is_admin())
--
-- Request contacts-until-match live with the requests tables (REQUESTS step),
-- which don't exist yet; that policy is added there.

-- ---------------------------------------------------------------------------
-- Ownership + invites
-- ---------------------------------------------------------------------------
create table public.provider_members (
  provider_id uuid not null references public.providers(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner' check (role in ('owner', 'staff')),
  created_at  timestamptz not null default now(),
  primary key (provider_id, user_id)
);
create index idx_provider_members_user on public.provider_members (user_id);

create table public.provider_invites (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  token       text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

-- Customers own their bookings (nullable — guest bookings stay anonymous).
alter table public.bookings
  add column customer_id uuid references auth.users(id) on delete set null;
create index idx_bookings_customer on public.bookings (customer_id);

-- ---------------------------------------------------------------------------
-- Helper: is the current user a member of this provider?
-- SECURITY DEFINER so it reads provider_members without recursing through RLS.
-- ---------------------------------------------------------------------------
create or replace function public.is_provider_member(p_provider_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.provider_members m
    where m.provider_id = p_provider_id
      and m.user_id = auth.uid()
  );
$$;

-- Claim a provider card with a one-time invite token (accepted after magic-link login).
create or replace function public.accept_provider_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider uuid;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;
  select provider_id into v_provider
  from public.provider_invites
  where token = p_token and used_at is null and expires_at > now()
  for update;
  if v_provider is null then
    raise exception 'Invalid or expired invite';
  end if;
  insert into public.provider_members (provider_id, user_id, role)
  values (v_provider, v_uid, 'owner')
  on conflict (provider_id, user_id) do nothing;
  update public.provider_invites set used_at = now() where token = p_token;
  return v_provider;
end;
$$;
grant execute on function public.accept_provider_invite(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS on the new tables
-- ---------------------------------------------------------------------------
alter table public.provider_members enable row level security;
alter table public.provider_invites enable row level security;

create policy provider_members_select on public.provider_members
  for select using (
    public.is_admin() or user_id = auth.uid() or public.is_provider_member(provider_id)
  );
create policy provider_members_write on public.provider_members
  for all using (public.is_admin()) with check (public.is_admin());

-- Invites are admin-only; acceptance goes through accept_provider_invite().
create policy provider_invites_admin on public.provider_invites
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Rewrite provider + owned-data policies to add provider_owner
-- ---------------------------------------------------------------------------
drop policy if exists providers_select on public.providers;
drop policy if exists providers_write on public.providers;
create policy providers_select on public.providers
  for select using (
    status = 'published' or public.is_admin() or public.is_provider_member(id)
  );
create policy providers_update on public.providers
  for update using (public.is_admin() or public.is_provider_member(id))
  with check (public.is_admin() or public.is_provider_member(id));
create policy providers_insert on public.providers
  for insert with check (public.is_admin());
create policy providers_delete on public.providers
  for delete using (public.is_admin());

-- Child tables: readable when the parent is published (or you own it / admin);
-- writable by the owner or admin.
drop policy if exists services_select on public.services;
drop policy if exists services_write on public.services;
create policy services_select on public.services
  for select using (
    public.is_admin() or public.is_provider_member(provider_id) or exists (
      select 1 from public.providers p where p.id = services.provider_id and p.status = 'published'
    )
  );
create policy services_write on public.services
  for all using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));

drop policy if exists schedules_select on public.schedules;
drop policy if exists schedules_write on public.schedules;
create policy schedules_select on public.schedules
  for select using (
    public.is_admin() or public.is_provider_member(provider_id) or exists (
      select 1 from public.providers p where p.id = schedules.provider_id and p.status = 'published'
    )
  );
create policy schedules_write on public.schedules
  for all using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));

drop policy if exists schedule_exceptions_select on public.schedule_exceptions;
drop policy if exists schedule_exceptions_write on public.schedule_exceptions;
create policy schedule_exceptions_select on public.schedule_exceptions
  for select using (
    public.is_admin() or public.is_provider_member(provider_id) or exists (
      select 1 from public.providers p where p.id = schedule_exceptions.provider_id and p.status = 'published'
    )
  );
create policy schedule_exceptions_write on public.schedule_exceptions
  for all using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));

drop policy if exists provider_languages_select on public.provider_languages;
drop policy if exists provider_languages_write on public.provider_languages;
create policy provider_languages_select on public.provider_languages
  for select using (
    public.is_admin() or public.is_provider_member(provider_id) or exists (
      select 1 from public.providers p where p.id = provider_languages.provider_id and p.status = 'published'
    )
  );
create policy provider_languages_write on public.provider_languages
  for all using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));

drop policy if exists provider_translations_select on public.provider_translations;
drop policy if exists provider_translations_write on public.provider_translations;
create policy provider_translations_select on public.provider_translations
  for select using (
    public.is_admin() or public.is_provider_member(provider_id) or exists (
      select 1 from public.providers p where p.id = provider_translations.provider_id and p.status = 'published'
    )
  );
create policy provider_translations_write on public.provider_translations
  for all using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));

-- ---------------------------------------------------------------------------
-- Bookings: guest creates; customer sees own; provider sees theirs; admin all
-- ---------------------------------------------------------------------------
drop policy if exists bookings_select on public.bookings;
drop policy if exists bookings_write on public.bookings;
create policy bookings_select on public.bookings
  for select using (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_provider_member(provider_id)
  );
-- Guest/customer may create a pending booking (and only for themselves).
create policy bookings_insert on public.bookings
  for insert with check (
    status = 'pending' and (customer_id is null or customer_id = auth.uid())
  );
-- Customer cancels own; provider manages theirs; admin all.
create policy bookings_update on public.bookings
  for update using (
    public.is_admin() or public.is_provider_member(provider_id) or customer_id = auth.uid()
  )
  with check (
    public.is_admin() or public.is_provider_member(provider_id) or customer_id = auth.uid()
  );
create policy bookings_delete on public.bookings
  for delete using (public.is_admin() or public.is_provider_member(provider_id));

-- Guest booking creation needs the table-level INSERT grant for anon (default
-- privileges only gave anon SELECT). RLS still restricts what it may insert.
grant insert on public.bookings to anon;

-- The booking capacity trigger locks the service row (SELECT ... FOR UPDATE),
-- which needs UPDATE privilege on services. A guest (anon) only has SELECT, so
-- a direct guest booking would fail on the lock. Run the trigger as its owner —
-- it is internal integrity logic — so guest bookings work while capacity stays
-- enforced. (search_path pinned since it is now SECURITY DEFINER.)
alter function public.enforce_booking_rules() security definer;
alter function public.enforce_booking_rules() set search_path = public;
