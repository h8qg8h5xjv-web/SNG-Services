-- 20240101000022_grant_audit.sql
-- Grant audit for anon / authenticated.
--
-- Background: 0008_rls ran `grant select on all tables …` and `grant
-- insert/update/delete on all tables …` once, over the tables that existed then.
-- `on all tables` is a snapshot — it does NOT cover tables added later. 0013 added
-- `alter default privileges` for anon/authenticated, which does cover future
-- tables, BUT default privileges are scoped to the role that ran them (here:
-- postgres). Any table created in production by a different owner role silently
-- misses the grants and falls back to whatever the project defaults are.
--
-- This migration removes that dependency: it re-grants the intended privileges to
-- every existing table explicitly (idempotent — a no-op where already present),
-- and re-affirms the default privileges so future tables inherit them regardless
-- of project settings.
--
-- Intended model: anon may SELECT only (RLS still limits it to published rows);
-- authenticated may read and write (RLS still limits which rows — admin-only for
-- most tables). This migration only GRANTs, never REVOKEs, so the deliberate anon
-- INSERT grants for guest flows (bookings, requests, request_contacts,
-- request_windows — see 0014/0015) are preserved untouched.

grant usage on schema public to anon, authenticated;

grant select on all tables in schema public to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;

alter default privileges in schema public
  grant select on tables to anon;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
