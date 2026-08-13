import Link from 'next/link'
import { listAdminProviders, countUpcomingEvents } from '@/lib/admin/data'

export default async function AdminDashboard() {
  const [providers, upcoming] = await Promise.all([
    listAdminProviders(),
    countUpcomingEvents(),
  ])

  const published = providers.filter((p) => p.status === 'published').length
  const drafts = providers.length - published

  // Providers missing a Russian description translation (admin-only gap indicator).
  const missingRu = providers.filter(
    (p) =>
      !p.provider_translations.some(
        (t) => t.locale === 'ru' && t.description && t.description.trim(),
      ),
  )

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Published" value={published} />
        <Stat label="Drafts" value={drafts} />
        <Stat label="Providers" value={providers.length} />
        <Stat label="Upcoming events" value={upcoming} />
      </div>

      <div className="flex gap-3">
        <Link
          href="/admin/providers/new"
          className="min-h-11 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          New provider
        </Link>
        <Link
          href="/admin/events/new"
          className="min-h-11 rounded-lg border border-black/15 px-4 py-2 text-sm font-medium dark:border-white/20"
        >
          New event
        </Link>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-foreground/70">
          Missing Russian description ({missingRu.length})
        </h2>
        {missingRu.length === 0 ? (
          <p className="text-sm text-foreground/50">All providers have a Russian description.</p>
        ) : (
          <ul className="divide-y divide-black/5 text-sm dark:divide-white/5">
            {missingRu.map((p) => (
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
    <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-foreground/60">{label}</p>
    </div>
  )
}
