// Fails if the six locale message files drift apart. English is the source of
// truth: every en key must exist in every other locale, and no locale may carry
// a key that en doesn't. Run: npm run check:messages
//
// Guards DESIGN §1 — a locale must never miss a key at runtime. The runtime also
// falls back to English (i18n/request.ts); this makes a gap a build failure.
//
// Also fails when a non-en value is identical to the English one: that is
// untranslated copy (a new key pasted in English and forgotten). Exceptions:
// values with no letters outside {placeholders} ("{current}/{total}"), and the
// keys in SAME_IN_EVERY_LOCALE below.

import fs from 'node:fs'
import path from 'node:path'

const LOCALES = ['en', 'ru', 'uk', 'kk', 'ka', 'hy'] as const
const REFERENCE = 'en'
const DIR = path.join(import.meta.dirname, '..', 'messages')

type Json = { [key: string]: unknown }

// Values that are the same in every language on purpose — brand and service
// names, codes. Add a key here only with the reason; anything else gets
// translated.
const SAME_IN_EVERY_LOCALE: Record<string, string> = {
  'provider.telegram': 'service name',
  'provider.instagram': 'service name',
}

function leafValues(obj: Json, prefix = '', out = new Map<string, unknown>()): Map<string, unknown> {
  for (const [key, value] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) leafValues(value as Json, full, out)
    else out.set(full, value)
  }
  return out
}

// No letters left once the {placeholders} are gone: nothing to translate.
const placeholderOnly = (v: string) => !/\p{L}/u.test(v.replace(/\{[^{}]*\}/g, ''))

function keyPaths(obj: Json, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key
    return value && typeof value === 'object' && !Array.isArray(value)
      ? keyPaths(value as Json, full)
      : [full]
  })
}

const load = (locale: string): Json =>
  JSON.parse(fs.readFileSync(path.join(DIR, `${locale}.json`), 'utf8')) as Json

const reference = new Set(keyPaths(load(REFERENCE)))
const referenceValues = leafValues(load(REFERENCE))
let failed = false

for (const key of Object.keys(SAME_IN_EVERY_LOCALE)) {
  if (!reference.has(key)) {
    failed = true
    console.error(`✗ SAME_IN_EVERY_LOCALE lists ${key}, which ${REFERENCE}.json doesn't have — remove it.`)
  }
}

for (const locale of LOCALES) {
  if (locale === REFERENCE) continue
  const keys = new Set(keyPaths(load(locale)))
  const missing = [...reference].filter((k) => !keys.has(k))
  const extra = [...keys].filter((k) => !reference.has(k))
  if (missing.length || extra.length) {
    failed = true
    console.error(`✗ ${locale}.json`)
    if (missing.length) console.error(`  missing (${missing.length}): ${missing.join(', ')}`)
    if (extra.length) console.error(`  extra (${extra.length}): ${extra.join(', ')}`)
  }

  const values = leafValues(load(locale))
  const untranslated = [...referenceValues].filter(
    ([key, en]) =>
      typeof en === 'string' &&
      values.get(key) === en &&
      !(key in SAME_IN_EVERY_LOCALE) &&
      !placeholderOnly(en),
  )
  if (untranslated.length) {
    failed = true
    console.error(`✗ ${locale}.json — ${untranslated.length} value(s) identical to ${REFERENCE}.json (untranslated):`)
    for (const [key, en] of untranslated.slice(0, 30)) console.error(`  ${key}: ${JSON.stringify(en)}`)
    if (untranslated.length > 30) console.error(`  … and ${untranslated.length - 30} more`)
  }
}

if (failed) {
  console.error(
    `\nMessage files are out of sync with ${REFERENCE}.json. Add missing keys, remove stray ones, ` +
      `and translate values left in English (or list a deliberate exception in SAME_IN_EVERY_LOCALE).`,
  )
  process.exit(1)
}

console.log(`✓ all ${LOCALES.length} locales match ${REFERENCE}.json (${reference.size} keys), none left in English`)
