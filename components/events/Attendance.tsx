import { useTranslations } from 'next-intl'
import type { EventAttendance } from '@/lib/events/attendance'

// "Идут N человек" + up to 5 initial circles (names are never shown in full).
export default function Attendance({ data }: { data: EventAttendance }) {
  const t = useTranslations('events')
  if (data.total === 0) return null

  return (
    <div className="avatars">
      {data.initials.length > 0 && (
        <span className="stack" aria-hidden="true">
          {data.initials.map((ini, i) => (
            <i key={i}>{ini}</i>
          ))}
        </span>
      )}
      <span>{t('going', { count: data.total })}</span>
    </div>
  )
}
