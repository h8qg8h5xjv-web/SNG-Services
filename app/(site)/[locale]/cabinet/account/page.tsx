import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconHeart, IconBriefcase } from '@tabler/icons-react'
import { ButtonLink } from '@/components/ui/Button'
import { getAccount } from '@/lib/cabinet/data'
import AccountPanel from '@/components/cabinet/AccountPanel'
import DataControls from '@/components/profile/DataControls'

export const dynamic = 'force-dynamic'

export default async function CabinetAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  const account = await getAccount()

  return (
    <div className="two">
      <section aria-labelledby="acc-h">
        <h2 id="acc-h" className="h3 mb-6">
          {account ? t('cabinet.tabs.account') : t('profile.dataTitle')}
        </h2>
        {account ? <AccountPanel email={account.email} name={account.name} /> : <DataControls />}
      </section>

      <aside className="aside-stack">
        <div className="card">
          <b className="font-semibold">{t('saved.title')}</b>
          <p className="muted">{t('cabinet2.savedText')}</p>
          <div>
            <ButtonLink href="/saved" variant="line" size="sm">
              <IconHeart stroke={1.75} aria-hidden="true" />
              {t('saved.title')}
            </ButtonLink>
          </div>
        </div>
        <div className="card">
          <b className="font-semibold">{t('cabinet2.areYouBusiness')}</b>
          <div>
            <ButtonLink href="/for-business" variant="line" size="sm">
              <IconBriefcase stroke={1.75} aria-hidden="true" />
              {t('cabinet2.forBusiness')}
            </ButtonLink>
          </div>
        </div>
      </aside>
    </div>
  )
}
