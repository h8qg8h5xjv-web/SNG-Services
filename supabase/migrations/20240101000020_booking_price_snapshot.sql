-- 20240101000020_booking_price_snapshot.sql
-- A booking must remember the price and duration it was made at. They were being
-- read from services at display time, so changing a service's price silently
-- rewrote the price of every past booking. Snapshot both onto the booking at
-- creation and make them immutable afterwards.

alter table public.bookings
  add column price_pence  integer,
  add column duration_min integer;

-- Backfill existing bookings from their current service (the best we have).
update public.bookings b
   set price_pence  = s.price_pence,
       duration_min = s.duration_min
  from public.services s
 where s.id = b.service_id;

alter table public.bookings
  alter column price_pence  set not null,
  alter column duration_min set not null,
  add constraint chk_booking_price_pence check (price_pence >= 0),
  add constraint chk_booking_duration_min check (duration_min > 0);

-- Extend the booking-rules trigger: on INSERT, snapshot price/duration from the
-- service when the caller didn't supply them; on UPDATE, freeze both to their
-- original values so nothing (not even an admin edit or a price change) can
-- rewrite a booking's recorded price. Capacity/fulfillment logic is unchanged.
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

  if new.status = 'confirmed' then
    select coalesce(sum(b.party_size), 0)
      into v_taken
    from public.bookings b
    where b.service_id = new.service_id
      and b.status = 'confirmed'
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

-- A request-accept booking captures the AGREED price (p_price_pence); the
-- trigger fills duration from the service. Everything else is unchanged.
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
  update public.requests
     set status = 'matched'
   where id = p_request_id
     and status = 'broadcasting'
  returning true into v_won;

  if v_won is null then
    return false;
  end if;

  if p_service_id is not null and p_starts_at is not null then
    insert into public.bookings
      (service_id, starts_at, ends_at, party_size, customer_name, customer_phone, status, price_pence)
    select p_service_id, p_starts_at, p_ends_at, 1,
           coalesce(c.contact_name, 'Customer'), coalesce(c.contact_phone, ''), 'confirmed',
           p_price_pence
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
