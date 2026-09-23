// "Time to first value" (client side). We stamp the first visit of a tab session,
// then, at the visitor's first real action (contact reveal or request), send one
// `first_value` event with the elapsed time. Fired at most once per session.
const START_KEY = 'sng_session_start'
const SENT_KEY = 'sng_first_value_sent'

export function initSessionStart(): void {
  try {
    if (!sessionStorage.getItem(START_KEY)) {
      sessionStorage.setItem(START_KEY, String(Date.now()))
    }
  } catch {
    // private mode — first-value simply isn't measured
  }
}

export function markFirstValue(providerId?: string | null): void {
  try {
    if (sessionStorage.getItem(SENT_KEY)) return
    const startRaw = sessionStorage.getItem(START_KEY)
    const start = startRaw ? Number(startRaw) : Date.now()
    const elapsed = Math.max(0, Date.now() - start)
    sessionStorage.setItem(SENT_KEY, '1')
    const body = JSON.stringify({
      events: [{ event_type: 'first_value', provider_id: providerId ?? undefined, value_ms: elapsed }],
    })
    const blob = new Blob([body], { type: 'application/json' })
    if (!navigator.sendBeacon('/api/track', blob)) throw new Error('beacon failed')
  } catch {
    // best-effort — never block the real action
  }
}
