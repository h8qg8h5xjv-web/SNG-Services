-- Contact-only updates don't re-run the capacity checks.
--
-- enforce_booking_rules ran the service-seat and provider-capacity checks on
-- EVERY update of a pending/confirmed booking. Past bookings that overlap under
-- today's rules (made before …35/…36) then couldn't be edited at all — not even
-- to wipe the customer's name, phone and email when a guest asks to delete
-- their data. The checks now run only when occupancy can change: an insert, or
-- an update to service_id, starts_at, ends_at, party_size or status. Everything
-- else in the function is unchanged from …36.

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

  -- Occupancy checks only when occupancy can change: a new booking, or an
  -- update to its service, time, seats or status. Editing contact fields (or
  -- wiping them for "delete my data") never re-checks capacity, so historical
  -- rows that overlap under today's rules stay editable.
  if new.status in ('pending', 'confirmed')
     and (tg_op = 'INSERT'
          or new.service_id  is distinct from old.service_id
          or new.starts_at   is distinct from old.starts_at
          or new.ends_at     is distinct from old.ends_at
          or new.party_size  is distinct from old.party_size
          or new.status      is distinct from old.status) then
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
