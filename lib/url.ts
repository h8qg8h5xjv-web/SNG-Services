/** Human-readable platform name from an external order URL, e.g.
 *  https://www.ubereats.com/gb -> "Ubereats", https://deliveroo.co.uk -> "Deliveroo". */
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
    return sld.charAt(0).toUpperCase() + sld.slice(1)
  } catch {
    return url
  }
}
