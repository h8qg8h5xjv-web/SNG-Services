import { listAdminBookings, listProviderOptions } from '@/lib/admin/data'
import BookingStatus from '@/components/admin/BookingStatus'

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ provider?: string; date?: string }>
}) {
  const sp = await searchParams
  const [bookings, providerOptions] = await Promise.all([
    listAdminBookings({ providerId: sp.provider, date: sp.date }),
    listProviderOptions(),
  ])

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Bookings</h1>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="text-foreground/60">Provider</span>
          <select
            name="provider"
            defaultValue={sp.provider ?? ''}
            className="mt-1 block min-h-11 rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
          >
            <option value="">All</option>
            {providerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_en}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-foreground/60">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={sp.date ?? ''}
            className="mt-1 block min-h-11 rounded-lg border border-black/15 bg-transparent px-3 dark:border-white/20"
          />
        </label>
        <button className="min-h-11 rounded-lg border border-black/15 px-4 text-sm dark:border-white/20">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-foreground/60 dark:border-white/10">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Service</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Ppl</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="p-3 text-foreground/70">
                  {new Date(b.starts_at).toISOString().slice(0, 16).replace('T', ' ')}
                </td>
                <td className="p-3">{b.providers?.name_en}</td>
                <td className="p-3 text-foreground/70">{b.services?.name_en}</td>
                <td className="p-3">
                  <div>{b.customer_name}</div>
                  <div className="text-xs text-foreground/50">{b.customer_phone}</div>
                </td>
                <td className="p-3">{b.party_size}</td>
                <td className="p-3">
                  <BookingStatus id={b.id} status={b.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
