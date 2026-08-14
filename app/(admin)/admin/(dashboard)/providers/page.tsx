import Link from 'next/link'
import { listAdminProviders } from '@/lib/admin/data'

export default async function AdminProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const seedOnly = filter === 'seed'

  const all = await listAdminProviders()
  const hasSeed = (p: (typeof all)[number]) =>
    p.provider_languages.some((l) => l.method === 'seed')
  const providers = seedOnly ? all.filter(hasSeed) : all
  const seedCount = all.filter(hasSeed).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Providers</h1>
        <Link
          href="/admin/providers/new"
          className="min-h-11 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          New provider
        </Link>
      </div>

      {/* Seed verifications are demo data, not real checks — this filter finds
          every provider still relying on one so they can be handled before launch. */}
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/admin/providers"
          className={`rounded-lg px-3 py-1 ${
            seedOnly ? 'text-foreground/60 hover:underline' : 'bg-foreground font-medium text-background'
          }`}
        >
          Все
        </Link>
        <Link
          href="/admin/providers?filter=seed"
          className={`rounded-lg px-3 py-1 ${
            seedOnly ? 'bg-foreground font-medium text-background' : 'text-foreground/60 hover:underline'
          }`}
        >
          Подтверждения из сида ({seedCount})
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-foreground/60 dark:border-white/10">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Category</th>
              <th className="p-3">Borough</th>
              <th className="p-3">Type</th>
              <th className="p-3">Langs</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {providers.map((p) => {
              const verified = p.provider_languages.filter((l) => l.status === 'verified').length
              const seeded = p.provider_languages.some((l) => l.method === 'seed')
              return (
                <tr key={p.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="p-3">
                    <Link href={`/admin/providers/${p.id}`} className="font-medium hover:underline">
                      {p.name_en}
                    </Link>
                  </td>
                  <td className="p-3 text-foreground/70">{p.categories?.slug}</td>
                  <td className="p-3 text-foreground/70">{p.borough}</td>
                  <td className="p-3 text-foreground/70">{p.fulfillment_type}</td>
                  <td className="p-3 text-foreground/70">
                    {verified}✓ / {p.provider_languages.length}
                    {seeded && (
                      <span className="ml-2 rounded-full bg-slate-500/15 px-2 py-0.5 text-xs text-slate-600 dark:text-slate-300">
                        seed
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        p.status === 'published'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-foreground/50'
                      }
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
