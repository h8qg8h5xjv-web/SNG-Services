import { getTranslations } from 'next-intl/server'
import type { ProviderStats } from '@/lib/business/data'

// Cabinet stats over the last 30 days (idea #4): views, contact opens, requests.
// Pseudonymous counts only — no per-visitor detail (same model as all analytics).
export default async function StatsBlock({ stats }: { stats: ProviderStats }) {
  const t = await getTranslations('business.stats')
  const items: { label: string; value: number }[] = [
    { label: t('views'), value: stats.views },
    { label: t('contacts'), value: stats.contacts },
    { label: t('requests'), value: stats.requests },
  ]

  return (
    <section>
      <h2 className="mb-3 text-h2 font-semibold">{t('title')}</h2>
      <div className="grid grid-cols-3 gap-3">
        {items.map((i) => (
          <div key={i.label} className="rounded-lg border border-slate-200 p-3 text-center">
            <p className="text-title font-extrabold tracking-tight">{i.value}</p>
            <p className="mt-1 text-meta text-slate-500">{i.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
