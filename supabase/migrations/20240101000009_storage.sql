-- 0009_storage.sql
-- Public 'images' bucket for provider/event photos. Anyone can read; only admins
-- can write (matches the content RLS). service_role bypasses these anyway.

insert into storage.buckets (id, name, public)
values ('images', 'images', true)
on conflict (id) do nothing;

create policy "images public read"
  on storage.objects for select
  using (bucket_id = 'images');

create policy "images admin insert"
  on storage.objects for insert
  with check (bucket_id = 'images' and public.is_admin());

create policy "images admin update"
  on storage.objects for update
  using (bucket_id = 'images' and public.is_admin())
  with check (bucket_id = 'images' and public.is_admin());

create policy "images admin delete"
  on storage.objects for delete
  using (bucket_id = 'images' and public.is_admin());
