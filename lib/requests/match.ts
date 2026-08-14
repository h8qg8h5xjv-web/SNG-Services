import { neighboursOf } from './boroughs'

// Pure wave-matching (REQUESTS §5). Input: a request, the wave number, the
// candidate provider pool, and `now`. Output: the provider ids to target in
// THIS wave. No DB access — the caller fetches candidates and persists targets.

export type MatchProvider = {
  id: string
  category_id: string
  borough: string
  // Cheapest service price; null when unknown (don't exclude on price).
  min_price_pence: number | null
  broadcast_paused_until: string | null
}

export type MatchRequest = {
  type: 'fixed' | 'quote'
  category_id: string
  borough: string
  budget_max_pence: number | null
  target_provider_id: string | null
}

function notPaused(p: MatchProvider, now: Date): boolean {
  return !p.broadcast_paused_until || new Date(p.broadcast_paused_until) <= now
}

function withinBudget(p: MatchProvider, budget: number | null, factor: number): boolean {
  if (budget == null) return true
  if (p.min_price_pence == null) return true
  return p.min_price_pence <= budget * factor
}

function overBudget(p: MatchProvider, budget: number | null): boolean {
  if (budget == null || p.min_price_pence == null) return false
  return p.min_price_pence > budget
}

export function matchProviders(
  request: MatchRequest,
  wave: number,
  providers: MatchProvider[],
  now: Date,
): string[] {
  // Specific-master mode: only that provider, only in wave 1.
  if (request.target_provider_id) {
    if (wave !== 1) return []
    const p = providers.find((x) => x.id === request.target_provider_id)
    if (!p || !notPaused(p, now)) return []
    return [p.id]
  }

  const base = providers.filter(
    (p) => p.category_id === request.category_id && notPaused(p, now),
  )
  const budget = request.budget_max_pence
  const same = (p: MatchProvider) => p.borough === request.borough
  const neighbour = (p: MatchProvider) =>
    neighboursOf(request.borough).includes(p.borough)

  let selected: MatchProvider[]
  switch (wave) {
    case 1: // same borough, within budget
      selected = base.filter((p) => same(p) && withinBudget(p, budget, 1))
      break
    case 2: // neighbouring boroughs, within budget
      selected = base.filter((p) => neighbour(p) && withinBudget(p, budget, 1))
      break
    case 3: // same or neighbour, budget < price <= budget + 25% (the above-budget band)
      selected = base.filter(
        (p) =>
          (same(p) || neighbour(p)) &&
          overBudget(p, budget) &&
          withinBudget(p, budget, 1.25),
      )
      break
    default:
      selected = []
  }
  return selected.map((p) => p.id)
}
