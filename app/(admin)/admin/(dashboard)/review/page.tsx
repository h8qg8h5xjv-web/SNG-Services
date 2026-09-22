import Link from 'next/link'
import { listDraftProviders } from '@/lib/admin/review'
import PublishDraft from '@/components/admin/PublishDraft'

export const dynamic = 'force-dynamic'

// Drafts awaiting review — «на проверке». Confirm the language (checked by phone)
// and publish.
export default async function AdminReviewPage() {
  const drafts = await listDraftProviders()

  return (
    <div className="space-y-4">
      <h1 className="text-h2 font-semibold">Review drafts</h1>
      <p className="text-body text-slate-500">
        Cards awaiting review. Call the master to confirm the service language, then publish.
      </p>

      {drafts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 p-8 text-center text-slate-500">
          No drafts to review.
        </p>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div key={d.id} className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/providers/${d.id}`} className="font-semibold hover:underline">
                      {d.name}
                    </Link>
                    <span className="text-meta text-slate-500">
                      {[d.categorySlug, d.borough].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                  <p className="mt-1 text-meta text-slate-500">
                    Languages:{' '}
                    {d.languages.length > 0
                      ? d.languages.map((l) => `${l.name} (${l.status})`).join(', ')
                      : '—'}
                  </p>
                </div>
                <PublishDraft providerId={d.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
