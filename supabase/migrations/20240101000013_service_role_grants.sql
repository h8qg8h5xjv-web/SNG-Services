-- 20240101000013_service_role_grants.sql
-- Fix: the seed script and privileged server code use the service_role key.
-- service_role bypasses RLS but NOT table-level GRANTs. The RLS migration
-- (…08_rls) granted schema USAGE and table privileges to anon and authenticated
-- only — it never granted them to service_role and set no default privileges —
-- so on a setup that doesn't hand service_role blanket access, writes failed with
-- "permission denied for table …". Grant service_role explicitly, and set default
-- privileges so tables added by future migrations keep the grants automatically.

-- service_role: full access (RLS is its only gate elsewhere; here we need GRANTs).
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all functions in schema public to service_role;

-- Re-affirm the intended public access (idempotent): anon and authenticated may
-- USE the schema and SELECT; only authenticated may write (RLS still restricts
-- which rows — admin-only). anon keeps read-only, cannot write.
grant usage on schema public to anon, authenticated;
grant select on all tables in schema public to anon, authenticated;
grant insert, update, delete on all tables in schema public to authenticated;

-- Future objects created by the migration owner inherit the same grants, so this
-- never silently breaks again when a new table is added.
alter default privileges in schema public
  grant all on tables to service_role;
alter default privileges in schema public
  grant all on sequences to service_role;
alter default privileges in schema public
  grant all on functions to service_role;
alter default privileges in schema public
  grant select on tables to anon, authenticated;
alter default privileges in schema public
  grant insert, update, delete on tables to authenticated;
