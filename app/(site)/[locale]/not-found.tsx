import { getTranslations } from 'next-intl/server'
import { Pane } from '@/components/ui/Pane'
import { ButtonLink } from '@/components/ui/Button'

// v2 404 (DEMO_MAP §3.15): a dark pane with «404», where to go next.
export default async function NotFound() {
  const t = await getTranslations('notFound')
  return (
    <div className="wrap page">
      <div className="empty mt-14 mb-6">
        <Pane off time="404" />
        <h1 className="h2">{t('title')}</h1>
        <p>{t('body')}</p>
        <div className="acts">
          <ButtonLink href="/" variant="ink">
            {t('home')}
          </ButtonLink>
          <ButtonLink href="/catalog" variant="line">
            {t('catalog')}
          </ButtonLink>
        </div>
      </div>
    </div>
  )
}
