-- 20240101000035_booking_capacity_holds.sql
-- Restore the capacity guard for PENDING bookings.
--
-- …10 made enforce_booking_rules() count pending + confirmed bookings against a
-- service's capacity, because the booking flow creates PENDING bookings
-- (lib/booking/actions.ts) and the slot engine (lib/slots/compute.ts) already
-- treats pending as taken. …20 rewrote the function for the price snapshot and
-- accidentally went back to checking confirmed bookings only, so the database
-- stopped rejecting a second guest booking for a full slot.
--
-- This is the …20 function with one change: every booking that holds a slot
-- (pending or confirmed; cancelled never does) is checked and counted.
-- Only rows being inserted or updated are checked, so existing overlapping
-- bookings are left as they are; confirming a pending booking in an already
-- overbooked slot will now be rejected.

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
  v_taken        integer;
begin
  select s.provider_id, s.capacity, p.fulfillment_type, s.price_pence, s.duration_min
    into v_provider_id, v_capacity, v_fulfillment, v_price, v_duration
  from public.services s
  join public.providers p on p.id = s.provider_id
  where s.id = new.service_id
  for update of s;  -- lock the service row to serialize concurrent bookings

  if v_provider_id is null then
    raise exception 'Service % not found', new.service_id;
  end if;
  if v_fulfillment <> 'native_booking' then
    raise exception 'Bookings are only allowed for native_booking providers (service %)', new.service_id
      using errcode = 'check_violation';
  end if;

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
  end if;

  return new;
end;
$$;
