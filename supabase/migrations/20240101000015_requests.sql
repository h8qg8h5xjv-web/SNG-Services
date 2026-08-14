-- 20240101000015_requests.sql
-- REQUESTS.md step 1/3: the request/broadcast model — data, RLS, atomic accept,
-- and a provider-stats view. Match logic (waves) is a pure function in
-- lib/requests/match.ts; the wave job lives in lib/requests/advance.ts.

-- Category drives the request type; providers can pause broadcasts.
alter table public.categories
  add column default_request_type text not null default 'fixed'
    check (default_request_type in ('fixed', 'quote'));
alter table public.providers
  add column broadcast_paused_until timestamptz;

-- ---------------------------------------------------------------------------
-- Core tables
-- ---------------------------------------------------------------------------
create table public.requests (
  id                 uuid primary key default gen_random_uuid(),
  public_ref         text not null unique
                       default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  -- Long secret for guest access (customer_id is null for guests).
  guest_token        text not null
                       default md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text),
  customer_id        uuid references auth.users(id) on delete set null,
  type               text not null check (type in ('fixed', 'quote')),
  category_id        uuid not null references public.categories(id) on delete restrict,
  service_id         uuid references public.services(id) on delete set null,
  target_provider_id uuid references public.providers(id) on delete set null,
  borough            text not null,
  description        text,
  budget_max_pence   integer check (budget_max_pence >= 0),
  status             text not null default 'draft'
                       check (status in ('draft', 'broadcasting', 'matched',
                                         'confirmed', 'expired', 'cancelled', 'completed')),
  created_at         timestamptz not null default now(),
  expires_at         timestamptz
);

-- Contacts + address live in a SEPARATE table so RLS can hide them until match —
-- the guarantee is the policy below, not front-end filtering (REQUESTS §12.1).
create table public.request_contacts (
  request_id     uuid primary key references public.requests(id) on delete cascade,
  contact_name   text not null,
  contact_phone  text not null,
  contact_email  text,
  address        text
);

create table public.request_windows (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests(id) on delete cascade,
  starts_at  timestamptz not null,
  ends_at    timestamptz not null,
  constraint chk_window_bounds check (ends_at > starts_at)
);

