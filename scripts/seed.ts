// Idempotent seed script. Run with:  npm run seed   (needs .env.local with the
// Supabase URL + service role key).  Dry run:  npm run seed:dry  (no DB, just
// builds and validates every row from seed-data.json and the reference data).
//
// Run via Node's native TypeScript stripping (no ts-node/tsx dependency):
//   node --experimental-strip-types --env-file-if-exists=.env.local scripts/seed.ts
//
// Idempotency: categories/languages/providers/translations/events are upserted
// on their natural keys; a provider's child collections (languages, services,
// schedules, exceptions) are rebuilt each run. The provider is upserted as
// 'draft' first so rebuilding languages never trips the published-language
// trigger, then set to its final status once its languages exist.

import type { Database } from '../types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } =
  require('@supabase/supabase-js') as typeof import('@supabase/supabase-js')
const fs = require('fs') as typeof import('fs')
const path = require('path') as typeof import('path')
/* eslint-enable @typescript-eslint/no-require-imports */

type Tables = Database['public']['Tables']
type Client = SupabaseClient<Database>

const DRY_RUN = process.argv.includes('--dry-run')

// --- Reference data ---------------------------------------------------------

// 14 categories from DESIGN.md §2 (sort_order follows that table).
const CATEGORIES: Tables['categories']['Insert'][] = [
  { slug: 'beauty', name_en: 'Beauty', name_ru: 'Красота', icon: 'scissors', sort_order: 1 },
  { slug: 'health', name_en: 'Health', name_ru: 'Здоровье', icon: 'stethoscope', sort_order: 2 },
  { slug: 'kids', name_en: 'Kids', name_ru: 'Дети', icon: 'mood-kid', sort_order: 3 },
  { slug: 'education', name_en: 'Education', name_ru: 'Обучение', icon: 'school', sort_order: 4 },
  { slug: 'home', name_en: 'Home', name_ru: 'Дом', icon: 'tool', sort_order: 5 },
  { slug: 'moving', name_en: 'Moving', name_ru: 'Переезд', icon: 'truck', sort_order: 6 },
  { slug: 'legal', name_en: 'Documents', name_ru: 'Документы', icon: 'file-text', sort_order: 7 },
  { slug: 'restaurants', name_en: 'Restaurants', name_ru: 'Рестораны', icon: 'tools-kitchen-2', sort_order: 8 },
  { slug: 'food', name_en: 'Food', name_ru: 'Еда', icon: 'shopping-bag', sort_order: 9 },
  { slug: 'sport', name_en: 'Sport', name_ru: 'Спорт', icon: 'barbell', sort_order: 10 },
  { slug: 'auto', name_en: 'Auto', name_ru: 'Авто', icon: 'car', sort_order: 11 },
  { slug: 'celebrations', name_en: 'Celebrations', name_ru: 'Праздники', icon: 'camera', sort_order: 12 },
  { slug: 'finance', name_en: 'Finance', name_ru: 'Финансы', icon: 'wallet', sort_order: 13 },
  { slug: 'pets', name_en: 'Pets', name_ru: 'Питомцы', icon: 'paw', sort_order: 14 },
]

// Service languages from DESIGN.md §1 (ISO 639-1, native name). No English.
const LANGUAGES: Tables['languages']['Insert'][] = [
  { code: 'ru', name_native: 'русский', sort_order: 1 },
  { code: 'uk', name_native: 'українська', sort_order: 2 },
  { code: 'be', name_native: 'беларуская', sort_order: 3 },
  { code: 'kk', name_native: 'қазақша', sort_order: 4 },
  { code: 'uz', name_native: 'oʻzbekcha', sort_order: 5 },
  { code: 'ky', name_native: 'кыргызча', sort_order: 6 },
  { code: 'tg', name_native: 'тоҷикӣ', sort_order: 7 },
  { code: 'tk', name_native: 'türkmençe', sort_order: 8 },
  { code: 'az', name_native: 'azərbaycanca', sort_order: 9 },
  { code: 'hy', name_native: 'հայերեն', sort_order: 10 },
  { code: 'ka', name_native: 'ქართული', sort_order: 11 },
  { code: 'ro', name_native: 'română', sort_order: 12 },
]

