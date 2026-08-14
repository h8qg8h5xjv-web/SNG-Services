-- 0010_booking_capacity_pending.sql
-- Booking overflow is caught at the DB for the booking flow, which creates
-- PENDING bookings. Step 1 enforced capacity for confirmed only; here we extend
-- enforce_booking_rules() to count pending + confirmed against capacity, matching
-- the slot-availability rule (DESIGN §2б / PROMPTS step 7). The service row is
-- still locked (SELECT ... FOR UPDATE) so concurrent bookings can't both slip in.

create or replace function public.enforce_booking_rules()
returns trigger
language plpgsql
as $$
declare
  v_provider_id  uuid;
  v_capacity     integer;
  v_fulfillment  text;
  v_taken        integer;
begin
  select s.provider_id, s.capacity, p.fulfillment_type
    into v_provider_id, v_capacity, v_fulfillment
  from public.services s
  join public.providers p on p.id = s.provider_id
  where s.id = new.service_id
  for update of s;

  if v_provider_id is null then
    raise exception 'Service % not found', new.service_id;
  end if;
  if v_fulfillment <> 'native_booking' then
    raise exception 'Bookings are only allowed for native_booking providers (service %)', new.service_id
      using errcode = 'check_violation';
  end if;

  new.provider_id := v_provider_id;

  -- Cancelled bookings never occupy a slot; pending and confirmed both do.
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
