import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Facade from '@/components/home/Facade'
import ApplyLink from '@/components/business/ApplyLink'
import CatalogRequestForm from '@/components/CatalogRequestForm'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'forBusiness' })
  return { title: t('title') }
}

export default async function ForBusinessPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('forBusiness')
  const t2 = await getTranslations('forBusiness2')
  const th = await getTranslations('home.v2')
  const steps = [
    [t2('s1h'), t2('s1p')],
    [t2('s2h'), t2('s2p')],
    [t2('s3h'), t2('s3p')],
  ]

  return (
    <>
      <section className="night bhero" aria-labelledby="bh-h">
        <div className="wrap biz-grid">
          <div>
            <h1 id="bh-h" className="ph1">
              {th('bizTitle1')}
              <br />
              {th('bizTitle2')}
            </h1>
            <p className="lead">{t('intro')}</p>
            <ul className="biz-points">
              <li>{t('point1')}</li>
              <li>{t('point2')}</li>
              <li>{t('point3')}</li>
            </ul>
            <div className="biz-cta">
              <ApplyLink className="btn btn-amber">{th('bizApply')}</ApplyLink>
              <Link className="btn btn-ghost" href="/cabinet/cards">
                {t('enter')}
              </Link>
            </div>
          </div>
          <div>
            <Facade />
            <p className="facade-cap">{th('bizCaption')}</p>
          </div>
        </div>
      </section>

      <div className="wrap page">
        <section className="pt-16 tablet:pt-24" aria-labelledby="bs-h">
          <h2 id="bs-h" className="h2">
            {t2('stepsTitle')}
          </h2>
          <ol className="bsteps">
            {steps.map(([h, p]) => (
              <li key={h}>
                <b>{h}</b>
                <p>{p}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Not in the catalog yet — invite-only, so this is a request, not signup. */}
        <section id="apply" className="apply" aria-labelledby="apply-h">
          <div>
            <h2 id="apply-h" className="h2">
              {t('joinTitle')}
            </h2>
            <p className="sec-sub">{t('joinIntro')}</p>
          </div>
          <div className="card form-card">
            <CatalogRequestForm />
          </div>
        </section>
      </div>
    </>
  )
}
