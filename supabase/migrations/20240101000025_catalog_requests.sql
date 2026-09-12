-- 20240101000025_catalog_requests.sql
-- "Get into the catalog" leads from the public /for-business page. Registration
-- stays invite-only (a provider card is never self-created), so this is just a
-- request that lands in the admin queue — not a provider row. No client contacts
-- or catalog data here; it's the business's own contact details, which they
-- submit themselves.

create table public.catalog_requests (
  id             uuid primary key default gen_random_uuid(),
  business_name  text not null,
  contact_name   text not null,
  contact_email  text,
  contact_phone  text,
  category       text,
  borough        text,
  message        text,
  status         text not null default 'new'
                   check (status in ('new', 'handled', 'dismissed')),
  created_at     timestamptz not null default now()
);

create index idx_catalog_requests_status on public.catalog_requests (status, created_at desc);

-- RLS: admin-only visibility and management. Inserts happen server-side with the
-- service role (which bypasses RLS), exactly like guest request/booking writes —
-- so no anon policy is needed, and the default SELECT grant to anon is still
-- denied here because no policy matches it.
alter table public.catalog_requests enable row level security;

create policy catalog_requests_admin_all on public.catalog_requests
  for all using (public.is_admin()) with check (public.is_admin());
