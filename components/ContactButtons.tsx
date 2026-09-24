'use client'

import { useTranslations } from 'next-intl'
import { IconPhone, IconMessage, IconWorld } from '@tabler/icons-react'
import type { ContactChannel } from '@/types/database'
import { markFirstValue } from '@/lib/tracking/first-value'

// Public card contact actions (idea #4): Call / Message / Website. A click logs a
// pseudonymous contact_reveal event (channel only, no IP / user-agent) via the
// same /api/track beacon as impressions, then follows the link. v2 outline
// buttons on day surfaces.
const PILL = 'btn btn-line btn-sm'

function track(providerId: string, channel: ContactChannel, locale: string) {
  // Opening a contact is a "first value" action (§ metric #1).
  markFirstValue(providerId)
  const body = JSON.stringify({
    events: [
      {
        provider_id: providerId,
        event_type: 'contact_reveal',
        surface: 'provider',
        contact_channel: channel,
        locale,
      },
    ],
  })
  try {
    const blob = new Blob([body], { type: 'application/json' })
    if (!navigator.sendBeacon('/api/track', blob)) throw new Error('beacon failed')
  } catch {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  }
}

export default function ContactButtons({
  providerId,
  locale,
  phone,
  website,
  waText,
}: {
  providerId: string
  locale: string
  phone: string | null
  website: string | null
  waText?: string
}) {
  const t = useTranslations('provider')
  // §6: Call and Message both come from the phone; no phone → neither button.
  // "Message" opens WhatsApp with the number stripped to digits and a prefilled text.
  const waNumber = phone ? phone.replace(/[^0-9]/g, '') : ''
  const waHref = waNumber
    ? `https://wa.me/${waNumber}${waText ? `?text=${encodeURIComponent(waText)}` : ''}`
    : ''
  if (!phone && !website) return null

  return (
    <div className="contacts">
      {phone && (
        <a
          href={`tel:${phone}`}
          className={PILL}
          onClick={() => track(providerId, 'call', locale)}
        >
          <IconPhone stroke={1.75} aria-hidden="true" />
          {t('call')}
        </a>
      )}
      {waNumber && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className={PILL}
          onClick={() => track(providerId, 'message', locale)}
        >
          <IconMessage stroke={1.75} aria-hidden="true" />
          {t('message')}
        </a>
      )}
      {website && (
        <a
          href={website}
          target="_blank"
          rel="noopener noreferrer"
          className={PILL}
          onClick={() => track(providerId, 'website', locale)}
        >
          <IconWorld stroke={1.75} aria-hidden="true" />
          {t('website')}
        </a>
      )}
    </div>
  )
}
