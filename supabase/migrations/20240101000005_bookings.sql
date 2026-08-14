-- 0005_bookings.sql
-- Bookings with database-level slot-overflow protection.

create table public.bookings (
  id                  uuid primary key default gen_random_uuid(),
  service_id          uuid not null references public.services(id) on delete restrict,
  -- Denormalized from the service so we can index bookings by provider + date range.
  -- Kept consistent by the trigger below; callers may omit it.
  provider_id         uuid not null references public.providers(id) on delete restrict,
  starts_at           timestamptz not null,
  ends_at             timestamptz not null,
  party_size          integer not null default 1 check (party_size > 0),
  customer_name       text not null,
  customer_phone      text not null,
  customer_email      text,
  status              text not null default 'pending'
                        check (status in ('pending', 'confirmed', 'cancelled')),
  is_visible_to_group boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint chk_booking_bounds check (ends_at > starts_at)
);

create trigger trg_bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- Enforces three things on every insert/update:
--   1. the booking's provider is native_booking,
--   2. provider_id stays in sync with the service,
--   3. confirmed party_size never exceeds the service capacity for the slot.
--
-- Overflow protection: we SELECT ... FOR UPDATE the service row first, which
-- serializes all concurrent bookings for that service. Two transactions can no
-- longer both read "1 seat left" and both commit — the second waits for the
-- first, then re-sums against the just-committed row. The capacity rule is
-- checked only for status = 'confirmed', per the spec: the sum of party_size of
-- confirmed bookings overlapping the slot, plus this one, must be <= capacity.
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
  for update of s;  -- lock the service row to serialize concurrent bookings

  if v_provider_id is null then
    raise exception 'Service % not found', new.service_id;
  end if;
  if v_fulfillment <> 'native_booking' then
    raise exception 'Bookings are only allowed for native_booking providers (service %)', new.service_id
      using errcode = 'check_violation';
  end if;

  new.provider_id := v_provider_id;

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

create trigger trg_bookings_rules
  before insert or update on public.bookings
  for each row execute function public.enforce_booking_rules();
