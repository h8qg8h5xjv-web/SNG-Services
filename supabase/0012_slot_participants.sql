-- 0012_slot_participants.sql
-- Phase 2 (DESIGN §5): on a group slot, show the people who opted in — name only,
-- never contacts. Bookings aren't publicly readable (RLS), so this SECURITY
-- DEFINER function is the single safe window: it returns ONLY customer_name for
-- bookings with is_visible_to_group = true on a given service + start time.
-- Presence only; nothing here lets anyone read phones, emails, or write.

create or replace function public.slot_participants(
  p_service_id uuid,
  p_starts_at timestamptz
)
returns table (name text)
language sql
security definer
set search_path = public
stable
as $$
  select customer_name
  from public.bookings
  where service_id = p_service_id
    and starts_at = p_starts_at
    and is_visible_to_group = true
    and status in ('pending', 'confirmed')
  order by created_at
$$;

revoke all on function public.slot_participants(uuid, timestamptz) from public;
grant execute on function public.slot_participants(uuid, timestamptz)
  to anon, authenticated, service_role;
