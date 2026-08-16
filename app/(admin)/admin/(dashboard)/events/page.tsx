import Link from 'next/link'
import { listAdminEvents } from '@/lib/admin/data'

export default async function AdminEventsPage() {
  const events = await listAdminEvents()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h2 font-semibold">Events</h1>
        <Link
          href="/admin/events/new"
          className="min-h-11 rounded-lg bg-teal-700 px-4 py-2 text-body font-semibold text-white"
        >
          New event
        </Link>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-left text-body">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Category</th>
              <th className="p-3">Starts</th>
              <th className="p-3">Borough</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-slate-100 last:border-0">
                <td className="p-3">
                  <Link href={`/admin/events/${e.id}`} className="font-semibold hover:underline">
                    {e.title_en}
                  </Link>
                </td>
                <td className="p-3 text-slate-500">{e.category}</td>
                <td className="p-3 text-slate-500">
                  {new Date(e.starts_at).toISOString().slice(0, 16).replace('T', ' ')}
                </td>
                <td className="p-3 text-slate-500">{e.borough}</td>
                <td className="p-3">
                  <span
                    className={
                      e.status === 'published'
                        ? 'text-green-700'
                        : 'text-slate-500'
                    }
                  >
                    {e.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
