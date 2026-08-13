import { defineRouting } from 'next-intl/routing'
import { defaultLocale, enabledLocales } from './locales'

// Only enabled locales are routable. The URL prefix is always explicit,
// including English (/en/...). Locale is detected from Accept-Language on the
// first visit; a cookie choice overrides it (handled by the next-intl middleware).
export const routing = defineRouting({
  locales: enabledLocales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true,
})
