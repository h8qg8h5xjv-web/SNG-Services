'use server'

import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { pickProviderContent } from '@/lib/i18n/content'

// A guest's own direct bookings, read by (public_ref, guest_token) — the same
// gate as guest requests (lib/requests/guest.ts). Guests have no session and no
// RLS read on bookings, so this runs with the service role and returns only the
// pairs that match exactly, with non-contact fields. Nothing here can list or
// guess other people's bookings: a ref alone returns nothing.

const pairsSchema = z
  .array(z.object({ ref: z.string().min(1).max(20), token: z.string().length(64) }))
  .max(50)

export type GuestBooking = {
  ref: string
  status: 'pending' | 'confirmed' | 'cancelled'
  startsAt: string
  endsAt: string
  partySize: number
  pricePence: number
  providerName: string
  providerSlug: string
  categorySlug: string | null
  serviceName: string
}

const COLUMNS =
  'public_ref, guest_token, status, starts_at, ends_at, party_size, price_pence, services(name_en, name_ru), ' +
  'providers(slug, name_en, categories(slug), provider_translations(locale, name, description))'

type Row = {
  public_ref: string
  guest_token: string
  status: GuestBooking['status']
  starts_at: string
  ends_at: string
  party_size: number
  price_pence: number
  services: { name_en: string; name_ru: string | null } | null
  providers: {
    slug: string
    name_en: string
    categories: { slug: string } | null
    provider_translations: { locale: string; name: string | null; description: string | null }[]
  } | null
}

export async function getGuestBookings(input: unknown, locale: string): Promise<GuestBooking[]> {
  const parsed = pairsSchema.safeParse(input)
  if (!parsed.success || parsed.data.length === 0) return []
  const tokenByRef = new Map(parsed.data.map((p) => [p.ref, p.token]))

  const { data } = await createAdminClient()
    .from('bookings')
    .select(COLUMNS)
    .in('public_ref', [...tokenByRef.keys()])
    .returns<Row[]>()

  return (data ?? []).filter((b) => tokenByRef.get(b.public_ref) === b.guest_token).map((b) => toGuestBooking(b, locale))
}

// The signed-in user's bookings (customer_id = me), under their own session —
// RLS (bookings_select) confines it to their rows. Covers bookings made while
// signed in on another device before this browser has synced.
export async function getAccountBookings(locale: string): Promise<GuestBooking[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []
  const { data } = await supabase
    .from('bookings')
    .select(COLUMNS)
    .eq('customer_id', user.id)
    .order('starts_at', { ascending: false })
    .limit(100)
    .returns<Row[]>()
  return (data ?? []).map((b) => toGuestBooking(b, locale))
}

function toGuestBooking(b: Row, locale: string): GuestBooking {
  return {
    ref: b.public_ref,
    status: b.status,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    partySize: b.party_size,
    pricePence: b.price_pence,
    providerName: b.providers
      ? pickProviderContent({ name_en: b.providers.name_en, description_en: null }, b.providers.provider_translations, locale).name
      : '',
    providerSlug: b.providers?.slug ?? '',
    categorySlug: b.providers?.categories?.slug ?? null,
    serviceName: locale === 'ru' ? (b.services?.name_ru ?? b.services?.name_en ?? '') : (b.services?.name_en ?? ''),
  }
}
