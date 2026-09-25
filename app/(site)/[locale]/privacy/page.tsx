import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import NightHeader from '@/components/site/NightHeader'
import LegalDoc from '@/components/site/LegalDoc'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'privacy' })
  return { title: t('title'), robots: { index: false, follow: true } }
}

export default async function PrivacyPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('privacy')
  const tl = await getTranslations('legal2')
  const to = await getTranslations('terms')

  const sections = (
    [
      ['collect', t('collectTitle'), t('collectBody')],
      ['retention', t('retentionTitle'), t('retentionBody')],
      ['share', t('shareTitle'), t('shareBody')],
      ['rights', t('rightsTitle'), t('rightsBody')],
      ['delete', t('deleteTitle'), t('deleteBody')],
    ] as const
  ).map(([id, title, body]) => ({ id, title, body }))

  return (
    <>
      <NightHeader>
        <h1 className="ph1">{t('title')}</h1>
      </NightHeader>
      <div className="wrap page">
        <LegalDoc
          sections={sections}
          tocLabel={tl('toc')}
          intro={
            <>
              <p className="notice">{t('draftNote')}</p>
              <p className="muted">{t('operator')}</p>
            </>
          }
          outro={
            <p className="also">
              {tl('seeAlso')}:{' '}
              <Link href="/terms" className="link">
                {to('title')}
              </Link>
            </p>
          }
        />
      </div>
    </>
  )
}
