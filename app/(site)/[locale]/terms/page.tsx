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
  const t = await getTranslations({ locale, namespace: 'terms' })
  return { title: t('title'), robots: { index: false, follow: true } }
}

export default async function TermsPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('terms')
  const tl = await getTranslations('legal2')
  const to = await getTranslations('privacy')

  const sections = (
    [
      ['platform', t('platformTitle'), t('platformBody')],
      ['responsibility', t('responsibilityTitle'), t('responsibilityBody')],
      ['cancellations', t('cancellationsTitle'), t('cancellationsBody')],
      ['complaints', t('complaintsTitle'), t('complaintsBody')],
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
          outro={
            <p className="also">
              {tl('seeAlso')}:{' '}
              <Link href="/privacy" className="link">
                {to('title')}
              </Link>
            </p>
          }
        />
      </div>
    </>
  )
}
