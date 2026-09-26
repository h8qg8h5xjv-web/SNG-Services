// Booking lead time = starts_at − created_at: how far ahead people book. Pure
// maths over rows from the bookings table (lib/admin/lead-time.ts loads them).

export type LeadRow = { category: string | null; startsAt: string; createdAt: string }
export type LeadStat = { category: string; n: number; p25: number; median: number; p75: number } // ms

// Linear interpolation between closest ranks (the usual "type 7" quantile).
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)
}

function stat(category: string, values: number[]): LeadStat {
  const v = [...values].sort((a, b) => a - b)
  return { category, n: v.length, p25: quantile(v, 0.25), median: quantile(v, 0.5), p75: quantile(v, 0.75) }
}

// Per category (most bookings first, uncategorised last) plus an overall row. Rows with an
// unparseable date or a start before creation (data entered after the fact)
// are left out rather than counted as zero.
export function leadTimeStats(rows: LeadRow[]): { overall: LeadStat | null; byCategory: LeadStat[] } {
  const groups = new Map<string, number[]>()
  const all: number[] = []
  for (const r of rows) {
    const lead = Date.parse(r.startsAt) - Date.parse(r.createdAt)
    if (!Number.isFinite(lead) || lead < 0) continue
    const key = r.category ?? '—'
    ;(groups.get(key) ?? groups.set(key, []).get(key)!).push(lead)
    all.push(lead)
  }
  const byCategory = [...groups.entries()]
    .map(([c, v]) => stat(c, v))
    .sort((a, b) => Number(a.category === '—') - Number(b.category === '—') || b.n - a.n || a.category.localeCompare(b.category))
  return { overall: all.length ? stat('all', all) : null, byCategory }
}

// "3 ч", "1,5 дн" — compact, for the admin table.
export function formatLead(ms: number): string {
  const h = ms / 3_600_000
  if (h < 1) return `${Math.round(ms / 60_000)} мин`
  if (h < 48) return `${h < 10 ? h.toFixed(1).replace('.', ',') : Math.round(h)} ч`
  const d = h / 24
  return `${d < 10 ? d.toFixed(1).replace('.', ',') : Math.round(d)} дн`
}
