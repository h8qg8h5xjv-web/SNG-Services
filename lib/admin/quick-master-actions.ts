'use server'

import { saveProvider } from './provider-actions'

// §10 fast master entry: name, category, borough, phone, languages, services as
// one line. Creates a DRAFT pro (contact-to-arrange) with claimed languages and
// parsed services; the admin opens the full form to finish before publishing.

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
}

function slugify(name: string): string {
  const base = [...name.toLowerCase()]
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  const rand = Math.random().toString(36).slice(2, 7)
  return `${base ? base.slice(0, 40) : 'master'}-${rand}`
}

// "Стрижка 25 60; Маникюр 30 90" → services. Fields: name, price£, minutes.
function parseServices(line: string): {
  name_en: string
  duration_min: number
  price_pence: number
  capacity: number
}[] {
  return line
    .split(/[;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((chunk) => {
      const parts = chunk.split(/\s+/)
      if (parts.length < 3) return []
      const minutes = Number(parts[parts.length - 1])
      const pounds = Number(parts[parts.length - 2])
      const name = parts.slice(0, -2).join(' ')
      if (!name || !Number.isFinite(minutes) || minutes <= 0 || !Number.isFinite(pounds) || pounds < 0) {
        return []
      }
      return [{
        name_en: name,
        duration_min: Math.round(minutes),
        price_pence: Math.round(pounds * 100),
        capacity: 1,
      }]
    })
}

export type QuickMasterInput = {
  name: string
  categoryId: string
  borough: string
  phone: string
  languages: string[]
  servicesLine: string
}

export async function quickCreateMaster(
  input: QuickMasterInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim()
  const borough = input.borough.trim()
  if (!name) return { ok: false, error: 'Name is required.' }
  if (!input.categoryId) return { ok: false, error: 'Pick a category.' }
  if (!borough) return { ok: false, error: 'Borough is required.' }

  const payload = {
    slug: slugify(name),
    name_en: name,
    description_en: null,
    category_id: input.categoryId,
    borough,
    phone: input.phone.trim() || null,
    fulfillment_type: 'enquiry' as const,
    status: 'draft' as const,
    entity_type: 'pro' as const,
    // Unclaimed avoids the description requirement; the admin claims it in the
    // full form before publishing.
    claim_status: 'unclaimed' as const,
    booking_enabled: false,
    languages: input.languages,
    services: parseServices(input.servicesLine),
  }

  const res = await saveProvider(null, payload)
  if (res.ok) return { ok: true }
  const fieldMsg = res.fieldErrors ? Object.values(res.fieldErrors)[0] : undefined
  return { ok: false, error: res.formError ?? fieldMsg ?? 'Could not create the master.' }
}
