import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import NightHeader from '@/components/site/NightHeader'
import EventRow from '@/components/events/EventRow'
import FlipList from '@/components/catalog/FlipList'
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

  const shown = groups.reduce((n, g) => n + g.events.length, 0)

  return (
    <>
      <NightHeader>
        <h1 className="ph1">{t('events.title')}</h1>
        <p className="sub">{t('events.subtitle')}</p>
        <nav className="catnav" aria-label={t('events2.whenNav')}>
          <Link href="/events" className="chip" aria-current={when === '' ? 'page' : undefined} scroll={false}>
            {t('events2.all')}
          </Link>
          {DATE_CHIPS.map((key) => (
            <Link
              key={key}
              href={when === key ? '/events' : `/events?when=${key}`}
              className="chip"
              aria-current={when === key ? 'page' : undefined}
              scroll={false}
            >
              {t(`events.${key}`)}
            </Link>
          ))}
        </nav>
      </NightHeader>

      <div className="wrap page">
        {groups.length === 0 ? (
          <EmptyState
            className="mt-10"
            mark="—"
            title={t('events.emptyDay')}
            text={t('events.empty')}
            action={
              <Link href="/events" className="btn btn-ink">
                {t('events.seeAll')}
              </Link>
            }
          />
        ) : (
          <>
            <div className="res-head mt-6">
              <h2 className="res-count" aria-live="polite">
                {t('events2.count', { n: shown })}
              </h2>
            </div>
            {groups.map((group) => (
              <section key={group.key} className="ev-group" aria-labelledby={`evg-${group.key}`}>
                <h2 id={`evg-${group.key}`}>{t(`events.${group.key}`)}</h2>
                <FlipList className="evlist">
                  {group.events.map((event) => (
                    <EventRow key={event.id} event={event} locale={locale} attendance={attendance.get(event.id)} />
                  ))}
                </FlipList>
              </section>
            ))}
          </>
        )}
      </div>
    </>
  )
}
