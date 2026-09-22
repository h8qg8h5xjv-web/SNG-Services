-- 20240101000027_travels_to_client.sql
-- Competitor-analysis idea #5: a "home visits" filter on the category page.
-- A provider (a pro who travels, or a mobile place) can indicate they come to
-- the client. Default false; editable in the admin and in the master's cabinet.
-- No entity_type restriction: a mobile place can travel too.
alter table public.providers
  add column travels_to_client boolean not null default false;
