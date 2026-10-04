-- Contact-only updates skip the capacity checks (migration …39).
-- Run: npm run test:db  (supabase test db, local Docker only). Rolled back.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(5);

insert into categories (id, slug, name_en, name_ru, icon)
values ('00000000-0000-0000-0000-0000000004c1', 'zz-test-contact', 'Test', 'Тест', 'tool');
insert into providers (id, slug, name_en, description_en, category_id, borough, fulfillment_type, entity_type) values
  ('00000000-0000-0000-0000-0000000004a1', 'zz-contact-p', 'P', 'Fixture', '00000000-0000-0000-0000-0000000004c1', 'Camden', 'native_booking', 'pro');
insert into services (id, provider_id, name_en, duration_min, price_pence, capacity) values
  ('00000000-0000-0000-0000-0000000004e1', '00000000-0000-0000-0000-0000000004a1', 'Cut', 60, 2500, 1);

-- Two bookings that overlap under today's rules, as legacy rows made before the
-- guards existed (written with the trigger off, as old data would be).
set local session_replication_role = replica;
insert into bookings (id, service_id, provider_id, starts_at, ends_at, customer_name, customer_phone, customer_email, status, price_pence, duration_min) values
  ('00000000-0000-0000-0000-0000000004b1', '00000000-0000-0000-0000-0000000004e1', '00000000-0000-0000-0000-0000000004a1', '2026-01-05 10:00Z', '2026-01-05 11:00Z', 'Old A', '0700', 'a@example.test', 'confirmed', 2500, 60),
  ('00000000-0000-0000-0000-0000000004b2', '00000000-0000-0000-0000-0000000004e1', '00000000-0000-0000-0000-0000000004a1', '2026-01-05 10:00Z', '2026-01-05 11:00Z', 'Old B', '0701', null, 'confirmed', 2500, 60);
set local session_replication_role = origin;

select lives_ok(
  $$update bookings set customer_name = '', customer_phone = '', customer_email = null where id = '00000000-0000-0000-0000-0000000004b1'$$,
  'wiping contacts on an overlapping legacy booking works');
select is((select customer_name || '|' || customer_phone || '|' || coalesce(customer_email, 'null') from bookings where id = '00000000-0000-0000-0000-0000000004b1'),
  '||null', 'contacts are cleared, the booking stays');
select throws_ok(
  $$update bookings set starts_at = '2026-01-05 10:30Z', ends_at = '2026-01-05 11:30Z' where id = '00000000-0000-0000-0000-0000000004b1'$$,
  '23514', null, 'moving it in time is still checked');
update bookings set status = 'cancelled' where id = '00000000-0000-0000-0000-0000000004b1';
select throws_ok(
  $$update bookings set status = 'pending' where id = '00000000-0000-0000-0000-0000000004b1'$$,
  '23514', null, 're-activating it is still checked');
select throws_ok(
  $$insert into bookings (service_id, starts_at, ends_at, customer_name, customer_phone)
    values ('00000000-0000-0000-0000-0000000004e1', '2026-01-05 10:00Z', '2026-01-05 11:00Z', 'New', '0702')$$,
  '23514', null, 'a new booking into the full slot is still rejected');

select * from finish();
rollback;
