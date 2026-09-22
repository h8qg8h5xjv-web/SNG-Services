'use server'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

// §4 event attendance. Counts everyone; shows up to 5 initials of those visible
// to the group. Names never leave the server — only initials + a count do.

export type EventAttendance = { total: number; initials: string[] }

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2)
  return parts.map((p) => p[0]!.toUpperCase()).join('') || '•'
}

// Batched: one query for a whole list of events (avoids a call per card).
export async function getEventsAttendance(
  eventIds: string[],
): Promise<Map<string, EventAttendance>> {
  const out = new Map<string, EventAttendance>()
  if (eventIds.length === 0) return out
  const admin = createAdminClient()
  const { data } = await admin
    .from('event_attendees')
    .select('event_id, display_name, is_visible_to_group, created_at')
    .in('event_id', eventIds)
    .order('created_at', { ascending: true })

  for (const id of eventIds) out.set(id, { total: 0, initials: [] })
  for (const row of data ?? []) {
    const a = out.get(row.event_id)
    if (!a) continue
    a.total += 1
    if (row.is_visible_to_group && row.display_name && a.initials.length < 5) {
      a.initials.push(initialsOf(row.display_name))
    }
  }
  return out
}

export async function getEventAttendance(eventId: string): Promise<EventAttendance> {
  return (await getEventsAttendance([eventId])).get(eventId) ?? { total: 0, initials: [] }
}

// Guest "I'm going". Dedup per browser via the analytics session cookie. Visible
// members contribute an initial; name is optional (still counted).
export async function goingToEvent(
  eventId: string,
  name: string,
  visible: boolean,
): Promise<{ ok: boolean }> {
  const sid = (await cookies()).get('sng_sid')?.value
  if (!sid) return { ok: false }
  const admin = createAdminClient()
  const { error } = await admin.from('event_attendees').upsert(
    {
      event_id: eventId,
      session_id: sid,
      display_name: name.trim() ? name.trim().slice(0, 40) : null,
      is_visible_to_group: visible,
    },
    { onConflict: 'event_id,session_id' },
  )
  return { ok: !error }
}

export async function leaveEvent(eventId: string): Promise<{ ok: boolean }> {
  const sid = (await cookies()).get('sng_sid')?.value
  if (!sid) return { ok: false }
  const admin = createAdminClient()
  const { error } = await admin
    .from('event_attendees')
    .delete()
    .eq('event_id', eventId)
    .eq('session_id', sid)
  return { ok: !error }
}
