import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconChevronLeft } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { SectionHeading } from '@/components/ui/Section'
import {
  getCabinetProfile,
  getCabinetServices,
  getCabinetLanguages,
  getCabinetSchedule,
} from '@/lib/business/data'
import ProfileForm from '@/components/business/ProfileForm'
import ServicesEditor from '@/components/business/ServicesEditor'
import LanguagesEditor from '@/components/business/LanguagesEditor'
import ScheduleEditor from '@/components/business/ScheduleEditor'

export const dynamic = 'force-dynamic'

export default async function CabinetCardEditPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const profile = await getCabinetProfile(id)
  if (!profile) notFound() // not owned by this user (getCabinetProfile scopes to own)

  const t = await getTranslations('cabinet.cards')
  const tt = await getTranslations('business.tabs')
  const [services, langs, schedule] = await Promise.all([
    getCabinetServices(id),
    getCabinetLanguages(id),
    getCabinetSchedule(id),
  ])

  return (
    <div className="space-y-8">
      <Link href="/cabinet/cards" className="inline-flex items-center gap-1 text-body text-slate-500 hover:text-slate-900">
        <IconChevronLeft className="h-5 w-5" stroke={1.5} />
        {t('backToCards')}
      </Link>

      <div>
        <h2 className="text-name font-extrabold tracking-tight">{profile.name}</h2>
        {profile.status !== 'published' && (
          <p className="mt-1 text-meta text-slate-500">{t('draftNote')}</p>
        )}
      </div>

      <section>
        <SectionHeading>{tt('profile')}</SectionHeading>
        <ProfileForm profile={profile} />
      </section>

      <section>
        <SectionHeading>{tt('services')}</SectionHeading>
        <ServicesEditor providerId={id} services={services} />
      </section>

      <section>
        <SectionHeading>{tt('languages')}</SectionHeading>
        <LanguagesEditor providerId={id} all={langs.all} claimed={langs.claimed} />
      </section>

      <details className="rounded-lg border border-slate-200 p-4">
        <summary className="cursor-pointer text-section font-extrabold tracking-tight">{tt('schedule')}</summary>
        <div className="mt-4">
          <ScheduleEditor providerId={id} rows={schedule} />
        </div>
      </details>
    </div>
  )
}
