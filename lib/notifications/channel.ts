// Notification channel abstraction (REQUESTS §8, §12.3). A request is offered to
// masters through a channel; the master opens the web cabinet and answers.
//
// Email/SMS/push are NOT wired yet — we ship a single ConsoleChannel that prints
// the message it WOULD send and delivers nothing. Call sites are placed exactly
// where real sending will happen (waves, match, cancel), so swapping in Resend
// later is a one-file change (see README → "Notifications"). The channel never
// carries the client's contacts or address — those appear only to the winner
// after a match (REQUESTS §8).

export type NotificationKind = 'wave' | 'match' | 'cancel'

export type ProviderNotification = {
  kind: NotificationKind
  requestRef: string
  // Who it goes to. `emails` is best-effort (the master's account email); the
  // console stand-in just prints it. A real channel sends here.
  providerId: string
  providerName: string
  emails: string[]
  subject: string
  // Plain-text body — the human-readable "email". No contacts/address before match.
  body: string
  // Deep link into the web cabinet where the buttons live.
  ctaPath: string
}

export interface NotificationChannel {
  readonly name: string
  send(message: ProviderNotification): Promise<void>
}

// The only implementation for now: prints the full message to the server console
// and returns. Nothing leaves the process.
export class ConsoleChannel implements NotificationChannel {
  readonly name = 'console'

  async send(message: ProviderNotification): Promise<void> {
    const to = message.emails.length > 0 ? message.emails.join(', ') : `${message.providerName} (no email on file)`
    const lines = [
      '',
      '──────────── notification (console stand-in, nothing sent) ────────────',
      `kind:    ${message.kind}`,
      `to:      ${to}`,
      `subject: ${message.subject}`,
      `open:    ${message.ctaPath}`,
      '',
      message.body,
      '───────────────────────────────────────────────────────────────────────',
      '',
    ]
    console.info(lines.join('\n'))
  }
}

// §5: writes each master notification to the notification_queue table so an
// admin can send it by hand (WhatsApp) until email/SMS is wired. Server-side,
// service role — bypasses RLS. Best-effort: a queue failure never breaks a flow.
export class AdminQueueChannel implements NotificationChannel {
  readonly name = 'admin_queue'

  async send(message: ProviderNotification): Promise<void> {
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const supabase = createAdminClient()
      // The admin sends via WhatsApp, so include the master's phone.
      let phone: string | null = null
      if (message.providerId) {
        const { data } = await supabase
          .from('providers')
          .select('phone')
          .eq('id', message.providerId)
          .maybeSingle()
        phone = data?.phone ?? null
      }
      await supabase.from('notification_queue').insert({
        provider_id: message.providerId || null,
        provider_name: message.providerName,
        recipient_phone: phone,
        recipient_emails: message.emails.length > 0 ? message.emails : null,
        kind: message.kind,
        request_ref: message.requestRef,
        subject: message.subject,
        body: message.body,
        cta_path: message.ctaPath,
        status: 'unsent',
      })
    } catch {
      // Never let queueing break a request/booking flow.
    }
  }
}

// Fans a message out to several channels in order. Used to keep the console
// stand-in while also queueing for the admin.
export class CompositeChannel implements NotificationChannel {
  readonly name: string
  constructor(private readonly channels: NotificationChannel[]) {
    this.name = channels.map((c) => c.name).join('+')
  }
  async send(message: ProviderNotification): Promise<void> {
    for (const c of this.channels) await c.send(message)
  }
}

// Single place that decides which channel is live. Today: console (dev insight)
// + admin queue (the actionable one). When a domain + Resend are ready, add the
// Resend channel here (README) — call sites don't change.
let channel: NotificationChannel | null = null
export function getNotificationChannel(): NotificationChannel {
  if (!channel) channel = new CompositeChannel([new ConsoleChannel(), new AdminQueueChannel()])
  return channel
}
