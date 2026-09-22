import { createAdminClient } from '@/lib/supabase/admin'
import { loadMatchPool } from '@/lib/requests/advance'
import { eligibleProviderIds } from '@/lib/requests/match'
import { formatPrice } from '@/lib/format'

// §1 admin queue. All requests, newest first, each with the client's contacts and
// the masters who would fit — so an admin can hand a manual request off by hand.
// Admin-gated by the dashboard layout; reads run through the service role.

export type EligibleMaster = {
  id: string
  name: string
  phone: string | null
  borough: string
  slug: string
}

export type AdminRequest = {
  id: string
  publicRef: string
  type: 'fixed' | 'quote'
  status: string
  borough: string
  urgency: string
  description: string | null
  budgetMaxPence: number | null
  regulatedKind: string | null
  createdAt: string
  handledAt: string | null
  handledTo: string | null
  contact: { name: string; phone: string; email: string | null; postcode: string | null } | null
  masters: EligibleMaster[]
  masterMessage: string
}

type RequestRow = {
  id: string
  public_ref: string
  type: string
  status: string
  category_id: string
  borough: string
  urgency: string
  description: string | null
  budget_max_pence: number | null
  target_provider_id: string | null
  regulated_kind: string | null
  created_at: string
  manual_handled_at: string | null
  manual_handled_to: string | null
  request_contacts:
    | { contact_name: string; contact_phone: string; contact_email: string | null; postcode: string | null }
    | { contact_name: string; contact_phone: string; contact_email: string | null; postcode: string | null }[]
    | null
}

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

function buildMessage(r: RequestRow, contactName: string, contactPhone: string): string {
  const lines = [
    'Здравствуйте! Заявка через SNG Services.',
    `Категория/район: ${r.borough}`,
    r.description ? `Задача: ${r.description}` : null,
    r.budget_max_pence != null ? `Бюджет: до ${formatPrice(r.budget_max_pence)}` : null,
    `Клиент: ${contactName}, ${contactPhone}`,
    `Кабинет мастера: ${siteUrl}/ru/cabinet`,
  ]
  return lines.filter(Boolean).join('\n')
}

export async function listAdminRequests(): Promise<AdminRequest[]> {
  const supabase = createAdminClient()
  const now = new Date()

  const { data } = await supabase
    .from('requests')
    .select(
      'id, public_ref, type, status, category_id, borough, urgency, description, budget_max_pence, ' +
        'target_provider_id, regulated_kind, created_at, manual_handled_at, manual_handled_to, ' +
        'request_contacts(contact_name, contact_phone, contact_email, postcode)',
    )
    .order('created_at', { ascending: false })
    .returns<RequestRow[]>()

  const rows = data ?? []
  if (rows.length === 0) return []

  const pool = await loadMatchPool(supabase, now)
  const { data: provs } = await supabase
    .from('providers')
    .select('id, name_en, phone, borough, slug')
    .eq('status', 'published')
  const byId = new Map((provs ?? []).map((p) => [p.id, p]))

  return rows.map((r) => {
    const c = Array.isArray(r.request_contacts) ? r.request_contacts[0] : r.request_contacts
    const ids = eligibleProviderIds(
      {
        type: r.type as 'fixed' | 'quote',
        category_id: r.category_id,
        borough: r.borough,
        budget_max_pence: r.budget_max_pence,
        target_provider_id: r.target_provider_id,
        regulated_kind: r.regulated_kind as 'gas' | 'electrical' | 'other' | null,
      },
      pool,
      now,
    )
    const masters: EligibleMaster[] = ids.flatMap((id) => {
      const p = byId.get(id)
      return p ? [{ id, name: p.name_en, phone: p.phone, borough: p.borough, slug: p.slug }] : []
    })
    return {
      id: r.id,
      publicRef: r.public_ref,
      type: r.type as 'fixed' | 'quote',
      status: r.status,
      borough: r.borough,
      urgency: r.urgency,
      description: r.description,
      budgetMaxPence: r.budget_max_pence,
      regulatedKind: r.regulated_kind,
      createdAt: r.created_at,
      handledAt: r.manual_handled_at,
      handledTo: r.manual_handled_to,
      contact: c
        ? { name: c.contact_name, phone: c.contact_phone, email: c.contact_email, postcode: c.postcode }
        : null,
      masters,
      masterMessage: buildMessage(r, c?.contact_name ?? '—', c?.contact_phone ?? '—'),
    }
  })
}

export async function getManualRequestCount(): Promise<number> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('requests')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'manual')
  return count ?? 0
}