// Approximate borough centroids (demo coordinates).
const BOROUGH_COORDS: Record<string, { lat: number; lng: number }> = {
  Ealing: { lat: 51.513, lng: -0.3089 },
  Brent: { lat: 51.5637, lng: -0.2795 },
  Hounslow: { lat: 51.4746, lng: -0.368 },
  Camden: { lat: 51.529, lng: -0.1255 },
  Barnet: { lat: 51.6252, lng: -0.1517 },
  Wandsworth: { lat: 51.4571, lng: -0.1818 },
  'Hammersmith and Fulham': { lat: 51.4927, lng: -0.224 },
  Harrow: { lat: 51.5898, lng: -0.3346 },
  Southwark: { lat: 51.503, lng: -0.09 },
  Croydon: { lat: 51.3714, lng: -0.0977 },
  Newham: { lat: 51.5255, lng: 0.0352 },
  'Tower Hamlets': { lat: 51.5203, lng: -0.0293 },
  'City of Westminster': { lat: 51.4975, lng: -0.1357 },
  Islington: { lat: 51.5416, lng: -0.1022 },
  'Kensington and Chelsea': { lat: 51.4991, lng: -0.1938 },
  Enfield: { lat: 51.6521, lng: -0.0807 },
  'Richmond upon Thames': { lat: 51.4613, lng: -0.3037 },
  Merton: { lat: 51.411, lng: -0.1875 },
  Lambeth: { lat: 51.4607, lng: -0.1163 },
  Hackney: { lat: 51.545, lng: -0.0553 },
}

// Two providers stay in draft to prove the published/status filter works.
const DRAFT_SLUGS = new Set(['anna-nails-w3', 'buhgalter-london'])

type ScheduleRow = { day_of_week: number; start_time: string; end_time: string }

// Standard week: Mon–Fri 10:00–19:00, Sat 11:00–17:00, Sun closed.
function standardSchedule(): ScheduleRow[] {
  const rows: ScheduleRow[] = [1, 2, 3, 4, 5].map((d) => ({
    day_of_week: d,
    start_time: '10:00',
    end_time: '19:00',
  }))
  rows.push({ day_of_week: 6, start_time: '11:00', end_time: '17:00' })
  return rows
}

// A couple of providers get non-standard weeks so slot logic has variety to test.
const SCHEDULE_OVERRIDES: Record<string, ScheduleRow[]> = {
  'vesna-hair-studio': [2, 3, 4, 5, 6].map((d) => ({
    day_of_week: d,
    start_time: '09:00',
    end_time: '20:00',
  })),
  'kavkaz-barbers': [
    ...[1, 2, 3, 4, 5, 6].map((d) => ({
      day_of_week: d,
      start_time: '10:00',
      end_time: '20:00',
    })),
    { day_of_week: 0, start_time: '12:00', end_time: '18:00' },
  ],
}

// One exception each, expressed as (today + N days). Filled in at build time.
const EXCEPTION_OFFSETS: Record<
  string,
  { days: number; is_closed: boolean; start_time?: string; end_time?: string }
> = {
  'vesna-hair-studio': { days: 10, is_closed: true },
  'kavkaz-barbers': { days: 7, is_closed: false, start_time: '12:00', end_time: '16:00' },
}

// --- seed-data.json shape ---------------------------------------------------

type SeedService = {
  name_en: string
  name_ru: string
  duration_min: number
  price_pence: number
  capacity: number
}
type SeedProvider = {
  slug: string
  name_en: string
  name_ru: string
  category: string
  borough: string
  description_en: string
  description_ru: string
  languages: string[]
  image_seed: string
  services: SeedService[]
  fulfillment_type: Tables['providers']['Row']['fulfillment_type']
  external_order_url: string | null
  entity_type: Tables['providers']['Row']['entity_type']
}
type SeedEvent = {
  slug: string
  title_en: string
  title_ru: string
  category: string
  venue_name: string
  borough: string
  price_from_pence: number
  languages: string[]
  days_from_now: number
  image_seed: string
}
type SeedData = { providers: SeedProvider[]; events: SeedEvent[] }

// --- Helpers ----------------------------------------------------------------

function readSeedData(): SeedData {
  const file = path.join(__dirname, '..', 'seed-data.json')
  return JSON.parse(fs.readFileSync(file, 'utf8')) as SeedData
}

function providerImage(seed: string): string {
  return `https://picsum.photos/seed/${seed}/800/600`
}
function eventImage(seed: string): string {
  return `https://picsum.photos/seed/${seed}/1200/630`
}

