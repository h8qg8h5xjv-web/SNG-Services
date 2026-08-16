import { listAdminBookings, listProviderOptions } from '@/lib/admin/data'
import BookingStatus from '@/components/admin/BookingStatus'
import { formatPrice } from '@/lib/format'

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
      <h1 className="text-h2 font-semibold">Bookings</h1>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="text-body">
          <span className="text-slate-500">Provider</span>
          <select
            name="provider"
            defaultValue={sp.provider ?? ''}
            className="mt-1 block min-h-11 rounded-lg border border-slate-200 bg-transparent px-3"
          >
            <option value="">All</option>
            {providerOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_en}
              </option>
            ))}
          </select>
        </label>
        <label className="text-body">
          <span className="text-slate-500">Date</span>
          <input
            type="date"
            name="date"
            defaultValue={sp.date ?? ''}
            className="mt-1 block min-h-11 rounded-lg border border-slate-200 bg-transparent px-3"
          />
        </label>
        <button className="min-h-11 rounded-lg border border-slate-200 px-4 text-body">
          Filter
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-body">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="p-3">When</th>
              <th className="p-3">Provider</th>
              <th className="p-3">Service</th>
              <th className="p-3">Price</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Ppl</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-b border-slate-100 last:border-0">
                <td className="p-3 text-slate-500">
                  {new Date(b.starts_at).toISOString().slice(0, 16).replace('T', ' ')}
                </td>
                <td className="p-3">{b.providers?.name_en}</td>
                <td className="p-3 text-slate-500">{b.services?.name_en}</td>
                {/* Locked at booking time (bookings.price_pence), not the live service price. */}
                <td className="p-3 text-slate-500">
                  {formatPrice(b.price_pence)}
                  <span className="text-meta text-slate-400"> · {b.duration_min}′</span>
                </td>
                <td className="p-3">
                  <div>{b.customer_name}</div>
                  <div className="text-meta text-slate-500">{b.customer_phone}</div>
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
