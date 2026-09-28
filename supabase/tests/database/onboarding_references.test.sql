-- Onboarding reference data (migration …37).
-- Run: npm run test:db  (supabase test db, local Docker only). Rolled back.

begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

select is((select count(*)::int from boroughs), 33, 'boroughs: 32 London boroughs + the City of London');
select ok(exists (select 1 from boroughs where name = 'City of Westminster'), 'spelt as the existing data spells it');

-- Anyone may read the list; only an admin may change it.
set local role anon;
select is((select count(*)::int from boroughs), 33, 'anon can read boroughs');
select throws_ok($$insert into boroughs (name) values ('Atlantis')$$, '42501', null, 'anon cannot add a borough');
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-0000000002f1", "role": "authenticated"}';
select throws_ok($$insert into boroughs (name) values ('Atlantis')$$, '42501', null, 'a signed-in non-admin cannot add a borough');
reset role;

select throws_ok(
  $$insert into catalog_requests (business_name, contact_name, contact_phone, category_suggestion)
    values ('B', 'C', '0', repeat('x', 201))$$,
  '23514', null, 'a category suggestion is capped at 200 characters');

select * from finish();
rollback;
