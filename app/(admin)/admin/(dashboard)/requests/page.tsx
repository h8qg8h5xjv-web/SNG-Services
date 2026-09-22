import Link from 'next/link'
import { listAdminRequests } from '@/lib/admin/requests'
import RequestHandoff from '@/components/admin/RequestHandoff'

export const dynamic = 'force-dynamic'

// §1 request queue. All requests newest first; a "manual" filter surfaces the
// ones that need a hand-off (too few eligible masters to broadcast).
export default async function AdminRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams
  const manualOnly = filter === 'manual'
  const all = await listAdminRequests()
  const requests = manualOnly ? all.filter((r) => r.status === 'manual') : all
  const manualCount = all.filter((r) => r.status === 'manual').length

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-h2 font-semibold">Requests</h1>
        <div className="flex gap-2 text-meta">
          <Link
            href="/admin/requests"
            className={`min-h-9 rounded-lg border px-3 py-1.5 ${manualOnly ? 'border-slate-300 text-slate-500' : 'border-slate-900 font-semibold'}`}
          >
            All ({all.length})
          </Link>
          <Link
            href="/admin/requests?filter=manual"
            className={`min-h-9 rounded-lg border px-3 py-1.5 ${manualOnly ? 'border-slate-900 font-semibold' : 'border-slate-300 text-slate-500'}`}
          >
            Manual ({manualCount})
          </Link>
        </div>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
          No requests.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">#{r.publicRef}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-meta ${r.status === 'manual' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}
                  >
                    {r.status}
                  </span>
                  <span className="text-meta text-slate-500">{r.type}</span>
                  {r.regulatedKind && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-meta text-red-800">
                      regulated: {r.regulatedKind}
                    </span>
                  )}
                </div>
                <span className="text-meta text-slate-500">
                  {new Date(r.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                </span>
              </div>

              <div className="mt-3 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-meta font-semibold text-slate-500">Client</p>
                  {r.contact ? (
                    <div className="text-body">
                      <div>{r.contact.name}</div>
                      <div className="text-meta text-slate-500">{r.contact.phone}</div>
                      {r.contact.email && <div className="text-meta text-slate-500">{r.contact.email}</div>}
                      <div className="text-meta text-slate-500">
                        {[r.borough, r.contact.postcode].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  ) : (
                    <p className="text-meta text-slate-400">—</p>
                  )}
                  {r.description && <p className="mt-1 text-meta text-slate-500">{r.description}</p>}
                </div>

                <div>
                  <p className="text-meta font-semibold text-slate-500">
                    Eligible masters ({r.masters.length})
                  </p>
                  {r.masters.length > 0 ? (
                    <ul className="text-meta text-slate-600">
                      {r.masters.slice(0, 8).map((m) => (
                        <li key={m.id}>
                          {m.name} · {m.borough}
                          {m.phone ? ` · ${m.phone}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-meta text-slate-400">none in reach</p>
                  )}
                </div>

                <RequestHandoff id={r.id} message={r.masterMessage} status={r.status} handledTo={r.handledTo} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
