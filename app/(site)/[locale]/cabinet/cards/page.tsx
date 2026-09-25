import { redirect } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconChevronRight } from '@tabler/icons-react'
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
  const form = (
    <CreateCardForm
      categories={categories.map((c) => ({ id: c.id, name: c.name_en }))}
      languages={languages.map((l) => ({ code: l.code, name: l.name_native }))}
    />
  )

  if (cards.length === 0) {
    return (
      <div className="grid gap-6">
        <div>
          <h2 className="h3">{t('emptyTitle')}</h2>
          <p className="muted mt-2">{t('emptyBody')}</p>
        </div>
        {form}
      </div>
    )
  }

  return (
    <div className="grid gap-6">
      <ul className="bl">
        {cards.map((c) => (
          <li key={c.id} className="card crow">
            <div>
              <b>
                <Link href={`/cabinet/cards/${c.id}`} className="cover">
                  {c.name}
                </Link>
              </b>
              <StatusBadge tone={c.status === 'published' ? 'success' : 'neutral'}>
                {c.status === 'published' ? t('published') : t('draft')}
              </StatusBadge>
              {c.status !== 'published' && <p className="muted">{t('draftNote')}</p>}
            </div>
            <IconChevronRight stroke={1.75} aria-hidden="true" />
          </li>
        ))}
      </ul>
      {form}
    </div>
  )
}
