-- READ-ONLY. Existing bookings that break the provider overlap rule of
-- migration 20240101000036 (run BEFORE deploying it; it only SELECTs).
--
-- Rule: pending + confirmed count. An individual booking (service capacity 1)
-- is one unit; a group session (service capacity > 1, same service and start)
-- with bookings is one unit. At any moment a provider may have at most
-- parallel_capacity units busy. The column doesn't exist before the migration,
-- so this assumes 1 (the migration's default) for everyone.
--
-- One row per provider and moment where more units are busy than allowed,
-- with the bookings involved (ids, service, status, time — no customer data).

with active as (
  select b.id, b.provider_id, b.service_id, b.starts_at, b.ends_at, b.status,
         s.name_en as service, s.capacity > 1 as is_group
  from public.bookings b
  join public.services s on s.id = b.service_id
  where b.status in ('pending', 'confirmed')
),
units as (
  select provider_id, starts_at as u_start, ends_at as u_end,
         array[format('%s %s %s–%s (%s)', service, status,
                      to_char(starts_at at time zone 'Europe/London', 'HH24:MI'),
                      to_char(ends_at at time zone 'Europe/London', 'HH24:MI'), id)] as involved
  from active
  where not is_group
  union all
  select provider_id, starts_at, max(ends_at),
         array[format('%s (group, %s bookings) %s–%s', min(service), count(*),
                      to_char(starts_at at time zone 'Europe/London', 'HH24:MI'),
                      to_char(max(ends_at) at time zone 'Europe/London', 'HH24:MI'))]
  from active
  where is_group
  group by provider_id, service_id, starts_at
),
moments as (
  -- concurrency only rises at a start
  select distinct provider_id, u_start as t from units
),
busy as (
  select m.provider_id, m.t, count(*) as units_busy,
         array_agg(x order by x) as involved
  from moments m
  join units u on u.provider_id = m.provider_id and u.u_start <= m.t and u.u_end > m.t
  cross join lateral unnest(u.involved) as x
  group by m.provider_id, m.t
)
select p.slug,
       (b.t at time zone 'Europe/London') as moment_london,
       b.t > now() as in_future,
       b.units_busy,
       1 as parallel_capacity_assumed,
       b.involved
from busy b
join public.providers p on p.id = b.provider_id
where b.units_busy > 1
order by b.t > now() desc, p.slug, b.t;
