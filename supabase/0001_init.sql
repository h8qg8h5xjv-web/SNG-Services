-- 0001_init.sql
-- Extensions and shared helper functions.
-- gen_random_uuid() is in core Postgres since 13 (Supabase runs 15+), no extension needed.

-- Keeps updated_at fresh on any row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Admin check for RLS. An admin is an authenticated user whose JWT carries
-- app_metadata.is_admin = true. service_role bypasses RLS entirely, so this
-- only matters for human admins signed in via Supabase Auth (see PROMPTS step 6).
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select coalesce(
    (
      nullif(current_setting('request.jwt.claims', true), '')::jsonb
        -> 'app_metadata' ->> 'is_admin'
    )::boolean,
    false
  );
$$;
