-- Guest/customer access to bookings (migration …38).
-- Run: npm run test:db  (supabase test db, local Docker only). Rolled back.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(10);

insert into categories (id, slug, name_en, name_ru, icon)
values ('00000000-0000-0000-0000-0000000003c1', 'zz-test-guest', 'Test', 'Тест', 'tool');
insert into providers (id, slug, name_en, description_en, category_id, borough, fulfillment_type, entity_type) values
  ('00000000-0000-0000-0000-0000000003a1', 'zz-guest-p', 'P', 'Fixture', '00000000-0000-0000-0000-0000000003c1', 'Camden', 'native_booking', 'pro');
insert into services (id, provider_id, name_en, duration_min, price_pence, capacity) values
  ('00000000-0000-0000-0000-0000000003e1', '00000000-0000-0000-0000-0000000003a1', 'Cut', 60, 2500, 1);
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000003f1', 'customer@example.test'),
  ('00000000-0000-0000-0000-0000000003f2', 'stranger@example.test'),
  ('00000000-0000-0000-0000-0000000003f3', 'owner@example.test');
insert into provider_members (provider_id, user_id, role)
values ('00000000-0000-0000-0000-0000000003a1', '00000000-0000-0000-0000-0000000003f3', 'owner');

insert into bookings (id, service_id, starts_at, ends_at, customer_name, customer_phone, customer_id) values
  ('00000000-0000-0000-0000-0000000003b1', '00000000-0000-0000-0000-0000000003e1', '2030-03-04 10:00Z', '2030-03-04 11:00Z', 'Guest', '0700', null),
  ('00000000-0000-0000-0000-0000000003b2', '00000000-0000-0000-0000-0000000003e1', '2030-03-04 12:00Z', '2030-03-04 13:00Z', 'Customer', '0701', '00000000-0000-0000-0000-0000000003f1');

-- Every booking gets its own reference and a 64-hex token from the database.
select is((select count(distinct public_ref)::int from bookings where service_id = '00000000-0000-0000-0000-0000000003e1'), 2, 'each booking has its own public_ref');
select ok((select bool_and(guest_token ~ '^[0-9a-f]{64}$') from bookings where service_id = '00000000-0000-0000-0000-0000000003e1'), 'guest_token is 64 hex chars');
select throws_ok(
  $$update bookings set public_ref = (select public_ref from bookings where id = '00000000-0000-0000-0000-0000000003b2') where id = '00000000-0000-0000-0000-0000000003b1'$$,
  '23505', null, 'public_ref is unique');

-- Nobody without a role on the row can read it — the ref alone gives nothing.
set local role anon;
select is((select count(*)::int from bookings), 0, 'anon reads no bookings');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000003f2", "role": "authenticated"}';
select is((select count(*)::int from bookings where service_id = '00000000-0000-0000-0000-0000000003e1'), 0, 'a stranger reads none of them');

-- The customer reads their own booking, but can no longer change it.
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000003f1", "role": "authenticated"}';
select is((select count(*)::int from bookings where service_id = '00000000-0000-0000-0000-0000000003e1'), 1, 'the customer reads only their own booking');
update bookings set status = 'confirmed' where id = '00000000-0000-0000-0000-0000000003b2';
reset role;
select is((select status from bookings where id = '00000000-0000-0000-0000-0000000003b2'), 'pending', 'the customer cannot confirm their own booking');

-- The provider still manages bookings on their card.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000003f3", "role": "authenticated"}';
select is((select count(*)::int from bookings where service_id = '00000000-0000-0000-0000-0000000003e1'), 2, 'the provider reads bookings on their card');
update bookings set status = 'confirmed' where id = '00000000-0000-0000-0000-0000000003b2';
reset role;
select is((select status from bookings where id = '00000000-0000-0000-0000-0000000003b2'), 'confirmed', 'the provider can confirm a booking');

-- The old policy (customer could update) would have let the customer through:
-- re-check that with the customer again after the provider's change.
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000003f1", "role": "authenticated"}';
update bookings set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000003b2';
reset role;
select is((select status from bookings where id = '00000000-0000-0000-0000-0000000003b2'), 'confirmed', 'the customer cannot cancel it either (no customer UPDATE)');

select * from finish();
rollback;
