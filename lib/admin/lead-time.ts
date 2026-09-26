import { createAdminClient } from '@/lib/supabase/admin'
import { leadTimeStats, type LeadRow, type LeadStat } from './lead-time-stats'

type Row = { starts_at: string; created_at: string; providers: { categories: { slug: string } | null } | null }

/**
 * Booking lead time (starts_at − created_at) by category over bookings created
 * in the last `days` days. Straight from the bookings table, no schema change;
 * cancelled bookings are left out. Service-role read — admin pages only.
 */
export async function getBookingLeadTimes(days = 30): Promise<{ overall: LeadStat | null; byCategory: LeadStat[] }> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - days * 86_400_000).toISOString()
  const rows: LeadRow[] = []
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('bookings')
      .select('starts_at, created_at, providers(categories(slug))')
      .gte('created_at', since)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)
      .returns<Row[]>()
    if (error || !data) break
    for (const r of data) rows.push({ category: r.providers?.categories?.slug ?? null, startsAt: r.starts_at, createdAt: r.created_at })
    if (data.length < PAGE) break
  }
  return leadTimeStats(rows)
}
