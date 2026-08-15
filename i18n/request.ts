import { getRequestConfig } from 'next-intl/server'
import { hasLocale, IntlErrorCode } from 'next-intl'
import { routing } from './routing'
import { defaultLocale } from './locales'
import type { AbstractIntlMessages, IntlError } from 'next-intl'

// Deep-merge so a missing key in a locale falls back to the English value,
// never to an empty string or a raw key. English is the complete source of truth.
function deepMerge(
  base: AbstractIntlMessages,
  override: AbstractIntlMessages,
): AbstractIntlMessages {
  const out: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(override)) {
    const existing = out[key]
    if (
      value &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      existing &&
      typeof existing === 'object' &&
      !Array.isArray(existing)
    ) {
      out[key] = deepMerge(
        existing as AbstractIntlMessages,
        value as AbstractIntlMessages,
      )
    } else {
      out[key] = value
    }
  }
  return out as AbstractIntlMessages
}

async function load(locale: string): Promise<AbstractIntlMessages> {
  return (await import(`../messages/${locale}.json`)).default
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  const base = await load(defaultLocale)
  const messages =
    locale === defaultLocale ? base : deepMerge(base, await load(locale))

  return {
    locale,
    messages,
    // A missing key must NEVER crash a page (DESIGN §1). With the English base
    // merged in above, a locale gap already resolves to English; this covers the
    // remaining case — a key absent from English too (a developer slip that the
    // messages-parity check catches in CI). Downgrade it to a console warning
    // instead of throwing, and render a readable fallback rather than a blank.
    onError(error: IntlError) {
      if (error.code === IntlErrorCode.MISSING_MESSAGE) {
        console.warn(`[i18n] ${error.message}`)
      } else {
        console.error(error)
      }
    },
    getMessageFallback({ namespace, key }: { namespace?: string; key: string }) {
      return [namespace, key].filter(Boolean).join('.')
    },
  }
})
