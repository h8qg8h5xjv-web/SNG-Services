// Keeps the brand in one place (lib/brand.ts). Fails if:
// - the old name "SNG" shows up in user-facing code (app/, components/, lib/,
//   proxy.ts) or in messages/*.json;
// - a message file spells the brand itself — translations take it from {brand}.
// Run: npm run check:brand
//
// Allowed: internal identifiers that keep the old prefix on purpose so existing
// visitors don't lose their data — localStorage keys (sng_saved, sng.recentlyViewed),
// window events (sng:requests-changed), the sng_sid cookie and the SNGWater shader.
// Never shown to a user.

import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.join(import.meta.dirname, '..')
const CODE_ROOTS = ['app', 'components', 'lib', 'proxy.ts']
const CODE_EXT = /\.(?:ts|tsx|mts|js|mjs|css|json)$/
const INTERNAL = /\bsng_[a-z_]+|\bsng\.[A-Za-z]+|\bsng:[a-z-]+|\bSNGWater\b/g
const OLD_NAME = /sng/i
const BRAND_IN_MESSAGES = /okno/i

function walk(p: string): string[] {
  if (!fs.existsSync(p)) return []
  if (!fs.statSync(p).isDirectory()) return [p]
  return fs.readdirSync(p).flatMap((name) => walk(path.join(p, name)))
}

const problems: string[] = []
const rel = (file: string) => path.relative(ROOT, file)

for (const file of CODE_ROOTS.flatMap((r) => walk(path.join(ROOT, r))).filter((f) => CODE_EXT.test(f))) {
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (OLD_NAME.test(line.replace(INTERNAL, ''))) problems.push(`${rel(file)}:${i + 1}  old name: ${line.trim()}`)
    })
}

for (const file of walk(path.join(ROOT, 'messages')).filter((f) => f.endsWith('.json'))) {
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      if (OLD_NAME.test(line)) problems.push(`${rel(file)}:${i + 1}  old name: ${line.trim()}`)
      if (BRAND_IN_MESSAGES.test(line)) {
        problems.push(`${rel(file)}:${i + 1}  brand spelt in a message, use {brand}: ${line.trim()}`)
      }
    })
}

if (problems.length > 0) {
  console.error(`check:brand — ${problems.length} problem(s). The brand comes from lib/brand.ts:\n`)
  for (const p of problems) console.error('  ' + p)
  process.exit(1)
}
console.log('check:brand — ok')
