import { getProviderStats, getFirstValueMedian, defaultDateRange } from '@/lib/tracking/events'
import { getBookingLeadTimes } from '@/lib/admin/lead-time'
import { formatLead, type LeadStat } from '@/lib/admin/lead-time-stats'

const isDate = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

// "N сек" from ms, one decimal under a minute.
function formatMs(ms: number): string {
  const s = ms / 1000
  return s < 60 ? `${s.toFixed(1)} сек` : `${Math.round(s / 60)} мин ${Math.round(s % 60)} сек`
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const sp = await searchParams
  const fallback = defaultDateRange()
  const from = isDate(sp.from) ? sp.from : fallback.from
  const to = isDate(sp.to) ? sp.to : fallback.to

  const [stats, firstValue, lead] = await Promise.all([
    getProviderStats(`${from}T00:00:00Z`, `${to}T23:59:59Z`),
    getFirstValueMedian(`${from}T00:00:00Z`, `${to}T23:59:59Z`),
    getBookingLeadTimes(30),
  ])
  const leadRows: LeadStat[] = lead.overall ? [...lead.byCategory, lead.overall] : []
  // Goal: a real action within 60s of arriving.
  const withinGoal = firstValue.medianMs != null && firstValue.medianMs <= 60_000

  return (
    <div className="space-y-4">
      <h1 className="text-h2 font-semibold">Analytics</h1>

      {/* Time to first value — the headline metric (goal &lt; 60s). */}
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-slate-500">Время до первой пользы (медиана)</p>
        <p className="mt-1 text-h2 font-semibold">
          {firstValue.medianMs != null ? (
            <span className={withinGoal ? 'text-green-700' : 'text-red-700'}>
              {formatMs(firstValue.medianMs)}
            </span>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </p>
        <p className="mt-1 text-meta text-slate-400">
          Цель: до 60 сек · выборка: {firstValue.count}
        </p>
      </div>

      {/* How far ahead people book: sets the horizon of «Ближайшие окна». */}
      <div className="rounded-lg border border-slate-200 p-4">
        <p className="text-slate-500">Время до записи (starts_at − created_at), последние 30 дней</p>
        <p className="mt-1 text-meta text-slate-400">
          По дате создания брони, без отменённых · не зависит от периода ниже
        </p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-body">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr>
                <th className="py-2 pr-3">Категория</th>
                <th className="py-2 pr-3">Броней</th>
                <th className="py-2 pr-3">p25</th>
                <th className="py-2 pr-3">Медиана</th>
                <th className="py-2 pr-3">p75</th>
              </tr>
            </thead>
            <tbody>
              {leadRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-center text-slate-500">
                    Нет броней за 30 дней.
                  </td>
                </tr>
              ) : (
                leadRows.map((r) => (
                  <tr
                    key={r.category}
                    className={`border-b border-slate-100 last:border-0 ${r.category === 'all' ? 'font-semibold' : ''}`}
                  >
                    <td className="py-2 pr-3">{r.category === 'all' ? 'Все категории' : r.category}</td>
                    <td className="py-2 pr-3">{r.n}</td>
                    <td className="py-2 pr-3">{formatLead(r.p25)}</td>
                    <td className="py-2 pr-3">{formatLead(r.median)}</td>
                    <td className="py-2 pr-3">{formatLead(r.p75)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
