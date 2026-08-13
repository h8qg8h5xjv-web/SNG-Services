import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Header from '@/components/Header'
import EventFilters from '@/components/EventFilters'
import EventCard from '@/components/EventCard'
import {
  listUpcomingEvents,
  listEventBoroughs,
  type EventFilters as Filters,
} from '@/lib/queries/events'
import { groupEvents } from '@/lib/events/group'
import { EVENT_CATEGORIES } from '@/lib/events/constants'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'events' })
  return { title: t('title') }
}

function parsePrice(value: string | undefined): '' | 'free' | 'paid' {
  return value === 'free' || value === 'paid' ? value : ''
}

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ category?: string; borough?: string; price?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const sp = await searchParams
  const t = await getTranslations()

  const category =
    sp.category && (EVENT_CATEGORIES as string[]).includes(sp.category)
      ? sp.category
      : ''
  const borough = sp.borough ?? ''
  const price = parsePrice(sp.price)

  const filters: Filters = {}
  if (category) filters.category = category
  if (borough) filters.borough = borough
  if (price) filters.price = price

  const [events, boroughs] = await Promise.all([
    listUpcomingEvents(filters),
    listEventBoroughs(),
  ])
  const groups = groupEvents(events, new Date())

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-12">
        <h1 className="py-6 text-2xl font-semibold">{t('events.title')}</h1>

        <div className="mb-6">
          <EventFilters
            boroughs={boroughs}
            currentCategory={category}
            currentBorough={borough}
            currentPrice={price}
          />
        </div>

        {groups.length === 0 ? (
          <p className="rounded-lg border border-dashed border-black/15 p-8 text-center text-foreground/60 dark:border-white/15">
            {t('events.empty')}
          </p>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="mb-3 text-lg font-medium">
                  {t(`events.${group.key}`)}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {group.events.map((event) => (
                    <EventCard key={event.id} event={event} locale={locale} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  )
}
