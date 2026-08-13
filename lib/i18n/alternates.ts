import { headers } from 'next/headers'
import { allLocales, defaultLocale, enabledLocales } from '@/i18n/locales'

/** Strip a leading /{locale} segment, returning the path within the locale (may be ''). */
function pathWithinLocale(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0 && allLocales.includes(segments[0])) {
    segments.shift()
  }
  return segments.join('/')
}

/**
 * hreflang alternates for the current request: one entry per enabled locale
 * plus x-default → English. Reads the path from the x-pathname header set by
 * middleware, so it stays correct on any page without threading the path down.
 */
export async function buildLanguageAlternates(): Promise<
  Record<string, string>
> {
  const pathname = (await headers()).get('x-pathname') ?? `/${defaultLocale}`
  const rest = pathWithinLocale(pathname)
  const suffix = rest ? `/${rest}` : ''

  const languages: Record<string, string> = {}
  for (const locale of enabledLocales) {
    languages[locale] = `/${locale}${suffix}`
  }
  languages['x-default'] = `/${defaultLocale}${suffix}`
  return languages
}
