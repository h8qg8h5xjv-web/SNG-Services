-- Provider-level overlap guard.
--
-- Bug: the capacity check in enforce_booking_rules only looked at bookings of
-- the SAME service, so a solo master with several services could be booked
-- twice at the same time through different services.
--
-- Rule (agreed before coding):
--   * providers.parallel_capacity — how many clients the provider serves at
--     once (chairs / masters). Default 1: a solo master.
--   * Only pending and confirmed bookings count; cancelled ones never do.
--   * An individual service (capacity = 1): every booking takes one unit of
--     the provider's parallel capacity for its time.
--   * A group service (capacity > 1): a session = (service, starts_at). Seats
--     inside a session are still counted per service (party_size up to the
--     service capacity). A session with at least one booking takes ONE unit of
--     the provider, however many people are in it; an empty session takes none.
--   * A booking is accepted when its service is not over capacity AND, at every
--     moment of its interval, the provider's busy units plus its own unit stay
--     within parallel_capacity (peak concurrency, not a count of overlaps). A
--     booking into a group session that already has bookings needs no new unit.
-- lib/slots/provider-load.ts applies the same rule when the site computes
-- slots, so the site never offers a window this trigger would reject.
--
-- Existing overlapping rows are not touched: the trigger checks new rows and
-- updates only. Find them before deploying with the read-only query in the PR.

alter table public.providers
  add column parallel_capacity integer not null default 1
    constraint providers_parallel_capacity_check check (parallel_capacity >= 1);

comment on column public.providers.parallel_capacity is
  'How many clients the provider serves at the same time (chairs / masters). Individual bookings and booked group sessions share it.';

create or replace function public.enforce_booking_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider_id  uuid;
  v_capacity     integer;
  v_fulfillment  text;
  v_price        integer;
  v_duration     integer;
  v_parallel     integer;
  v_taken        integer;
  v_peak         integer;
  v_in_session   boolean;
begin
  select s.provider_id, s.capacity, p.fulfillment_type, s.price_pence, s.duration_min
    into v_provider_id, v_capacity, v_fulfillment, v_price, v_duration
  from public.services s
  join public.providers p on p.id = s.provider_id
  where s.id = new.service_id;

  if v_provider_id is null then
    raise exception 'Service % not found', new.service_id;
  end if;
  if v_fulfillment <> 'native_booking' then
    raise exception 'Bookings are only allowed for native_booking providers (service %)', new.service_id
      using errcode = 'check_violation';
  end if;

  -- Lock the provider row: bookings on different services of one provider now
  -- compete for the same capacity, so they must be serialized per provider.
  select p.parallel_capacity into v_parallel
  from public.providers p
  where p.id = v_provider_id
  for update;

  new.provider_id := v_provider_id;

  -- Price/duration snapshot. Immutable once set.
  if tg_op = 'INSERT' then
    if new.price_pence is null then new.price_pence := v_price; end if;
    if new.duration_min is null then new.duration_min := v_duration; end if;
  elsif tg_op = 'UPDATE' then
    new.price_pence  := old.price_pence;
    new.duration_min := old.duration_min;
  end if;

  if new.status in ('pending', 'confirmed') then
    -- 1. The service's own capacity (seats), as before.
    select coalesce(sum(b.party_size), 0)
      into v_taken
    from public.bookings b
    where b.service_id = new.service_id
      and b.status in ('pending', 'confirmed')
      and b.id <> new.id
      and b.starts_at < new.ends_at
      and b.ends_at > new.starts_at;

    if v_taken + new.party_size > v_capacity then
      raise exception
        'Slot capacity exceeded for service %: % of % taken, requested %',
        new.service_id, v_taken, v_capacity, new.party_size
        using errcode = 'check_violation';
    end if;

    -- 2. The provider's parallel capacity. A booking joining a group session
    --    that already has bookings uses that session's unit.
    v_in_session := v_capacity > 1 and exists (
      select 1 from public.bookings b
      where b.service_id = new.service_id
        and b.starts_at = new.starts_at
        and b.status in ('pending', 'confirmed')
        and b.id <> new.id
    );

    if not v_in_session then
      with units as (
        -- individual bookings: one unit each
        select b.starts_at as u_start, b.ends_at as u_end
        from public.bookings b
        join public.services s on s.id = b.service_id
        where b.provider_id = v_provider_id
          and s.capacity = 1
          and b.status in ('pending', 'confirmed')
          and b.id <> new.id
          and b.starts_at < new.ends_at
          and b.ends_at > new.starts_at
        union all
        -- booked group sessions: one unit per (service, starts_at)
        select b.starts_at, max(b.ends_at)
        from public.bookings b
        join public.services s on s.id = b.service_id
        where b.provider_id = v_provider_id
          and s.capacity > 1
          and b.status in ('pending', 'confirmed')
          and b.id <> new.id
          and b.starts_at < new.ends_at
          and b.ends_at > new.starts_at
        group by b.service_id, b.starts_at
      ),
      points as (
        -- concurrency only rises at a start, so checking the new booking's
        -- start and every unit start inside its interval finds the peak
        select new.starts_at as t
        union
        select u_start from units where u_start > new.starts_at and u_start < new.ends_at
      )
      select coalesce(max(c.n), 0) into v_peak
      from points p
      cross join lateral (
        select count(*)::integer as n from units u where u.u_start <= p.t and u.u_end > p.t
      ) c;

      if v_peak + 1 > v_parallel then
        raise exception
          'Provider is fully booked at this time: % of % in use (booking for service %)',
          v_peak, v_parallel, new.service_id
          using errcode = 'check_violation';
      end if;
    end if;
  end if;

  return new;
end;
$$;

-- parallel_capacity decides how many bookings the site accepts at once, so only
-- an admin sets it (the admin provider form). Owners may update their own row
-- under RLS; this guard keeps this one column out of their reach. Same pattern
-- as enforce_provider_credential_authority: service role (no auth.uid()) and
-- admins pass.
create or replace function public.enforce_parallel_capacity_admin_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if new.parallel_capacity is distinct from old.parallel_capacity then
    raise exception 'Only an admin may change parallel_capacity'
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger trg_providers_parallel_capacity_admin_only
  before update on public.providers
  for each row execute function public.enforce_parallel_capacity_admin_only();
