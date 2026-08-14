import { getTranslations } from 'next-intl/server'
import { DAY_KEYS, parseOpeningHours, type DayKey } from '@/lib/hours'
import OpeningHoursLive from './OpeningHoursLive'

// Server wrapper: parse the jsonb, resolve translated strings and locale-aware
// day labels, then hand off to the client component that computes the
// time-dependent "today" / "open now" (see OpeningHoursLive for why).
export default async function OpeningHours({
  hours,
  locale,
}: {
  hours: unknown
  locale: string
}) {
  const parsed = parseOpeningHours(hours)
  if (!parsed || Object.keys(parsed).length === 0) return null

  const t = await getTranslations({ locale, namespace: 'provider' })
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  // 2024-01-01 is a Monday — index days off it for locale-aware short names.
  const dayLabels = Object.fromEntries(
    DAY_KEYS.map((day, i) => [day, weekday.format(new Date(Date.UTC(2024, 0, 1 + i)))]),
  ) as Record<DayKey, string>

  return (
    <OpeningHoursLive
      hours={parsed}
      dayLabels={dayLabels}
      labels={{
        title: t('hours'),
        openNow: t('openNow'),
        closedNow: t('closedNow'),
        closed: t('closed'),
      }}
    />
  )
}
