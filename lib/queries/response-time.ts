import { createAdminClient } from '@/lib/supabase/admin'

// "Отвечает за N мин" (§5): median minutes between a provider being notified of a
// request and responding, over the last 30 days. Honest signal — a provider with
// no samples returns nothing and the card shows nothing.
export async function getResponseMedians(
  providerIds: string[],
): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  if (providerIds.length === 0) return out
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()
  const { data } = await admin
    .from('request_targets')
    .select('provider_id, notified_at, responded_at')
    .in('provider_id', providerIds)
    .not('notified_at', 'is', null)
    .not('responded_at', 'is', null)
    .gte('notified_at', since)

  const samples = new Map<string, number[]>()
  for (const r of data ?? []) {
    if (!r.notified_at || !r.responded_at) continue
    const mins = (Date.parse(r.responded_at) - Date.parse(r.notified_at)) / 60000
    if (!Number.isFinite(mins) || mins < 0) continue
    const arr = samples.get(r.provider_id) ?? []
    arr.push(mins)
    samples.set(r.provider_id, arr)
  }

  for (const [id, arr] of samples) {
    arr.sort((a, b) => a - b)
    const mid = Math.floor(arr.length / 2)
    const median = arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2
    out.set(id, Math.max(1, Math.round(median)))
  }
  return out
}
