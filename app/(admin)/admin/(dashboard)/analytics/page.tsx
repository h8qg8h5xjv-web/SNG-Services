import { getProviderStats, defaultDateRange } from '@/lib/tracking/events'

const isDate = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const sp = await searchParams
  const fallback = defaultDateRange()
  const from = isDate(sp.from) ? sp.from : fallback.from
  const to = isDate(sp.to) ? sp.to : fallback.to

  const stats = await getProviderStats(`${from}T00:00:00Z`, `${to}T23:59:59Z`)

  return (
    <div className="space-y-4">
      <h1 className="text-h2 font-semibold">Analytics</h1>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-body">
          <span className="text-slate-500">From</span>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="mt-1 block min-h-11 rounded-lg border border-slate-200 bg-transparent px-3"
          />
        </label>
        <label className="text-body">
          <span className="text-slate-500">To</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="mt-1 block min-h-11 rounded-lg border border-slate-200 bg-transparent px-3"
          />
        </label>
        <button className="min-h-11 rounded-lg border border-slate-200 px-4 text-body">
          Apply
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-body">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="p-3">Provider</th>
              <th className="p-3">Impressions</th>
              <th className="p-3">Clicks</th>
              <th className="p-3">CTR</th>
              <th className="p-3">Bookings</th>
            </tr>
          </thead>
          <tbody>
            {stats.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No events in this period.
                </td>
              </tr>
            ) : (
              stats.map((s) => (
                <tr key={s.providerId} className="border-b border-slate-100 last:border-0">
                  <td className="p-3 font-semibold">{s.name}</td>
                  <td className="p-3">{s.impressions}</td>
                  <td className="p-3">{s.clicks}</td>
                  <td className="p-3">{(s.ctr * 100).toFixed(1)}%</td>
                  <td className="p-3">{s.bookings}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
