import { allLocales, defaultLocale } from '@/i18n/locales'

// Single, guarded place to build locale-aware Intl formatters.
//
// Why this exists: `new Intl.DateTimeFormat(locale, …)` throws
// `RangeError: Incorrect locale information provided` when `locale` is not a
// valid BCP-47 tag — an empty string "" or a mangled tag like "ru_RU" or "ru,RU"
// all throw (only `undefined` is safe). Components used to build formatters from a
// raw `locale` prop with no check, so any single bad value took down the whole
// block. Validation lives here now, not at every call site.
//
// This is not a silent per-site fallback: the locale is validated once, against
// the app's own locale list first and then the platform's canonicaliser, and only
// a genuinely invalid value degrades to the default locale (with a warning) rather
// than crashing the render.

export function resolveLocale(locale?: string | null): string {
  if (locale && allLocales.includes(locale)) return locale
  try {
    if (locale && Intl.getCanonicalLocales(locale).length > 0) return locale
  } catch {
    // not a valid BCP-47 tag — fall through
  }
  if (locale) {
    console.warn(`[intl] invalid locale ${JSON.stringify(locale)} — using ${defaultLocale}`)
  }
  return defaultLocale
}

export function dateTimeFormat(
  locale: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(resolveLocale(locale), options)
}

export function numberFormat(
  locale: string | null | undefined,
  options?: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  return new Intl.NumberFormat(resolveLocale(locale), options)
}
