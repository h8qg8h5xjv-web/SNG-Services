-- Provider-level overlap guard (enforce_booking_rules, migration …36).
-- Run: npm run test:db  (supabase test db, local Docker only).
-- Self-contained fixtures; everything is rolled back.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(16);

insert into categories (id, slug, name_en, name_ru, icon)
values ('00000000-0000-0000-0000-0000000001c1', 'zz-test-overlap', 'Test', 'Тест', 'tool');

-- p1: solo master (parallel_capacity 1) with two individual services.
-- p2: salon with two chairs (parallel_capacity 2), two individual services.
-- p3: solo coach with an individual service and a group class of 3.
insert into providers (id, slug, name_en, description_en, category_id, borough, fulfillment_type, entity_type, parallel_capacity) values
  ('00000000-0000-0000-0000-0000000001a1', 'zz-solo', 'Solo', 'Fixture', '00000000-0000-0000-0000-0000000001c1', 'Camden', 'native_booking', 'pro', 1),
  ('00000000-0000-0000-0000-0000000001a2', 'zz-salon', 'Salon', 'Fixture', '00000000-0000-0000-0000-0000000001c1', 'Camden', 'native_booking', 'place', 2),
  ('00000000-0000-0000-0000-0000000001a3', 'zz-coach', 'Coach', 'Fixture', '00000000-0000-0000-0000-0000000001c1', 'Camden', 'native_booking', 'pro', 1);

insert into services (id, provider_id, name_en, duration_min, price_pence, capacity) values
  ('00000000-0000-0000-0000-0000000001e1', '00000000-0000-0000-0000-0000000001a1', 'Cut', 60, 2500, 1),
  ('00000000-0000-0000-0000-0000000001e2', '00000000-0000-0000-0000-0000000001a1', 'Beard', 60, 1500, 1),
  ('00000000-0000-0000-0000-0000000001e3', '00000000-0000-0000-0000-0000000001a2', 'Cut', 60, 2500, 1),
  ('00000000-0000-0000-0000-0000000001e4', '00000000-0000-0000-0000-0000000001a2', 'Colour', 60, 4500, 1),
  ('00000000-0000-0000-0000-0000000001e5', '00000000-0000-0000-0000-0000000001a3', 'Personal', 60, 4000, 1),
  ('00000000-0000-0000-0000-0000000001e6', '00000000-0000-0000-0000-0000000001a3', 'Class', 60, 1000, 3),
  -- third services, so the "rejected" cases can only fail on the provider rule
  ('00000000-0000-0000-0000-0000000001e7', '00000000-0000-0000-0000-0000000001a1', 'Brows', 60, 1200, 1),
  ('00000000-0000-0000-0000-0000000001e8', '00000000-0000-0000-0000-0000000001a2', 'Nails', 60, 3000, 1);

create function pg_temp.book(svc text, s text, e text, who text, st text default 'pending', id text default null)
returns void language sql as $$
  insert into bookings (id, service_id, starts_at, ends_at, customer_name, customer_phone, status)
  values (coalesce(id::uuid, gen_random_uuid()), svc::uuid, s::timestamptz, e::timestamptz, who, '07123456789', st)
$$;

-- ── Solo master: two services at the same time ──
select lives_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e1', '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'A', 'pending', '00000000-0000-0000-0000-0000000001b1')$$,
  'solo: first booking (Cut 10:00) is accepted');
select throws_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e2', '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'B')$$,
  '23514', null, 'solo: another service at the same time is rejected');
select throws_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e7', '2030-01-07 10:30Z', '2030-01-07 11:30Z', 'C')$$,
  '23514', null, 'solo: a partly overlapping other service is rejected');
select lives_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e2', '2030-01-07 11:00Z', '2030-01-07 12:00Z', 'D')$$,
  'solo: other service right after (touching, no overlap) is accepted');
update bookings set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000001b1';
select lives_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e2', '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'E')$$,
  'solo: a cancellation frees the provider for another service');
select throws_ok($$update bookings set status = 'confirmed' where id = '00000000-0000-0000-0000-0000000001b1'$$,
  '23514', null, 'solo: re-activating the cancelled booking over a new one is rejected');

-- ── Salon with parallel_capacity 2 ──
select lives_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e3', '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'F')$$,
  'salon: first booking at 10:00 is accepted');
select lives_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e4', '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'G')$$,
  'salon (capacity 2): a second booking at the same time is accepted');
select throws_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e8', '2030-01-07 10:30Z', '2030-01-07 11:30Z', 'H')$$,
  '23514', null, 'salon: a third overlapping booking is rejected');
-- Peak, not a count: 12:00–13:00 and 13:00–14:00 never overlap each other, so
-- 12:30–13:30 meets at most one of them at any moment and fits in capacity 2.
select lives_ok($$
  select pg_temp.book('00000000-0000-0000-0000-0000000001e3', '2030-01-07 12:00Z', '2030-01-07 13:00Z', 'I');
  select pg_temp.book('00000000-0000-0000-0000-0000000001e3', '2030-01-07 13:00Z', '2030-01-07 14:00Z', 'J');
  select pg_temp.book('00000000-0000-0000-0000-0000000001e4', '2030-01-07 12:30Z', '2030-01-07 13:30Z', 'K')$$,
  'salon: a booking overlapping two back-to-back ones fits (peak 2, not 3 overlaps)');

-- ── Group class plus individual overlap (solo coach) ──
select lives_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e6', '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'L')$$,
  'coach: first seat in the 10:00 class is accepted');
select lives_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e6', '2030-01-07 10:00Z', '2030-01-07 11:00Z', 'M')$$,
  'coach: a second seat in the same class needs no new unit');
select throws_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e5', '2030-01-07 10:30Z', '2030-01-07 11:30Z', 'N')$$,
  '23514', null, 'coach: an individual session during the booked class is rejected');
select pg_temp.book('00000000-0000-0000-0000-0000000001e5', '2030-01-07 14:00Z', '2030-01-07 15:00Z', 'O');
select throws_ok($$select pg_temp.book('00000000-0000-0000-0000-0000000001e6', '2030-01-07 14:00Z', '2030-01-07 15:00Z', 'P')$$,
  '23514', null, 'coach: an empty class cannot start over an individual booking');

-- ── Only an admin changes parallel_capacity ──
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000001f1', 'owner@example.test');
insert into provider_members (provider_id, user_id, role)
values ('00000000-0000-0000-0000-0000000001a1', '00000000-0000-0000-0000-0000000001f1', 'owner');
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000001f1", "role": "authenticated"}';
select throws_ok($$update providers set parallel_capacity = 3 where id = '00000000-0000-0000-0000-0000000001a1'$$,
  '42501', null, 'an owner cannot raise their own parallel_capacity');
select lives_ok($$update providers set borough = 'Islington' where id = '00000000-0000-0000-0000-0000000001a1'$$,
  'an owner can still edit other fields of their card');
reset role;

select * from finish();
rollback;
