import Link from 'next/link'
import { listAdminProviders, countUpcomingEvents, listCategories, listLanguages } from '@/lib/admin/data'
import { getAdminOverview } from '@/lib/admin/dashboard'
import QuickMaster from '@/components/admin/QuickMaster'

export const dynamic = 'force-dynamic'

export default async function AdminDashboard() {
  const [providers, upcoming, overview, categories, languages] = await Promise.all([
    listAdminProviders(),
    countUpcomingEvents(),
    getAdminOverview(7),
    listCategories(),
    listLanguages(),
  ])

  const missingRu = providers.filter(
    (p) =>
      !p.provider_translations.some(
        (t) => t.locale === 'ru' && t.description && t.description.trim(),
      ),
  )

  return (
    <div className="space-y-8">
      {/* Catalogue counters. */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Published" value={overview.published} />
        <Stat label="Drafts" value={overview.drafts} />
        <Stat label="Unclaimed" value={overview.unclaimed} />
        <Stat label="Upcoming events" value={upcoming} />
      </div>

      {/* Last 7 days. */}
      <section>
        <h2 className="mb-2 text-body font-semibold text-slate-500">Last 7 days</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Stat label="Card views" value={overview.views} />
          <Stat label="Contact opens" value={overview.contacts} />
          <StatLink label="Catalog leads" value={overview.newCatalogRequests} href="/admin/catalog-requests" />
          <StatLink label="Manual requests" value={overview.manualRequests} href="/admin/requests?filter=manual" />
          <StatLink label="Notif. queue" value={overview.unsentNotifications} href="/admin/notifications" />
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/admin/providers/new" className="min-h-11 rounded-lg bg-accent px-4 py-2 text-body font-semibold text-white">
          New provider
        </Link>
        <Link href="/admin/events/new" className="min-h-11 rounded-lg border border-slate-200 px-4 py-2 text-body font-semibold">
          New event
        </Link>
      </div>

      <QuickMaster
        categories={categories.map((c) => ({ id: c.id, name_en: c.name_en }))}
        languages={languages.map((l) => ({ code: l.code, name_native: l.name_native }))}
      />

      <div className="grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 text-body font-semibold text-slate-500">Top cards (7d)</h2>
          {overview.topCards.length === 0 ? (
            <p className="text-body text-slate-500">No views yet.</p>
          ) : (
            <ol className="divide-y divide-slate-100 text-body">
              {overview.topCards.map((c) => (
                <li key={c.providerId} className="flex justify-between py-2">
                  <Link href={`/admin/providers/${c.providerId}`} className="hover:underline">
                    {c.name}
                  </Link>
                  <span className="text-slate-500">{c.views}</span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section>
          <h2 className="mb-2 text-body font-semibold text-slate-500">Empty searches (7d)</h2>
          {overview.emptySearches.length === 0 ? (
            <p className="text-body text-slate-500">None — every search matched.</p>
          ) : (
            <ul className="divide-y divide-slate-100 text-body">
              {overview.emptySearches.map((s, i) => (
                <li key={i} className="flex justify-between gap-3 py-2">
                  <span className="truncate">{s.query}</span>
                  <span className="shrink-0 text-meta text-slate-400">
                    {new Date(s.at).toISOString().slice(0, 10)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-2 text-body font-semibold text-slate-500">
          Missing Russian description ({missingRu.length})
        </h2>
        {missingRu.length === 0 ? (
          <p className="text-body text-slate-500">All providers have a Russian description.</p>
        ) : (
          <ul className="divide-y divide-slate-100 text-body">
            {missingRu.slice(0, 15).map((p) => (
              <li key={p.id} className="py-2">
                <Link href={`/admin/providers/${p.id}`} className="hover:underline">
                  {p.name_en}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-title font-semibold">{value}</p>
      <p className="text-body text-slate-500">{label}</p>
    </div>
  )
}

function StatLink({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="rounded-lg border border-slate-200 p-4 hover:border-slate-400">
      <p className="text-title font-semibold">{value}</p>
      <p className="text-body text-slate-500">{label}</p>
    </Link>
  )
}
