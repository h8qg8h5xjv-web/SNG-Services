'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { IconShare } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import Select from '@/components/ui/Select'
import SaveHeart from '@/components/SaveHeart'
import WeekPicker from '@/components/booking/WeekPicker'
import { useMagnetic } from '@/components/ui/useMagnetic'
import { toast } from '@/components/ui/Toast'
import { formatPrice } from '@/lib/format'
import type { FlowService } from '@/components/booking/BookingFlow'

// «Свободные окна» on a listing (DEMO_MAP §3.2 aside): real slots for the
// chosen service; a time goes straight to the details step of the booking.
export default function ListingWeek({
  base,
  slug,
  services,
  todayIso,
}: {
  base: string // /{category}/{slug}
  slug: string
  services: FlowService[]
  todayIso: string
}) {
  const t = useTranslations('listing')
  const [svc, setSvc] = useState(services[0]?.id ?? '')
  const bookRef = useMagnetic<HTMLAnchorElement>()
  const service = services.find((s) => s.id === svc)

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast(t('shareCopied'))
    } catch {
      toast(t('shareFailed'))
    }
  }

  return (
    <aside className="card week" aria-labelledby="week-h">
      <h2 id="week-h" className="h3">
        {t('freeWindows')}
      </h2>
      <p className="week-sub">{t('freeWindowsSub')}</p>
      {services.length > 1 && (
        <Select
          value={svc}
          onChange={setSvc}
          variant="pill"
          ariaLabel={t('serviceFor')}
          title={t('serviceFor')}
          options={services.map((s) => ({ value: s.id, label: `${s.name} · ${formatPrice(s.pricePence)}` }))}
        />
      )}
      {service && (
        <WeekPicker
          key={service.id}
          serviceId={service.id}
          todayIso={todayIso}
          isGroup={service.capacity > 1}
          hrefFor={(s) => `${base}/book?step=details&svc=${encodeURIComponent(service.id)}&slot=${encodeURIComponent(s.start)}`}
        />
      )}
      <div className="week-cta">
        <Link ref={bookRef} href={`${base}/book${svc ? `?svc=${encodeURIComponent(svc)}` : ''}`} className="btn btn-amber magnetic">
          {t('bookCta')}
        </Link>
        <SaveHeart slug={slug} variant="inline" />
        <button type="button" className="icon-btn lined" aria-label={t('share')} onClick={share}>
          <IconShare stroke={1.75} aria-hidden="true" />
        </button>
      </div>
    </aside>
  )
}
