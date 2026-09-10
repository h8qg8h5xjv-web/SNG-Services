// Creates a test master provider linked to YOUR account so you have someone to
// answer your own requests with. Idempotent. Run:
//
//   npm run seed:test-master                 # uses TEST_MASTER_EMAIL or the default
//   npm run seed:test-master -- --email=you@example.com --category=beauty --borough=Ealing
//
// Needs .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
// Sign in afterwards at /<locale>/business/login with the same email (locally the
// magic link lands in Supabase Inbucket, http://localhost:54324).

import type { Database } from '../types/database'
import type { SupabaseClient, User } from '@supabase/supabase-js'

/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js')
/* eslint-enable @typescript-eslint/no-require-imports */

type Client = SupabaseClient<Database>

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`))
  return hit ? hit.slice(name.length + 3) : undefined
}

const EMAIL = arg('email') ?? process.env.TEST_MASTER_EMAIL ?? 'adel.marvanova@gmail.com'
const CATEGORY = arg('category') ?? 'beauty' // a fixed category → the "Беру" flow
const BOROUGH = arg('borough') ?? 'Ealing'
const SLUG = 'test-master'

async function findOrCreateUser(supabase: Client): Promise<User> {
  const created = await supabase.auth.admin.createUser({ email: EMAIL, email_confirm: true })
  if (created.data.user) return created.data.user
  // Already exists — page through until we find it.
  for (let page = 1; page <= 20; page++) {
    const { data } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    const found = data.users.find((u) => u.email?.toLowerCase() === EMAIL.toLowerCase())
    if (found) return found
    if (data.users.length < 200) break
  }
  throw new Error(`Could not create or find an auth user for ${EMAIL}: ${created.error?.message ?? ''}`)
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (see .env.local.example).')
    process.exit(1)
  }
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: category } = await supabase.from('categories').select('id').eq('slug', CATEGORY).maybeSingle()
  if (!category) {
    console.error(`Category "${CATEGORY}" not found. Run npm run seed first.`)
    process.exit(1)
  }

  const user = await findOrCreateUser(supabase)

  // Upsert provider as draft first (so setting a verified language doesn't trip
  // the published-language trigger), then publish once the language exists.
  const { data: provider, error: pErr } = await supabase
    .from('providers')
    .upsert(
      {
        slug: SLUG,
        name_en: 'Test Master',
        description_en: 'Test provider for local end-to-end checks. Delete before launch.',
        category_id: category.id,
        borough: BOROUGH,
        fulfillment_type: 'enquiry',
        entity_type: 'pro',
        claim_status: 'claimed',
        status: 'draft',
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()
  if (pErr || !provider) {
    console.error('Failed to upsert provider:', pErr?.message)
    process.exit(1)
  }
  const providerId = provider.id

  // Link to your account.
  await supabase
    .from('provider_members')
    .upsert({ provider_id: providerId, user_id: user.id, role: 'owner' }, { onConflict: 'provider_id,user_id' })

  // Verified Russian (service_role → auth.uid() is null → authority trigger allows it).
  const yearAhead = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  await supabase.from('provider_languages').upsert(
    {
      provider_id: providerId,
      language_code: 'ru',
      status: 'verified',
      method: 'seed',
      verified_at: new Date().toISOString(),
      expires_at: yearAhead,
      note: 'test master, local checks',
    },
    { onConflict: 'provider_id,language_code' },
  )

  // One service (price makes the fixed "Беру" flow work) and a weekly schedule.
  await supabase.from('services').delete().eq('provider_id', providerId)
  await supabase.from('services').insert({
    provider_id: providerId,
    name_en: 'Test service',
    name_ru: 'Тестовая услуга',
    duration_min: 60,
    price_pence: 3000,
    capacity: 1,
  })
  await supabase.from('schedules').delete().eq('provider_id', providerId)
  await supabase
    .from('schedules')
    .insert([1, 2, 3, 4, 5].map((d) => ({ provider_id: providerId, day_of_week: d, start_time: '09:00', end_time: '18:00' })))

  // Publish now that a verified language exists.
  const { error: pubErr } = await supabase.from('providers').update({ status: 'published' }).eq('id', providerId)
  if (pubErr) {
    console.error('Could not publish (check verified language):', pubErr.message)
    process.exit(1)
  }

  console.log('✓ Test master ready:')
  console.log(`   provider: ${SLUG} (${CATEGORY}, ${BOROUGH})  id=${providerId}`)
  console.log(`   linked to: ${EMAIL} (user ${user.id})`)
  console.log('')
  console.log('Try the full loop:')
  console.log(`  1. As a client, open the "${CATEGORY}" master card and leave a request (or "any master" in ${BOROUGH}).`)
  console.log('  2. Trigger a wave:  npm run requests:advance   (watch the console "email").')
  console.log(`  3. Sign in at /en/business/login as ${EMAIL} (local magic link → http://localhost:54324).`)
  console.log('  4. Take the request in the cabinet; the client sees the match on the waiting screen.')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
