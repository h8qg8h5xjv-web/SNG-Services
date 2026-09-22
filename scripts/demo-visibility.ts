// §11 Demo data visibility. Flip the seed providers between draft and published:
//   npm run demo:hide    (seed providers -> draft, hidden from the public site)
//   npm run demo:show    (seed providers -> published, visible again)
// Prints the target database and the affected providers, then asks to confirm.
// Skip the prompt with --yes. Needs .env.local (NEXT_PUBLIC_SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY).
//
//   node --experimental-strip-types --env-file-if-exists=.env.local scripts/demo-visibility.ts <hide|show>

import type { Database } from '../types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } =
  require('@supabase/supabase-js') as typeof import('@supabase/supabase-js')
const fs = require('fs') as typeof import('fs')
const path = require('path') as typeof import('path')
const readline = require('node:readline/promises') as typeof import('node:readline/promises')
/* eslint-enable @typescript-eslint/no-require-imports */

type Client = SupabaseClient<Database>

function parseMode(): 'hide' | 'show' {
  const arg = process.argv.find((a) => a === 'hide' || a === 'show')
  if (!arg) {
    console.error('Usage: demo-visibility.ts <hide|show> [--yes]')
    process.exit(1)
  }
  return arg
}

function loadSeedSlugs(): string[] {
  const raw = fs.readFileSync(path.join(__dirname, '..', 'seed-data.json'), 'utf8')
  const data = JSON.parse(raw) as { providers: { slug: string }[] }
  return data.providers.map((p) => p.slug)
}

async function confirm(question: string): Promise<boolean> {
  if (process.argv.includes('--yes')) return true
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = (await rl.question(question)).trim().toLowerCase()
  rl.close()
  return answer === 'yes' || answer === 'y'
}

async function main() {
  const mode = parseMode()
  const nextStatus = mode === 'hide' ? 'draft' : 'published'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.local.example).')
    process.exit(1)
  }
  const supabase: Client = createClient<Database>(url, key, {
    auth: { persistSession: false },
  })

  const slugs = loadSeedSlugs()
  const { data: rows, error } = await supabase
    .from('providers')
    .select('slug, status')
    .in('slug', slugs)
  if (error) {
    console.error('Read failed:', error.message)
    process.exit(1)
  }

  const host = (() => {
    try {
      return new URL(url).host
    } catch {
      return url
    }
  })()

  console.log(`\nTarget database: ${host}`)
  console.log(`Seed providers in DB: ${rows?.length ?? 0} of ${slugs.length} in seed-data.json`)
  console.log(`Action: set them to "${nextStatus}".\n`)

  if (!rows || rows.length === 0) {
    console.log('Nothing to do.')
    return
  }

  const ok = await confirm(`Type "yes" to set ${rows.length} providers to ${nextStatus}: `)
  if (!ok) {
    console.log('Cancelled.')
    return
  }

  let changed = 0
  const failures: string[] = []
  for (const r of rows) {
    if (r.status === nextStatus) continue
    const { error: upErr } = await supabase
      .from('providers')
      .update({ status: nextStatus })
      .eq('slug', r.slug)
    if (upErr) failures.push(`${r.slug}: ${upErr.message}`)
    else changed++
  }

  console.log(`\nDone. Changed ${changed} provider(s).`)
  if (failures.length) {
    console.log(`Skipped ${failures.length} (e.g. publishing needs a verified language):`)
    for (const f of failures) console.log(`  - ${f}`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
