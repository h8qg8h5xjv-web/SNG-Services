import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconCheck } from '@tabler/icons-react'
import Header from '@/components/Header'
import BackButton from '@/components/BackButton'
import { ButtonLink } from '@/components/ui/Button'
import { SectionHeading } from '@/components/ui/Section'
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
  const points = [t('point1'), t('point2'), t('point3')]

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 pt-4">
        <BackButton />
        <h1 className="text-title font-semibold">{t('title')}</h1>
        <p className="mt-2 text-body text-slate-500">{t('intro')}</p>

        <ul className="mt-4 space-y-2">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-body">
              <IconCheck className="mt-0.5 h-5 w-5 shrink-0 text-teal-700" stroke={1.5} />
              {p}
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <ButtonLink href="/business/login" className="w-full sm:w-auto">
            {t('enter')}
          </ButtonLink>
        </div>

        {/* Not in the catalog yet — invite-only, so this is a request, not signup. */}
        <section className="mt-10">
          <SectionHeading>{t('joinTitle')}</SectionHeading>
          <p className="mb-4 text-body text-slate-500">{t('joinIntro')}</p>
          <CatalogRequestForm />
        </section>
      </main>
    </>
  )
}
