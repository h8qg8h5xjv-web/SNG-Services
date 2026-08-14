-- 0004_scheduling.sql
-- Weekly schedules and one-off exceptions. Only meaningful for native_booking providers.

create table public.schedules (
  id          uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),  -- 0 = Sunday .. 6 = Saturday (Postgres DOW)
  start_time  time not null,
  end_time    time not null,
  constraint chk_schedule_bounds check (end_time > start_time)
);

create table public.schedule_exceptions (
  id             uuid primary key default gen_random_uuid(),
  provider_id    uuid not null references public.providers(id) on delete cascade,
  exception_date date not null,
  is_closed      boolean not null default true,
  start_time     time,
  end_time       time,
  -- Closed => no hours. Open-with-other-hours => both hours, end after start.
  constraint chk_exception_hours check (
    (is_closed and start_time is null and end_time is null)
    or (not is_closed and start_time is not null and end_time is not null and end_time > start_time)
  ),
  unique (provider_id, exception_date)
);

-- Schedules and exceptions require a native_booking provider.
create or replace function public.enforce_native_booking_provider()
returns trigger
language plpgsql
as $$
declare
  v_fulfillment text;
begin
  select fulfillment_type into v_fulfillment
  from public.providers where id = new.provider_id;

  if v_fulfillment is null then
    raise exception 'Provider % not found', new.provider_id;
  end if;
  if v_fulfillment <> 'native_booking' then
    raise exception 'Schedules are only allowed for native_booking providers (provider %)', new.provider_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger trg_schedules_native_only
  before insert or update on public.schedules
  for each row execute function public.enforce_native_booking_provider();

create trigger trg_schedule_exceptions_native_only
  before insert or update on public.schedule_exceptions
  for each row execute function public.enforce_native_booking_provider();
