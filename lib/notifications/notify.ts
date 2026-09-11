import { createAdminClient } from '@/lib/supabase/admin'
import { formatPrice } from '@/lib/format'
import { getNotificationChannel, type ProviderNotification } from './channel'

// Builds and dispatches provider notifications, and records the fact in
// request_targets (notified_at + channel) exactly as a real send would. All
// content is broadcast-safe: never the client's name, phone, email or address.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

type RequestSummary = {
  public_ref: string
  type: string
  urgency: string
  description: string | null
  budget_max_pence: number | null
  postcode_outward: string | null
  borough: string
  serviceName: string | null
  servicePrice: number | null
  windows: { starts_at: string; ends_at: string }[]
}

async function loadSummary(requestId: string): Promise<RequestSummary | null> {
  const supabase = createAdminClient()
  const { data: r } = await supabase
    .from('requests')
    .select('public_ref, type, urgency, description, budget_max_pence, postcode_outward, borough, service_id')
    .eq('id', requestId)
    .maybeSingle()
  if (!r) return null
  const { data: windows } = await supabase
    .from('request_windows')
    .select('starts_at, ends_at')
    .eq('request_id', requestId)
    .order('starts_at', { ascending: true })
  let serviceName: string | null = null
  let servicePrice: number | null = null
  if (r.service_id) {
    const { data: s } = await supabase
      .from('services')
      .select('name_en, price_pence')
      .eq('id', r.service_id)
      .maybeSingle()
    serviceName = s?.name_en ?? null
    servicePrice = s?.price_pence ?? null
  }
  return { ...r, serviceName, servicePrice, windows: windows ?? [] }
}

// Best-effort recipient emails: the master's account address(es). A real channel
// would honour per-master notification prefs (12.3); the console stand-in just
// prints them.
async function providerEmails(providerId: string): Promise<string[]> {
  const supabase = createAdminClient()
  const { data: members } = await supabase
    .from('provider_members')
    .select('user_id')
    .eq('provider_id', providerId)
  const emails: string[] = []
  for (const m of members ?? []) {
    try {
      const { data } = await supabase.auth.admin.getUserById(m.user_id)
      if (data.user?.email) emails.push(data.user.email)
    } catch {
      // ignore — console channel doesn't need a real address
    }
  }
  return emails
}

async function providerName(providerId: string): Promise<string> {
  const supabase = createAdminClient()
  const { data } = await supabase.from('providers').select('name_en').eq('id', providerId).maybeSingle()
  return data?.name_en ?? 'Master'
}

function fmtWindows(s: RequestSummary): string {
  if (s.windows.length === 0) return '—'
  const f = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
  return s.windows.map((w) => `${f.format(new Date(w.starts_at))}–${f.format(new Date(w.ends_at))}`).join('; ')
}

function waveBody(s: RequestSummary): string {
  const price =
    s.type === 'fixed' && s.servicePrice != null
      ? `Price: ${formatPrice(s.servicePrice)}`
      : s.budget_max_pence != null
        ? `Client budget: up to ${formatPrice(s.budget_max_pence)}`
        : 'Client budget: not set (quote)'
  return [
    `New request ${s.public_ref}.`,
    s.serviceName ? `Service: ${s.serviceName}` : null,
    s.description ? `Task: ${s.description}` : null,
    `Area: ${s.borough}${s.postcode_outward ? ` (${s.postcode_outward})` : ''}`,
    `When: ${fmtWindows(s)}`,
    `Urgency: ${s.urgency}`,
    price,
    '',
    'Open the cabinet to take it or pass. Client contacts appear only after you take it.',
  ]
    .filter((l): l is string => l !== null)
    .join('\n')
}

// Wave notifications (REQUESTS §5/§8). Idempotent: only targets not yet notified
// are sent, and notified_at guards a re-run from sending twice. Covers waves
// 1, 2 and 3 uniformly — each wave adds targets, and they get picked up here.
export async function notifyNewTargets(requestId: string): Promise<number> {
  const supabase = createAdminClient()
  const { data: targets } = await supabase
    .from('request_targets')
    .select('provider_id')
    .eq('request_id', requestId)
    .is('notified_at', null)
  if (!targets || targets.length === 0) return 0

  const summary = await loadSummary(requestId)
  if (!summary) return 0
  const channel = getNotificationChannel()
  let sent = 0

  for (const t of targets) {
    const [name, emails] = await Promise.all([
      providerName(t.provider_id),
      providerEmails(t.provider_id),
    ])
    const message: ProviderNotification = {
      kind: 'wave',
      requestRef: summary.public_ref,
      providerId: t.provider_id,
      providerName: name,
      emails,
      subject: `New request ${summary.public_ref}`,
      body: waveBody(summary),
      ctaPath: `${SITE_URL}/en/business/requests`,
    }
    await channel.send(message)
    // Record the send exactly as a real channel would.
    await supabase
      .from('request_targets')
      .update({ notified_at: new Date().toISOString(), channel: channel.name })
      .eq('request_id', requestId)
      .eq('provider_id', t.provider_id)
    sent++
  }
  return sent
}

// Match: tell the winning master the job is theirs and the client's details are
// now visible in the cabinet.
export async function notifyMatch(requestId: string, providerId: string): Promise<void> {
  const summary = await loadSummary(requestId)
  if (!summary) return
  const [name, emails] = await Promise.all([providerName(providerId), providerEmails(providerId)])
  await getNotificationChannel().send({
    kind: 'match',
    requestRef: summary.public_ref,
    providerId,
    providerName: name,
    emails,
    subject: `Request ${summary.public_ref} is yours`,
    body: [
      `You took request ${summary.public_ref}.`,
      'The client\'s contacts and full address are now in your cabinet.',
    ].join('\n'),
    ctaPath: `${SITE_URL}/en/business/requests`,
  })
}

// Cancel: tell everyone who was asked that it's off, so they stop considering it.
export async function notifyCancel(requestId: string): Promise<void> {
  const supabase = createAdminClient()
  const summary = await loadSummary(requestId)
  if (!summary) return
  const { data: targets } = await supabase
    .from('request_targets')
    .select('provider_id')
    .eq('request_id', requestId)
  const channel = getNotificationChannel()
  for (const t of targets ?? []) {
    const [name, emails] = await Promise.all([
      providerName(t.provider_id),
      providerEmails(t.provider_id),
    ])
    await channel.send({
      kind: 'cancel',
      requestRef: summary.public_ref,
      providerId: t.provider_id,
      providerName: name,
      emails,
      subject: `Request ${summary.public_ref} cancelled`,
      body: `Request ${summary.public_ref} was cancelled by the client. No action needed.`,
      ctaPath: `${SITE_URL}/en/business/requests`,
    })
  }
}
