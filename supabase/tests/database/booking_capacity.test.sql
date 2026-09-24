-- Capacity guard on bookings (enforce_booking_rules, migration …35).
-- Run: npm run test:db  (supabase test db, local Docker only).
-- Self-contained fixtures; everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into categories (id, slug, name_en, name_ru, icon)
values ('00000000-0000-0000-0000-0000000000c1', 'zz-test-capacity', 'Test', 'Тест', 'tool');

insert into providers (id, slug, name_en, description_en, category_id, borough, fulfillment_type, entity_type)
values ('00000000-0000-0000-0000-0000000000a1', 'zz-test-capacity-provider', 'Test provider',
        'Fixture', '00000000-0000-0000-0000-0000000000c1', 'Camden', 'native_booking', 'place');

-- s1: one person per slot. s2: group of two.
insert into services (id, provider_id, name_en, duration_min, price_pence, capacity) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000a1', 'Single', 60, 2500, 1),
  ('00000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-0000000000a1', 'Group', 60, 1000, 2);

-- 1. First pending booking takes the single slot.
select lives_ok(
  $$insert into bookings (id, service_id, starts_at, ends_at, customer_name, customer_phone)
    values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1',
            '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'Guest A', '07123456789')$$,
  'first pending booking for a free slot is accepted'
);

-- 2. The core regression: a second pending booking for the same full slot.
select throws_ok(
  $$insert into bookings (service_id, starts_at, ends_at, customer_name, customer_phone)
    values ('00000000-0000-0000-0000-0000000000e1',
            '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'Guest B', '07123456780')$$,
  '23514', null,
  'second pending booking for the same full slot is rejected'
);

-- 3. A partly overlapping booking is rejected too.
select throws_ok(
  $$insert into bookings (service_id, starts_at, ends_at, customer_name, customer_phone)
    values ('00000000-0000-0000-0000-0000000000e1',
            '2030-01-07 10:30Z', '2030-01-07 11:30Z', 'Guest C', '07123456781')$$,
  '23514', null,
  'overlapping pending booking is rejected'
);

-- 4. The next slot is independent.
select lives_ok(
  $$insert into bookings (service_id, starts_at, ends_at, customer_name, customer_phone)
    values ('00000000-0000-0000-0000-0000000000e1',
            '2030-01-07 11:00Z', '2030-01-07 12:00Z', 'Guest D', '07123456782')$$,
  'booking for the adjacent non-overlapping slot is accepted'
);

-- 5. Confirmed + pending: confirming the holder, then a new pending is still rejected.
update bookings set status = 'confirmed' where id = '00000000-0000-0000-0000-0000000000b1';
select throws_ok(
  $$insert into bookings (service_id, starts_at, ends_at, customer_name, customer_phone, status)
    values ('00000000-0000-0000-0000-0000000000e1',
            '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'Guest E', '07123456783', 'pending')$$,
  '23514', null,
  'pending booking is rejected when a confirmed one fills the slot'
);

-- 6. Cancelled bookings free the slot.
update bookings set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000000b1';
select lives_ok(
  $$insert into bookings (service_id, starts_at, ends_at, customer_name, customer_phone)
    values ('00000000-0000-0000-0000-0000000000e1',
            '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'Guest F', '07123456784')$$,
  'slot freed by a cancellation can be booked again'
);

-- 7–8. Group capacity 2: two single seats fit, a third is rejected.
select lives_ok(
  $$insert into bookings (service_id, starts_at, ends_at, customer_name, customer_phone) values
      ('00000000-0000-0000-0000-0000000000e2', '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'Guest G', '07123456785'),
      ('00000000-0000-0000-0000-0000000000e2', '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'Guest H', '07123456786')$$,
  'group slot accepts bookings up to its capacity'
);
select throws_ok(
  $$insert into bookings (service_id, starts_at, ends_at, customer_name, customer_phone)
    values ('00000000-0000-0000-0000-0000000000e2',
            '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'Guest I', '07123456787')$$,
  '23514', null,
  'group slot rejects a booking beyond its capacity'
);

select * from finish();
rollback;
