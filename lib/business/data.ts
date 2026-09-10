import { createClient } from '@/lib/supabase/server'

// Reads for the business cabinet. All queries run under the signed-in master's
// session, so RLS does the access control: a provider member sees only the
// request_targets for their own provider(s), and request_contacts stay hidden
// until a match (the policy, not code, enforces that).

export type BusinessRequest = {
  requestId: string
  publicRef: string
  type: 'fixed' | 'quote'
  status: string
  providerId: string
  wave: number
  response: 'pending' | 'accepted' | 'declined' | 'no_response'
  active: boolean
  description: string | null
  urgency: string
  borough: string
  postcodeOutward: string | null
  photos: string[]
  budgetMaxPence: number | null
  service: { name: string; pricePence: number; durationMin: number } | null
  windows: { startsAt: string; endsAt: string }[]
  // Only present once this provider is the match (RLS returns it only then).
  contact: {
    name: string
    phone: string
    email: string | null
    address: string | null
    postcode: string | null
  } | null
}

type TargetRow = {
  provider_id: string
  wave: number
  response: string
  requests: {
    id: string
    public_ref: string
    type: string
    status: string
    borough: string
    postcode_outward: string | null
    urgency: string
    photos: string[] | null
    description: string | null
    budget_max_pence: number | null
    request_windows: { starts_at: string; ends_at: string }[]
    request_contacts:
      | { contact_name: string; contact_phone: string; contact_email: string | null; address: string | null; postcode: string | null }
      | { contact_name: string; contact_phone: string; contact_email: string | null; address: string | null; postcode: string | null }[]
      | null
    services: { name_en: string; name_ru: string | null; price_pence: number; duration_min: number } | null
  } | null
}

/** provider_ids the signed-in user manages (RLS scopes provider_members to them). */
export async function getMyProviderIds(): Promise<string[]> {
  const supabase = await createClient()
  const { data } = await supabase.from('provider_members').select('provider_id')
  return (data ?? []).map((m) => m.provider_id)
}

export async function getBusinessRequests(): Promise<BusinessRequest[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('request_targets')
    .select(
      'provider_id, wave, response, ' +
        'requests!inner(id, public_ref, type, status, borough, postcode_outward, urgency, photos, description, budget_max_pence, ' +
        'request_windows(starts_at, ends_at), ' +
        'request_contacts(contact_name, contact_phone, contact_email, address, postcode), ' +
        'services(name_en, name_ru, price_pence, duration_min))',
    )
    .order('wave', { ascending: true })
    .returns<TargetRow[]>()

  const rows = (data ?? []).filter((t): t is TargetRow & { requests: NonNullable<TargetRow['requests']> } => t.requests !== null)

  const mapped: BusinessRequest[] = rows.map((t) => {
    const r = t.requests
    const c = Array.isArray(r.request_contacts) ? r.request_contacts[0] : r.request_contacts
    const active = t.response === 'pending' && r.status === 'broadcasting'
    return {
      requestId: r.id,
      publicRef: r.public_ref,
      type: r.type as 'fixed' | 'quote',
      status: r.status,
      providerId: t.provider_id,
      wave: t.wave,
      response: t.response as BusinessRequest['response'],
      active,
      description: r.description,
      urgency: r.urgency,
      borough: r.borough,
      postcodeOutward: r.postcode_outward,
      photos: r.photos ?? [],
      budgetMaxPence: r.budget_max_pence,
      service: r.services
        ? { name: r.services.name_en, pricePence: r.services.price_pence, durationMin: r.services.duration_min }
        : null,
      windows: (r.request_windows ?? []).map((w) => ({ startsAt: w.starts_at, endsAt: w.ends_at })),
      contact: c
        ? { name: c.contact_name, phone: c.contact_phone, email: c.contact_email, address: c.address, postcode: c.postcode }
        : null,
    }
  })

  // Active first, then by newest wave/ref for the answered pile.
  return mapped.sort((a, b) => Number(b.active) - Number(a.active))
}

/** Count of new (pending) requests still broadcasting — for the nav badge. */
export async function getNewRequestCount(): Promise<number> {
  const requests = await getBusinessRequests()
  return requests.filter((r) => r.active).length
}
