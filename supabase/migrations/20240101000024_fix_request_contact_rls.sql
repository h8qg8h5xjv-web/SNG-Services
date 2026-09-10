-- 20240101000024_fix_request_contact_rls.sql
-- Security fix. request_contacts (and request_windows) had a single FOR ALL write
-- policy whose USING clause was `is_admin() OR request_is_mine_or_guest(id)`.
-- request_is_mine_or_guest is true for EVERY guest request (customer_id is null),
-- and a FOR ALL policy's USING also governs SELECT — so any authenticated user
-- could read the contacts (name, phone, email, address, postcode) of every guest
-- request, before any match. That defeats REQUESTS §8/§12.1 ("contacts revealed
-- only to the winner after a match"). Discovered when the business cabinet became
-- the first authenticated reader of these tables.
--
-- Fix: keep the broad guest/owner access for INSERT only (so guests can still
-- attach their contacts at creation), and restrict UPDATE/DELETE to owner/admin.
-- SELECT is untouched — it stays admin OR owner OR matched-member.

-- request_contacts: the sensitive one.
drop policy request_contacts_write on public.request_contacts;

create policy request_contacts_insert on public.request_contacts
  for insert with check (public.is_admin() or public.request_is_mine_or_guest(request_id));
create policy request_contacts_update on public.request_contacts
  for update using (public.is_admin() or public.is_request_owner(request_id))
  with check (public.is_admin() or public.is_request_owner(request_id));
create policy request_contacts_delete on public.request_contacts
  for delete using (public.is_admin() or public.is_request_owner(request_id));

-- request_windows: times aren't PII, but the same FOR ALL shape leaked SELECT to
-- any authenticated user. Keep it consistent — SELECT stays admin/owner/target.
drop policy request_windows_write on public.request_windows;

create policy request_windows_insert on public.request_windows
  for insert with check (public.is_admin() or public.request_is_mine_or_guest(request_id));
create policy request_windows_update on public.request_windows
  for update using (public.is_admin() or public.is_request_owner(request_id))
  with check (public.is_admin() or public.is_request_owner(request_id));
create policy request_windows_delete on public.request_windows
  for delete using (public.is_admin() or public.is_request_owner(request_id));
