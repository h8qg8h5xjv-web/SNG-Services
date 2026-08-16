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
        <h1 className="text-h2 font-semibold">Providers</h1>
        <Link
          href="/admin/providers/new"
          className="min-h-11 rounded-lg bg-teal-700 px-4 py-2 text-body font-semibold text-white"
        >
          New provider
        </Link>
      </div>

      {/* Seed verifications are demo data, not real checks — this filter finds
          every provider still relying on one so they can be handled before launch. */}
      <div className="flex items-center gap-3 text-body">
        <Link
          href="/admin/providers"
          className={`rounded-lg px-3 py-1 ${
            seedOnly ? 'text-slate-500 hover:underline' : 'bg-teal-700 font-semibold text-white'
          }`}
        >
          Все
        </Link>
        <Link
          href="/admin/providers?filter=seed"
          className={`rounded-lg px-3 py-1 ${
            seedOnly ? 'bg-teal-700 font-semibold text-white' : 'text-slate-500 hover:underline'
          }`}
        >
          Подтверждения из сида ({seedCount})
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-body">
          <thead className="border-b border-slate-200 text-slate-500">
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
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="p-3">
                    <Link href={`/admin/providers/${p.id}`} className="font-semibold hover:underline">
                      {p.name_en}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-500">{p.categories?.slug}</td>
                  <td className="p-3 text-slate-500">{p.borough}</td>
                  <td className="p-3 text-slate-500">{p.fulfillment_type}</td>
                  <td className="p-3 text-slate-500">
                    {verified}✓ / {p.provider_languages.length}
                    {seeded && (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-meta text-slate-500">
                        seed
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        p.status === 'published'
                          ? 'text-green-700'
                          : 'text-slate-500'
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