// Date N days from today, as YYYY-MM-DD (UTC).
function dateInDays(days: number): string {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
// Datetime N days from today at 18:00 UTC (events).
function eventStart(days: number): string {
  const d = new Date()
  d.setUTCHours(18, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

function coords(borough: string): { lat: number | null; lng: number | null } {
  return BOROUGH_COORDS[borough] ?? { lat: null, lng: null }
}

function fail(message: string): never {
  console.error(`✗ ${message}`)
  process.exit(1)
}

async function run<T>(
  label: string,
  query: PromiseLike<{ error: { message: string } | null; data: T }>,
): Promise<T> {
  const { error, data } = await query
  if (error) fail(`${label}: ${error.message}`)
  return data
}


// --- Validation (runs in both dry and live modes) ---------------------------

function validate(data: SeedData): void {
  const categorySlugs = new Set(CATEGORIES.map((c) => c.slug))
  const languageCodes = new Set(LANGUAGES.map((l) => l.code))
  const providerSlugs = new Set(data.providers.map((p) => p.slug))

  for (const p of data.providers) {
    if (!categorySlugs.has(p.category)) fail(`provider ${p.slug}: unknown category "${p.category}"`)
    for (const code of p.languages) {
      if (!languageCodes.has(code)) fail(`provider ${p.slug}: unknown language "${code}"`)
    }
    if (p.languages.length === 0) fail(`provider ${p.slug}: no service language`)
    if (p.entity_type !== 'place' && p.entity_type !== 'pro') {
      fail(`provider ${p.slug}: entity_type must be place|pro, got "${p.entity_type}"`)
    }
    if (p.fulfillment_type === 'external_order' && !p.external_order_url) {
      fail(`provider ${p.slug}: external_order needs external_order_url`)
    }
    if (!BOROUGH_COORDS[p.borough]) console.warn(`  ! ${p.slug}: no coords for borough "${p.borough}"`)
  }
  for (const slug of DRAFT_SLUGS) {
    if (!providerSlugs.has(slug)) fail(`draft slug "${slug}" is not in seed data`)
  }
  for (const slug of Object.keys(SCHEDULE_OVERRIDES)) {
    const p = data.providers.find((x) => x.slug === slug)
    if (p && p.fulfillment_type !== 'native_booking') {
      fail(`schedule override for ${slug} but it is not native_booking`)
    }
  }
  // kk = Kazakh, ka = Georgian — guard both explicitly (DESIGN.md §1).
  if (LANGUAGES.find((l) => l.code === 'kk')?.name_native !== 'қазақша') fail('kk must be Kazakh')
  if (LANGUAGES.find((l) => l.code === 'ka')?.name_native !== 'ქართული') fail('ka must be Georgian')
}

// --- Writers ----------------------------------------------------------------

async function seedProvider(supabase: Client, p: SeedProvider): Promise<void> {
  const { lat, lng } = coords(p.borough)

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', p.category)
    .single()
  if (categoryError || !category) fail(`category lookup ${p.category}: ${categoryError?.message ?? 'not found'}`)

  // Upsert as draft first so language rebuild never trips the publish trigger.
  const { data: provider, error: providerError } = await supabase
    .from('providers')
    .upsert(
      {
        slug: p.slug,
        name_en: p.name_en,
        description_en: p.description_en,
        category_id: category.id,
        borough: p.borough,
        lat,
        lng,
        cover_image: providerImage(p.image_seed),
        fulfillment_type: p.fulfillment_type,
        external_order_url: p.external_order_url,
        entity_type: p.entity_type,
        claim_status: 'claimed', // demo cards are "ours", not public-data listings
        status: 'draft',
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()
  if (providerError || !provider) fail(`upsert provider ${p.slug}: ${providerError?.message ?? 'no row'}`)
  const providerId = provider.id

  // Languages: rebuild (safe while draft).
  await run(
    `clear languages ${p.slug}`,
    supabase.from('provider_languages').delete().eq('provider_id', providerId),
  )
  // Seed languages are marked verified so the publish rule passes from day one,
  // but method='seed' + an honest note keep them distinguishable from real
  // checks (README: delete demo data before a real launch).
  await run(
    `insert languages ${p.slug}`,
    supabase.from('provider_languages').insert(
      p.languages.map((code) => ({
        provider_id: providerId,
        language_code: code,
        status: 'verified' as const,
        method: 'seed' as const,
        note: 'demo data, not actually verified',
      })),
    ),
  )

  // Russian translation.
  await run(
    `translation ${p.slug}`,
    supabase.from('provider_translations').upsert(
      { provider_id: providerId, locale: 'ru', name: p.name_ru, description: p.description_ru },
      { onConflict: 'provider_id,locale' },
    ),
  )

  // Services: rebuild.
  await run(
    `clear services ${p.slug}`,
    supabase.from('services').delete().eq('provider_id', providerId),
  )
  if (p.services.length > 0) {
    await run(
      `insert services ${p.slug}`,
      supabase.from('services').insert(
        p.services.map((s) => ({
          provider_id: providerId,
          name_en: s.name_en,
          name_ru: s.name_ru,
          duration_min: s.duration_min,
          price_pence: s.price_pence,
          capacity: s.capacity,
        })),
      ),
    )
  }

  // Schedules + exceptions: native_booking only.
  await run(`clear schedules ${p.slug}`, supabase.from('schedules').delete().eq('provider_id', providerId))
  await run(
    `clear exceptions ${p.slug}`,
    supabase.from('schedule_exceptions').delete().eq('provider_id', providerId),
  )
  if (p.fulfillment_type === 'native_booking') {
    const week = SCHEDULE_OVERRIDES[p.slug] ?? standardSchedule()
    await run(
      `insert schedules ${p.slug}`,
      supabase.from('schedules').insert(week.map((r) => ({ provider_id: providerId, ...r }))),
    )
    const ex = EXCEPTION_OFFSETS[p.slug]
    if (ex) {
      await run(
        `insert exception ${p.slug}`,
        supabase.from('schedule_exceptions').insert({
          provider_id: providerId,
          exception_date: dateInDays(ex.days),
          is_closed: ex.is_closed,
          start_time: ex.start_time ?? null,
          end_time: ex.end_time ?? null,
        }),
      )
    }
  }

  // Finally set the intended status (languages now exist → publish passes).
  const status = DRAFT_SLUGS.has(p.slug) ? 'draft' : 'published'
  await run(
    `status ${p.slug}`,
    supabase.from('providers').update({ status }).eq('id', providerId),
  )
}

async function seedEvent(supabase: Client, e: SeedEvent): Promise<void> {
  const { lat, lng } = coords(e.borough)
  await run(
    `upsert event ${e.slug}`,
    supabase.from('events').upsert(
      {
        slug: e.slug,
        title_en: e.title_en,
        title_ru: e.title_ru,
        category: e.category as Tables['events']['Row']['category'],
        starts_at: eventStart(e.days_from_now),
        venue_name: e.venue_name,
        borough: e.borough,
        lat,
        lng,
        price_from_pence: e.price_from_pence === 0 ? null : e.price_from_pence, // null = free (DESIGN §2а)
        languages: e.languages,
        cover_image: eventImage(e.image_seed),
        status: 'published',
      },
      { onConflict: 'slug' },
    ),
  )
}

// --- Main -------------------------------------------------------------------

async function main(): Promise<void> {
  const data = readSeedData()
  validate(data)

  const published = data.providers.filter((p) => !DRAFT_SLUGS.has(p.slug)).length
  const drafts = data.providers.length - published
  const withSchedule = data.providers.filter((p) => p.fulfillment_type === 'native_booking').length

  console.log(
    `Seed plan: ${CATEGORIES.length} categories, ${LANGUAGES.length} languages, ` +
      `${data.providers.length} providers (${published} published / ${drafts} draft), ` +
      `${withSchedule} with schedules, ${data.events.length} events.`,
  )

  if (DRY_RUN) {
    console.log('Dry run — validation passed, no database writes.')
    console.log('  sample event start:', eventStart(data.events[0].days_from_now))
    console.log('  vesna exception date:', dateInDays(EXCEPTION_OFFSETS['vesna-hair-studio'].days))
    return
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    fail(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Set them in .env.local (see .env.local.example), or use `npm run seed:dry`.',
    )
  }

  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  await run('upsert categories', supabase.from('categories').upsert(CATEGORIES, { onConflict: 'slug' }))
  await run('upsert languages', supabase.from('languages').upsert(LANGUAGES, { onConflict: 'code' }))
  console.log('✓ categories and languages')

  for (const p of data.providers) {
    await seedProvider(supabase, p)
    console.log(`✓ provider ${p.slug}`)
  }
  for (const e of data.events) {
    await seedEvent(supabase, e)
    console.log(`✓ event ${e.slug}`)
  }

  console.log('Seed complete.')
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
