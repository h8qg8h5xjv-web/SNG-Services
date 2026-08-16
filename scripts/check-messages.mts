// Fails if the six locale message files drift apart. English is the source of
// truth: every en key must exist in every other locale, and no locale may carry
// a key that en doesn't. Run: npm run check:messages
//
// Guards DESIGN §1 — a locale must never miss a key at runtime. The runtime also
// falls back to English (i18n/request.ts); this makes a gap a build failure.

import fs from 'node:fs'
import path from 'node:path'

const LOCALES = ['en', 'ru', 'uk', 'kk', 'ka', 'hy'] as const
const REFERENCE = 'en'
const DIR = path.join(import.meta.dirname, '..', 'messages')

type Json = { [key: string]: unknown }

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
let failed = false

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
}

if (failed) {
  console.error(
    `\nMessage files are out of sync with ${REFERENCE}.json. ` +
      `Add the missing keys (English value where untranslated) and remove stray ones.`,
  )
  process.exit(1)
}

console.log(`✓ all ${LOCALES.length} locales match ${REFERENCE}.json (${reference.size} keys)`)
