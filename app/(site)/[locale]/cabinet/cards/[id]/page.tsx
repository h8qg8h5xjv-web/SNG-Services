import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconChevronLeft } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
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
    <div>
      <Link href="/cabinet/cards" className="btn btn-plain btn-sm px-0" data-kind="step-back">
        <IconChevronLeft stroke={1.75} aria-hidden="true" />
        {t('backToCards')}
      </Link>

      <div className="mt-4 mb-8">
        <h2 className="h2">{profile.name}</h2>
        {profile.status !== 'published' && <p className="muted mt-2">{t('draftNote')}</p>}
      </div>

      <section className="card ed-sec" aria-labelledby="ed-profile">
        <h3 id="ed-profile" className="h3">
          {tt('profile')}
        </h3>
        <ProfileForm profile={profile} />
      </section>

      <section className="card ed-sec" aria-labelledby="ed-services">
        <h3 id="ed-services" className="h3">
          {tt('services')}
        </h3>
        <ServicesEditor providerId={id} services={services} />
      </section>

      <section className="card ed-sec" aria-labelledby="ed-langs">
        <h3 id="ed-langs" className="h3">
          {tt('languages')}
        </h3>
        <LanguagesEditor providerId={id} all={langs.all} claimed={langs.claimed} />
      </section>

      <section className="card ed-sec" aria-labelledby="ed-schedule">
        <h3 id="ed-schedule" className="h3">
          {tt('schedule')}
        </h3>
        <ScheduleEditor providerId={id} rows={schedule} />
      </section>
    </div>
  )
}
