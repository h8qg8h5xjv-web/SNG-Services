import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconBriefcase, IconChevronRight } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { getMyProviders } from '@/lib/business/data'
import { getAccount } from '@/lib/cabinet/data'
import { listCategories, listLanguages } from '@/lib/admin/data'
import CreateCardForm from '@/components/cabinet/CreateCardForm'

export const dynamic = 'force-dynamic'

export default async function CabinetCardsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const account = await getAccount()
  if (!account) redirect(`/${locale}/cabinet/requests`)

  const t = await getTranslations('cabinet.cards')
  const [cards, categories, languages] = await Promise.all([
    getMyProviders(),
    listCategories(),
    listLanguages(),
  ])

  return (
    <div className="space-y-6">
      {cards.length === 0 ? (
        <div className="rounded-lg bg-accent-soft p-6 text-center">
          <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-white text-accent">
            <IconBriefcase className="h-6 w-6" stroke={1.5} />
          </span>
          <p className="text-body font-semibold">{t('emptyTitle')}</p>
          <p className="mt-1 text-meta text-slate-600">{t('emptyBody')}</p>
          <div className="mt-4 flex justify-center">
            <CreateCardForm
              categories={categories.map((c) => ({ id: c.id, name: c.name_en }))}
              languages={languages.map((l) => ({ code: l.code, name: l.name_native }))}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {cards.map((c) => (
              <div key={c.id} className="rounded-lg border border-slate-200 p-3">
                <Link href={`/cabinet/cards/${c.id}`} className="flex items-center gap-3">
                  <span className="flex-1">
                    <span className="text-body font-semibold">{c.name}</span>
                    <span className="ml-2 align-middle">
                      <StatusBadge tone={c.status === 'published' ? 'success' : 'neutral'}>
                        {c.status === 'published' ? t('published') : t('draft')}
                      </StatusBadge>
                    </span>
                  </span>
                  <IconChevronRight className="h-5 w-5 text-slate-400" stroke={1.5} />
                </Link>
                {c.status !== 'published' && (
                  <p className="mt-2 text-meta text-slate-500">{t('draftNote')}</p>
                )}
              </div>
            ))}
          </div>
          <CreateCardForm
            categories={categories.map((c) => ({ id: c.id, name: c.name_en }))}
            languages={languages.map((l) => ({ code: l.code, name: l.name_native }))}
          />
        </>
      )}
    </div>
  )
}
