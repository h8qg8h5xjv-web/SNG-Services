import { createAdminClient } from '@/lib/supabase/admin'

// §10 admin home: a 7-day operational snapshot + catalogue counters. Admin-gated
// by the dashboard layout; service role.

export type EmptySearch = { query: string; at: string }
export type TopCard = { providerId: string; name: string; views: number }

export type AdminOverview = {
  views: number
  contacts: number
  topCards: TopCard[]
  emptySearches: EmptySearch[]
  newCatalogRequests: number
  manualRequests: number
  unsentNotifications: number
  published: number
  drafts: number
  unclaimed: number
}

export async function getAdminOverview(days = 7): Promise<AdminOverview> {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [events, searches, catalogNew, manual, unsent, providers] = await Promise.all([
    supabase
      .from('provider_events')
      .select('provider_id, event_type')
      .gte('occurred_at', since)
      .in('event_type', ['click', 'contact_reveal']),
    supabase
      .from('provider_events')
      .select('search_query, occurred_at')
      .eq('event_type', 'search_empty')
      .gte('occurred_at', since)
      .order('occurred_at', { ascending: false })
      .limit(20),
    supabase
      .from('catalog_requests')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'new'),
    supabase.from('requests').select('id', { count: 'exact', head: true }).eq('status', 'manual'),
    supabase
      .from('notification_queue')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'unsent'),
    supabase.from('providers').select('status, claim_status'),
  ])

  const rows = events.data ?? []
  const views = rows.filter((e) => e.event_type === 'click').length
  const contacts = rows.filter((e) => e.event_type === 'contact_reveal').length

  const viewsByProvider = new Map<string, number>()
  for (const e of rows) {
    if (e.event_type === 'click' && e.provider_id) {
      viewsByProvider.set(e.provider_id, (viewsByProvider.get(e.provider_id) ?? 0) + 1)
    }
  }
  const topIds = [...viewsByProvider.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
  let topCards: TopCard[] = []
  if (topIds.length > 0) {
    const { data: names } = await supabase
      .from('providers')
      .select('id, name_en')
      .in(
        'id',
        topIds.map(([id]) => id),
      )
    const byId = new Map((names ?? []).map((p) => [p.id, p.name_en]))
    topCards = topIds.map(([id, count]) => ({
      providerId: id,
      name: byId.get(id) ?? id,
      views: count,
    }))
  }

  const emptySearches: EmptySearch[] = (searches.data ?? [])
    .filter((s) => s.search_query && s.search_query.trim())
    .map((s) => ({ query: s.search_query as string, at: s.occurred_at }))

  const provs = providers.data ?? []
  return {
    views,
    contacts,
    topCards,
    emptySearches,
    newCatalogRequests: catalogNew.count ?? 0,
    manualRequests: manual.count ?? 0,
    unsentNotifications: unsent.count ?? 0,
    published: provs.filter((p) => p.status === 'published').length,
    drafts: provs.filter((p) => p.status !== 'published').length,
    unclaimed: provs.filter((p) => p.claim_status === 'unclaimed').length,
  }
}
