import { createClient } from '@/lib/supabase/server'

export type PriceGuide = { p10: number; p90: number; sample: number }

// REQUESTS §9: show the market fact, not a slider. Percentiles 10 and 90 (so one
// outlier can't stretch the range) over comparable services — same category and
// borough, similar duration (±25%). Shown only with 5+ prices; otherwise null.
export async function getPriceGuide(
  categoryId: string,
  borough: string,
  durationMin: number | null,
): Promise<PriceGuide | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('services')
    .select('price_pence, duration_min, providers!inner(category_id, borough, status)')
    .eq('providers.category_id', categoryId)
    .eq('providers.borough', borough)
    .eq('providers.status', 'published')
    .returns<{ price_pence: number; duration_min: number }[]>()
  if (error || !data) return null

  const prices = data
    .filter((s) =>
      durationMin == null
        ? true
        : s.duration_min >= durationMin * 0.75 && s.duration_min <= durationMin * 1.25,
    )
    .map((s) => s.price_pence)
    .filter((p) => p > 0)
    .sort((a, b) => a - b)

  if (prices.length < 5) return null

  const at = (q: number) => prices[Math.min(prices.length - 1, Math.floor(q * (prices.length - 1)))]
  return { p10: at(0.1), p90: at(0.9), sample: prices.length }
}
