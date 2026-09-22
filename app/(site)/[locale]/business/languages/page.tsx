import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getMyProviders, getCabinetLanguages } from '@/lib/business/data'
import ProviderPicker from '@/components/business/ProviderPicker'
import LanguagesEditor from '@/components/business/LanguagesEditor'

export const dynamic = 'force-dynamic'

export default async function BusinessLanguagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ p?: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const { p } = await searchParams
  const t = await getTranslations('business.tabs')

  const providers = await getMyProviders()
  const active = providers.find((x) => x.id === p) ?? providers[0]
  if (!active) return null
  const { all, claimed } = await getCabinetLanguages(active.id)

  return (
    <div>
      <h1 className="mb-4 text-title font-extrabold tracking-tight">{t('languages')}</h1>
      <ProviderPicker providers={providers} activeId={active.id} />
      <LanguagesEditor key={active.id} providerId={active.id} all={all} claimed={claimed} />
    </div>
  )
}