create table public.request_targets (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.requests(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  wave        integer not null,
  channel     text,
  notified_at timestamptz,
  response    text not null default 'pending'
                check (response in ('pending', 'accepted', 'declined', 'no_response')),
  responded_at timestamptz,
  unique (request_id, provider_id)
);

create table public.request_offers (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests(id) on delete cascade,
  provider_id   uuid not null references public.providers(id) on delete cascade,
  price_pence   integer not null check (price_pence >= 0),
  message       text,
  proposed_start timestamptz,
  status        text not null default 'open'
                  check (status in ('open', 'withdrawn', 'chosen', 'rejected')),
  created_at    timestamptz not null default now(),
  unique (request_id, provider_id)
);

-- One winner per request.
create table public.request_matches (
  request_id  uuid primary key references public.requests(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete restrict,
  service_id  uuid references public.services(id) on delete set null,
  starts_at   timestamptz,
  ends_at     timestamptz,
  price_pence integer,
  booking_id  uuid references public.bookings(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index idx_requests_status on public.requests (status);
create index idx_requests_customer on public.requests (customer_id);
create index idx_request_targets_request on public.request_targets (request_id);
create index idx_request_targets_provider on public.request_targets (provider_id);
create index idx_request_offers_request on public.request_offers (request_id);

-- ---------------------------------------------------------------------------
-- Atomic accept (REQUESTS §6): the conditional status update is the race gate.
-- Only the transaction that flips broadcasting -> matched wins; everyone else
-- gets 0 rows and "already taken". Match + booking are created in the same
-- transaction (this function body).
-- ---------------------------------------------------------------------------
create or replace function public.accept_request(
  p_request_id uuid,
  p_provider_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_price_pence integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_won boolean;
  v_booking uuid;
begin
  -- The gate: flip only if still broadcasting. Row lock serializes racers.
  update public.requests
     set status = 'matched'
   where id = p_request_id
     and status = 'broadcasting'
  returning true into v_won;

  if v_won is null then
    return false; -- lost the race / not broadcasting
  end if;

  if p_service_id is not null and p_starts_at is not null then
    insert into public.bookings
      (service_id, starts_at, ends_at, party_size, customer_name, customer_phone, status)
    select p_service_id, p_starts_at, p_ends_at, 1,
           coalesce(c.contact_name, 'Customer'), coalesce(c.contact_phone, ''), 'confirmed'
    from public.request_contacts c
    where c.request_id = p_request_id
    returning id into v_booking;
  end if;

  insert into public.request_matches
    (request_id, provider_id, service_id, starts_at, ends_at, price_pence, booking_id)
  values
    (p_request_id, p_provider_id, p_service_id, p_starts_at, p_ends_at, p_price_pence, v_booking);

  update public.request_targets
     set response = 'accepted', responded_at = now()
   where request_id = p_request_id and provider_id = p_provider_id;

  return true;
end;
$$;
grant execute on function public.accept_request(uuid, uuid, uuid, timestamptz, timestamptz, integer)
  to authenticated, service_role;

-- Guest read of their own request by (public_ref, guest_token) — non-contact fields.
create or replace function public.get_guest_request(p_ref text, p_token text)
returns public.requests
language sql
stable
security definer
set search_path = public
as $$
  select * from public.requests
  where public_ref = p_ref and guest_token = p_token
  limit 1;
$$;
grant execute on function public.get_guest_request(text, text) to anon, authenticated;

-- SECURITY DEFINER predicates for the policies. Cross-table checks must NOT go
-- through another table's RLS or the policies recurse (requests <-> targets).
-- Owned by postgres, so their reads bypass RLS.
create or replace function public.is_request_owner(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.requests r
                 where r.id = p_request_id and r.customer_id = auth.uid());
$$;
create or replace function public.request_is_mine_or_guest(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.requests r
                 where r.id = p_request_id and (r.customer_id = auth.uid() or r.customer_id is null));
$$;
create or replace function public.is_request_target_member(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.request_targets t
                 join public.provider_members m on m.provider_id = t.provider_id
                 where t.request_id = p_request_id and m.user_id = auth.uid());
$$;
create or replace function public.is_request_matched_member(p_request_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.request_matches x
                 join public.provider_members m on m.provider_id = x.provider_id
                 where x.request_id = p_request_id and m.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.requests          enable row level security;
alter table public.request_contacts  enable row level security;
alter table public.request_windows   enable row level security;
alter table public.request_targets   enable row level security;
alter table public.request_offers    enable row level security;
alter table public.request_matches   enable row level security;

-- requests: owner (customer) + admin + any targeted provider. Guests read via
-- get_guest_request(). Insert: guest or the owning customer.
create policy requests_select on public.requests
  for select using (
    public.is_admin()
    or customer_id = auth.uid()
    or public.is_request_target_member(id)
  );
create policy requests_insert on public.requests
  for insert with check (
    status in ('draft', 'broadcasting')
    and (customer_id is null or customer_id = auth.uid())
  );
create policy requests_update on public.requests
  for update using (public.is_admin() or customer_id = auth.uid())
  with check (public.is_admin() or customer_id = auth.uid());

-- CONTACTS: the whole point. Readable only by admin, the owning customer, or the
-- MATCHED provider (a request_matches row must exist). Before a match, no
-- provider can read contacts or address — enforced here, not in app code.
create policy request_contacts_select on public.request_contacts
  for select using (
    public.is_admin()
    or public.is_request_owner(request_id)
    or public.is_request_matched_member(request_id)
  );
create policy request_contacts_write on public.request_contacts
  for all using (public.is_admin() or public.request_is_mine_or_guest(request_id))
  with check (public.is_admin() or public.request_is_mine_or_guest(request_id));

create policy request_windows_select on public.request_windows
  for select using (
    public.is_admin()
    or public.is_request_owner(request_id)
    or public.is_request_target_member(request_id)
  );
create policy request_windows_write on public.request_windows
  for all using (public.is_admin() or public.request_is_mine_or_guest(request_id))
  with check (public.is_admin() or public.request_is_mine_or_guest(request_id));

-- targets: the targeted provider (and the owning customer, and admin) can read.
create policy request_targets_select on public.request_targets
  for select using (
    public.is_admin()
    or public.is_provider_member(provider_id)
    or public.is_request_owner(request_id)
  );
create policy request_targets_write on public.request_targets
  for all using (public.is_admin()) with check (public.is_admin());

-- offers (quote): provider manages own; owning customer reads to choose; admin all.
create policy request_offers_select on public.request_offers
  for select using (
    public.is_admin()
    or public.is_provider_member(provider_id)
    or public.is_request_owner(request_id)
  );
create policy request_offers_write on public.request_offers
  for all using (public.is_admin() or public.is_provider_member(provider_id))
  with check (public.is_admin() or public.is_provider_member(provider_id));

-- matches: owning customer + matched provider + admin.
create policy request_matches_select on public.request_matches
  for select using (
    public.is_admin()
    or public.is_provider_member(provider_id)
    or public.is_request_owner(request_id)
  );
create policy request_matches_write on public.request_matches
  for all using (public.is_admin()) with check (public.is_admin());

-- Guests create requests; give anon INSERT on requests, contacts, windows.
grant insert on public.requests to anon;
grant insert on public.request_contacts to anon;
grant insert on public.request_windows to anon;

-- ---------------------------------------------------------------------------
-- Provider stats (REQUESTS §7): a view, not columns. security_invoker so RLS
-- scopes it (admin sees all; a provider owner sees their own via request_targets).
-- ---------------------------------------------------------------------------
create view public.provider_request_stats
  with (security_invoker = true)
as
select
  t.provider_id,
  count(*) as received,
  count(*) filter (where t.response = 'accepted') as accepted,
  round(
    count(*) filter (where t.response = 'accepted')::numeric
      / nullif(count(*), 0), 3
  ) as accept_rate,
  percentile_cont(0.5) within group (
    order by extract(epoch from (t.responded_at - t.notified_at))
  ) filter (where t.responded_at is not null and t.notified_at is not null)
    as median_response_seconds,
  (
    select count(*)
    from public.request_matches m
    join public.bookings b on b.id = m.booking_id
    where m.provider_id = t.provider_id and b.status = 'cancelled'
  ) as cancellations_after_accept
from public.request_targets t
group by t.provider_id;
