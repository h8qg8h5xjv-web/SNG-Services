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

// Single place that decides which channel is live. When a domain + Resend are
// ready, return the Resend channel here (README) — call sites don't change.
let channel: NotificationChannel | null = null
export function getNotificationChannel(): NotificationChannel {
  if (!channel) channel = new ConsoleChannel()
  return channel
}
