import { createAdminClient } from '@/lib/supabase/admin'

export type TrackEventType =
  | 'impression'
  | 'click'
  | 'booking_started'
  | 'booking_completed'

export type TrackEvent = {
  provider_id: string
  event_type: TrackEventType
  position?: number | null
  surface?: string | null
  category_id?: string | null
  locale?: string | null
}

const TYPES = new Set<TrackEventType>([
  'impression',
  'click',
  'booking_started',
  'booking_completed',
])
const UUID = /^[0-9a-fA-F-]{36}$/

/**
 * Writes analytics events. Best-effort: any failure is swallowed so logging can
 * never break a page for a user. Runs via the service role (RLS locks writes).
 */
export async function recordEvents(
  events: TrackEvent[],
  sessionId: string | null,
): Promise<void> {
  const clean = events.filter(
    (e) => e && UUID.test(e.provider_id) && TYPES.has(e.event_type),
  )
  if (clean.length === 0) return
  try {
    const supabase = createAdminClient()
    await supabase.from('provider_events').insert(
      clean.map((e) => ({
        provider_id: e.provider_id,
        event_type: e.event_type,
        position: e.position ?? null,
        surface: e.surface ?? null,
        category_id: e.category_id ?? null,
        locale: e.locale ?? null,
        session_id: sessionId,
      })),
    )
  } catch {
    // Never surface analytics errors to the request.
  }
}

/**
 * Logs an unrecognised free-text service search (REQUESTS 12.2) so gaps in the
 * text→category mapping are visible. No provider (provider_id null), the raw
 * query in search_query. Best-effort.
 */
export async function recordSearchEmpty(
  query: string,
  sessionId: string | null,
  locale: string | null,
): Promise<void> {
  try {
    const supabase = createAdminClient()
    await supabase.from('provider_events').insert({
      provider_id: null,
      event_type: 'search_empty',
      surface: 'home',
      search_query: query.slice(0, 200),
      locale,
      session_id: sessionId,
    })
  } catch {
    // Never surface analytics errors.
  }
}

/** Default analytics window: the last 30 days, as YYYY-MM-DD. */
export function defaultDateRange(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { from: fmt(from), to: fmt(now) }
}

export type ProviderStat = {
  providerId: string
  name: string
  impressions: number
  clicks: number
  bookings: number
  ctr: number
}

/** Aggregated impressions / clicks / CTR / bookings per provider over a period. */
export async function getProviderStats(
  fromIso: string,
  toIso: string,
): Promise<ProviderStat[]> {
  const supabase = createAdminClient()
  const [{ data: events }, { data: providers }] = await Promise.all([
    supabase
      .from('provider_events')
      .select('provider_id, event_type')
      .gte('occurred_at', fromIso)
      .lte('occurred_at', toIso),
    supabase.from('providers').select('id, name_en'),
  ])

  const names = new Map((providers ?? []).map((p) => [p.id, p.name_en]))
  const agg = new Map<string, { impressions: number; clicks: number; bookings: number }>()
  for (const e of events ?? []) {
    if (!e.provider_id) continue // search_empty rows have no provider
    const row = agg.get(e.provider_id) ?? { impressions: 0, clicks: 0, bookings: 0 }
    if (e.event_type === 'impression') row.impressions++
    else if (e.event_type === 'click') row.clicks++
    else if (e.event_type === 'booking_completed') row.bookings++
    agg.set(e.provider_id, row)
  }

  return [...agg.entries()]
    .map(([providerId, r]) => ({
      providerId,
      name: names.get(providerId) ?? providerId,
      impressions: r.impressions,
      clicks: r.clicks,
      bookings: r.bookings,
      ctr: r.impressions > 0 ? r.clicks / r.impressions : 0,
    }))
    .sort((a, b) => b.impressions - a.impressions)
}
