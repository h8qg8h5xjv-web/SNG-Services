import { useTranslations } from 'next-intl'
import type { EventAttendance } from '@/lib/events/attendance'

// §4 "Идут N человек" + up to 5 initial circles. `dark` styles it for the card
// overlay (white on the cover gradient); default is the light detail page.
export default function Attendance({
  data,
  dark = false,
}: {
  data: EventAttendance
  dark?: boolean
}) {
  const t = useTranslations('events')
  if (data.total === 0) return null

  const circle = dark
    ? 'bg-white/90 text-slate-900 ring-slate-900/10'
    : 'bg-accent-soft text-accent ring-white'
  const text = dark ? 'text-white' : 'text-slate-500'

  return (
    <div className="flex items-center gap-2">
      {data.initials.length > 0 && (
        <div className="flex -space-x-2">
          {data.initials.map((ini, i) => (
            <span
              key={i}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-label font-semibold ring-2 ${circle}`}
            >
              {ini}
            </span>
          ))}
        </div>
      )}
      <span className={`text-meta font-semibold ${text}`}>{t('going', { count: data.total })}</span>
    </div>
  )
}
