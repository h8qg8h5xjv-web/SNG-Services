// Correct casing for platforms we name explicitly; anything else is derived from
// the domain (title-cased second-level label).
const KNOWN_PLATFORMS: Record<string, string> = {
  fresha: 'Fresha',
  treatwell: 'Treatwell',
  opentable: 'OpenTable',
  ubereats: 'Uber Eats',
  deliveroo: 'Deliveroo',
  booksy: 'Booksy',
}

/** Human-readable platform name from an external order URL, e.g.
 *  https://www.opentable.co.uk/r/x -> "OpenTable", https://mysite.com -> "Mysite". */
export function platformName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    const parts = host.split('.')
    let sld = parts[0]
    if (parts.length >= 2) {
      const secondLast = parts[parts.length - 2]
      sld =
        secondLast === 'co' && parts.length >= 3
          ? parts[parts.length - 3]
          : secondLast
    }
    return KNOWN_PLATFORMS[sld.toLowerCase()] ?? sld.charAt(0).toUpperCase() + sld.slice(1)
  } catch {
    return url
  }
}
