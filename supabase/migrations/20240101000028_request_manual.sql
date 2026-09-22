-- 20240101000028_request_manual.sql
-- §1 Protection from emptiness: when fewer than REQUEST_MIN_TARGETS eligible
-- masters exist, a request is NOT broadcast. It is created with status 'manual'
-- so it never enters the wave job (which only touches 'broadcasting'), lands in
-- the admin queue, and the client sees an honest "we'll pass it on by hand"
-- screen. An admin who hands it off marks it 'handled' and records to whom.

alter table public.requests drop constraint if exists requests_status_check;
alter table public.requests
  add constraint requests_status_check check (
    status in (
      'draft', 'broadcasting', 'matched', 'confirmed',
      'expired', 'cancelled', 'completed', 'manual', 'handled'
    )
  );

alter table public.requests
  add column manual_handled_at timestamptz,
  add column manual_handled_to text;
