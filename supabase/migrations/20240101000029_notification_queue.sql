-- 20240101000029_notification_queue.sql
-- §5: until email/SMS is wired, every master notification is also written here so
-- an admin can send it by hand (WhatsApp) from the admin queue. The live channel
-- fans out to the ConsoleChannel AND this table; call sites are untouched. When
-- Resend is ready it becomes another channel and this one can be dropped.
-- Rows carry NO client contacts — same broadcast-safe content as the message.

create table public.notification_queue (
  id               uuid primary key default gen_random_uuid(),
  provider_id      uuid references public.providers(id) on delete set null,
  provider_name    text,
  recipient_phone  text,
  recipient_emails text[],
  kind             text,
  request_ref      text,
  subject          text not null,
  body             text not null,
  cta_path         text,
  status           text not null default 'unsent'
                     check (status in ('unsent', 'sent')),
  created_at       timestamptz not null default now(),
  sent_at          timestamptz
);

create index idx_notification_queue_status
  on public.notification_queue (status, created_at desc);

-- Admin-only, like catalog_requests. Writes happen server-side via the service
-- role (bypasses RLS); admins read/manage through this policy. Default privileges
-- (migration 0013) already grant the table to service_role/authenticated.
alter table public.notification_queue enable row level security;

create policy notification_queue_admin_all on public.notification_queue
  for all using (public.is_admin()) with check (public.is_admin());
