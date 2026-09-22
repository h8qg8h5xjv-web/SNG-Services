import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getMyProviders, getCabinetProfile } from '@/lib/business/data'
import ProviderPicker from '@/components/business/ProviderPicker'
import ProfileForm from '@/components/business/ProfileForm'

export const dynamic = 'force-dynamic'

export default async function BusinessProfilePage({
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
  const profile = await getCabinetProfile(active.id)
  if (!profile) return null

  return (
    <div>
      <h1 className="mb-4 text-title font-extrabold tracking-tight">{t('profile')}</h1>
      <ProviderPicker providers={providers} activeId={active.id} />
      <ProfileForm key={active.id} profile={profile} />
    </div>
  )
}
