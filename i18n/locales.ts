// Interface locales. Closed list of six — see DESIGN.md §1.
// A locale is shown to users (switcher, hreflang, routing) only when `enabled`.
// Enabling a translated locale is a one-line flip here, never a code change.
//
// Watch the codes: `kk` is Kazakh, `ka` is Georgian. One letter apart, and a
// mix-up is silent (the page just serves the wrong language). The comments and
// the seed/tests guard both explicitly.

export type LocaleConfig = {
  code: string
  /** Name in the language's own script, for the switcher. */
  name: string
  enabled: boolean
}

export const localeConfigs: readonly LocaleConfig[] = [
  { code: 'en', name: 'English', enabled: true },
  { code: 'ru', name: 'Русский', enabled: true },
  { code: 'uk', name: 'Українська', enabled: false },
  { code: 'kk', name: 'Қазақша', enabled: false }, // kk = Kazakh (NOT Georgian)
  { code: 'ka', name: 'ქართული', enabled: false }, // ka = Georgian (NOT Kazakh)
  { code: 'hy', name: 'Հայերեն', enabled: false },
] as const

export const defaultLocale = 'en' as const

/** Every locale that has a message file, whether or not it is switched on. */
export const allLocales = localeConfigs.map((l) => l.code)

/** Locales users can actually reach: routed, listed, hreflang-tagged. */
export const enabledLocales = localeConfigs
  .filter((l) => l.enabled)
  .map((l) => l.code)

export type Locale = (typeof localeConfigs)[number]['code']

export function isEnabledLocale(value: string): boolean {
  return enabledLocales.includes(value)
}

export function localeName(code: string): string {
  return localeConfigs.find((l) => l.code === code)?.name ?? code
}
