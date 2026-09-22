import { listQueuedNotifications } from '@/lib/admin/notifications'
import NotificationRow from '@/components/admin/NotificationRow'

export const dynamic = 'force-dynamic'

// §5 notification queue: unsent master notifications to forward by hand until
// email/SMS is wired.
export default async function AdminNotificationsPage() {
  const items = await listQueuedNotifications('unsent')

  return (
    <div className="space-y-4">
      <h1 className="text-h2 font-semibold">Notifications</h1>
      <p className="text-body text-slate-500">
        Unsent master notifications. No email/SMS yet — copy each and send it by
        hand (WhatsApp), then mark it sent.
      </p>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
          Nothing to send.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((n) => (
            <div key={n.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{n.providerName ?? 'Master'}</span>
                  {n.kind && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-meta text-slate-600">
                      {n.kind}
                    </span>
                  )}
                  {n.requestRef && <span className="text-meta text-slate-500">#{n.requestRef}</span>}
                </div>
                <span className="text-meta text-slate-500">
                  {new Date(n.createdAt).toISOString().slice(0, 16).replace('T', ' ')}
                </span>
              </div>
              <div className="mt-1 text-meta text-slate-500">
                {[n.phone, ...(n.emails ?? [])].filter(Boolean).join(' · ') || 'no contact on file'}
              </div>
              <p className="mt-2 whitespace-pre-line text-body">{n.body}</p>
              <div className="mt-3">
                <NotificationRow id={n.id} phone={n.phone} body={n.body} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
