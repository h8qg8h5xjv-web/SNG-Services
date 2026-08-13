import Link from 'next/link'
import { listAdminEvents } from '@/lib/admin/data'

export default async function AdminEventsPage() {
  const events = await listAdminEvents()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Events</h1>
        <Link
          href="/admin/events/new"
          className="min-h-11 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
        >
          New event
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-black/10 dark:border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 text-foreground/60 dark:border-white/10">
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
              <tr key={e.id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                <td className="p-3">
                  <Link href={`/admin/events/${e.id}`} className="font-medium hover:underline">
                    {e.title_en}
                  </Link>
                </td>
                <td className="p-3 text-foreground/70">{e.category}</td>
                <td className="p-3 text-foreground/70">
                  {new Date(e.starts_at).toISOString().slice(0, 16).replace('T', ' ')}
                </td>
                <td className="p-3 text-foreground/70">{e.borough}</td>
                <td className="p-3">
                  <span
                    className={
                      e.status === 'published'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-foreground/50'
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
