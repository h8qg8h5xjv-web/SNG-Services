// UK postcode: validate and split into outward (broadcast-safe, ~a few streets)
// and the full code. Outward is the part before the space (e.g. "SW1A 1AA" →
// "SW1A"). We broadcast only the outward part; the full postcode is contact-level.

const UK_POSTCODE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i

export type ParsedPostcode = { full: string; outward: string }

export function parseUkPostcode(raw: string): ParsedPostcode | null {
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, ' ')
  const m = cleaned.match(UK_POSTCODE)
  if (!m) return null
  const outward = m[1]
  const inward = m[2]
  return { full: `${outward} ${inward}`, outward }
}
