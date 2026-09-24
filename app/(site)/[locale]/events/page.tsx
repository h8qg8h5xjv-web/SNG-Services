import type { Metadata } from 'next'
import { IconCalendarEvent } from '@tabler/icons-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import EventCard from '@/components/EventCard'
import { FilterChipLink } from '@/components/ui/FilterChip'
import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { listUpcomingEvents } from '@/lib/queries/events'
import { getEventsAttendance } from '@/lib/events/attendance'
import { groupEvents, type GroupKey } from '@/lib/events/group'

export const dynamic = 'force-dynamic'

const DATE_CHIPS: GroupKey[] = ['today', 'tomorrow', 'weekend', 'later']

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'events' })
  return { title: t('title') }
}

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ when?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const t = await getTranslations()

  const when: GroupKey | '' = (DATE_CHIPS as string[]).includes(sp.when ?? '')
    ? (sp.when as GroupKey)
    : ''

  const events = await listUpcomingEvents()
  const attendance = await getEventsAttendance(events.map((e) => e.id))
  const allGroups = groupEvents(events, new Date())
  const groups = when ? allGroups.filter((g) => g.key === when) : allGroups

  return (
    <>
      <div className="mx-auto w-full max-w-5xl flex-1 px-4 pb-8">
        <div className="pt-6">
          <h1 className="text-title font-extrabold tracking-tight">{t('events.title')}</h1>
          <p className="mt-2 text-slate-500">{t('events.subtitle')}</p>
        </div>

        {/* Sticky date filters. top-16 is off-scale on purpose — it clears the
            sticky site header (~64px; interface physics, DESIGN-SYSTEM §4). */}
        <div className="sticky top-16 z-10 -mx-4 mt-4 mb-6 border-b border-slate-200 bg-white px-4 py-3">
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1">
            {DATE_CHIPS.map((key) => (
              <FilterChipLink
                key={key}
                active={when === key}
                href={when === key ? '/events' : `/events?when=${key}`}
              >
                {t(`events.${key}`)}
              </FilterChipLink>
            ))}
          </div>
        </div>

        {groups.length === 0 ? (
          <EmptyState
            icon={IconCalendarEvent}
            text={t('events.emptyDay')}
            action={<ButtonLink href="/events">{t('events.seeAll')}</ButtonLink>}
          />
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="mb-4 text-h2 font-semibold">{t(`events.${group.key}`)}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.events.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      locale={locale}
                      attendance={attendance.get(event.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
