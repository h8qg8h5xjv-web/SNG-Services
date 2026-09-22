import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

export type MyProvider = { id: string; name: string; travelsToClient: boolean }

/** The signed-in master's providers with the fields the cabinet lets them edit. */
export async function getMyProviders(): Promise<MyProvider[]> {
  const ids = await getMyProviderIds()
  if (ids.length === 0) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('providers')
    .select('id, name_en, travels_to_client')
    .in('id', ids)
    .order('name_en', { ascending: true })
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name_en,
    travelsToClient: p.travels_to_client,
  }))
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

// Cabinet reads use the service role AFTER confirming the provider is one of the
// signed-in master's own (via RLS-scoped provider_members). This lets a master
// see their own DRAFT card too (member RLS on providers only exposes published),
// while ownership is still enforced — never a bare admin read.
async function ownedIds(): Promise<Set<string>> {
  return new Set(await getMyProviderIds())
}

export type CabinetProfile = {
  id: string
  name: string
  entityType: 'place' | 'pro'
  descriptionEn: string | null
  descriptionRu: string | null
  borough: string
  address: string | null
  phone: string | null
  website: string | null
  travelsToClient: boolean
  photos: string[]
}

export async function getCabinetProfile(providerId: string): Promise<CabinetProfile | null> {
  if (!(await ownedIds()).has(providerId)) return null
  const admin = createAdminClient()
  const { data } = await admin
    .from('providers')
    .select(
      'id, name_en, entity_type, description_en, borough, address, phone, website, ' +
        'travels_to_client, cover_image, venue_photos, provider_translations(locale, description)',
    )
    .eq('id', providerId)
    .maybeSingle()
    .returns<{
      id: string
      name_en: string
      entity_type: 'place' | 'pro'
      description_en: string | null
      borough: string
      address: string | null
      phone: string | null
      website: string | null
      travels_to_client: boolean
      cover_image: string | null
      venue_photos: string[] | null
      provider_translations: { locale: string; description: string | null }[]
    }>()
  if (!data) return null
  const photos = data.venue_photos && data.venue_photos.length > 0
    ? data.venue_photos
    : data.cover_image
      ? [data.cover_image]
      : []
  return {
    id: data.id,
    name: data.name_en,
    entityType: data.entity_type,
    descriptionEn: data.description_en,
    descriptionRu: data.provider_translations.find((t) => t.locale === 'ru')?.description ?? null,
    borough: data.borough,
    address: data.address,
    phone: data.phone,
    website: data.website,
    travelsToClient: data.travels_to_client,
    photos,
  }
}

export type CabinetService = {
  id: string
  name: string
  pricePence: number
  durationMin: number
}

export async function getCabinetServices(providerId: string): Promise<CabinetService[]> {
  if (!(await ownedIds()).has(providerId)) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('services')
    .select('id, name_en, price_pence, duration_min')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: true })
  return (data ?? []).map((s) => ({
    id: s.id,
    name: s.name_en,
    pricePence: s.price_pence,
    durationMin: s.duration_min,
  }))
}

export type CabinetLanguage = { code: string; name: string; status: string | null }

export async function getCabinetLanguages(
  providerId: string,
): Promise<{ all: { code: string; name: string }[]; claimed: CabinetLanguage[] }> {
  if (!(await ownedIds()).has(providerId)) return { all: [], claimed: [] }
  const admin = createAdminClient()
  const [{ data: all }, { data: mine }] = await Promise.all([
    admin.from('languages').select('code, name_native').order('sort_order', { ascending: true }),
    admin
      .from('provider_languages')
      .select('language_code, status, languages(name_native)')
      .eq('provider_id', providerId)
      .returns<{ language_code: string; status: string; languages: { name_native: string } | null }[]>(),
  ])
  return {
    all: (all ?? []).map((l) => ({ code: l.code, name: l.name_native })),
    claimed: (mine ?? []).map((l) => ({
      code: l.language_code,
      name: l.languages?.name_native ?? l.language_code,
      status: l.status,
    })),
  }
}

export type CabinetScheduleRow = { id: string; dayOfWeek: number; startTime: string; endTime: string }

export async function getCabinetSchedule(providerId: string): Promise<CabinetScheduleRow[]> {
  if (!(await ownedIds()).has(providerId)) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('schedules')
    .select('id, day_of_week, start_time, end_time')
    .eq('provider_id', providerId)
    .order('day_of_week', { ascending: true })
  return (data ?? []).map((s) => ({
    id: s.id,
    dayOfWeek: s.day_of_week,
    startTime: s.start_time,
    endTime: s.end_time,
  }))
}

export type CabinetBooking = {
  id: string
  startsAt: string
  status: string
  serviceName: string | null
  customerName: string
  customerPhone: string
  customerEmail: string | null
}

// Bookings for the master's providers. Contacts appear ONLY on their own rows —
// enforced by the read being scoped to the member's provider ids (and by RLS if
// this were the user session). Upcoming first.
export async function getCabinetBookings(): Promise<CabinetBooking[]> {
  const ids = [...(await ownedIds())]
  if (ids.length === 0) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('bookings')
    .select('id, starts_at, status, customer_name, customer_phone, customer_email, services(name_en)')
    .in('provider_id', ids)
    .order('starts_at', { ascending: false })
    .returns<{
      id: string
      starts_at: string
      status: string
      customer_name: string
      customer_phone: string
      customer_email: string | null
      services: { name_en: string } | null
    }[]>()
  return (data ?? []).map((b) => ({
    id: b.id,
    startsAt: b.starts_at,
    status: b.status,
    serviceName: b.services?.name_en ?? null,
    customerName: b.customer_name,
    customerPhone: b.customer_phone,
    customerEmail: b.customer_email,
  }))
}

export type ProviderStats = { views: number; contacts: number; requests: number }

/**
 * Cabinet stats block (idea #4): card views, contact opens and requests over the
 * last N days for the signed-in master's providers. All three queries run under
 * the user's session — RLS (provider_events_member_read, request_targets member
 * policy) scopes every row to their own providers; code adds no filtering.
 */
export async function getProviderStats(days = 30): Promise<ProviderStats> {
  const supabase = await createClient()
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const [events, targets] = await Promise.all([
    supabase
      .from('provider_events')
      .select('event_type')
      .gte('occurred_at', since)
      .in('event_type', ['click', 'contact_reveal']),
    supabase.from('request_targets').select('id').gte('notified_at', since),
  ])

  const rows = events.data ?? []
  return {
    views: rows.filter((e) => e.event_type === 'click').length,
    contacts: rows.filter((e) => e.event_type === 'contact_reveal').length,
    requests: (targets.data ?? []).length,
  }
}
