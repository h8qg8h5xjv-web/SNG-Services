// Pure formatting helpers. Prices are stored as integer pence.

const gbp0 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})
const gbp2 = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 4500 -> "£45", 4550 -> "£45.50". Whole pounds drop the pence. */
export function formatPrice(pence: number): string {
  const pounds = pence / 100
  return Number.isInteger(pounds) ? gbp0.format(pounds) : gbp2.format(pounds)
}

export function formatPriceRange(min: number, max: number): string {
  return min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`
}

/** 60 -> "1 h", 90 -> "1 h 30 min", 45 -> "45 min", using caller-supplied unit labels. */
export function formatDuration(
  minutes: number,
  labels: { hour: string; min: string },
): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} ${labels.min}`
  if (m === 0) return `${h} ${labels.hour}`
  return `${h} ${labels.hour} ${m} ${labels.min}`
}
