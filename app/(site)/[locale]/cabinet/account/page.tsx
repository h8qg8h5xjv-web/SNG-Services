import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconHeart, IconChevronRight } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import { SectionHeading } from '@/components/ui/Section'
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

  const savedLink = (
    <Link
      href="/saved"
      className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-accent"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <IconHeart className="h-5 w-5" stroke={2} />
      </span>
      <span className="flex-1 text-body font-semibold">{t('saved.title')}</span>
      <IconChevronRight className="h-5 w-5 text-slate-400" stroke={1.5} />
    </Link>
  )

  return (
    <div className="space-y-8">
      <section>
        <SectionHeading>{t('saved.title')}</SectionHeading>
        {savedLink}
      </section>

      {account ? (
        <section>
          <SectionHeading>{t('cabinet.tabs.account')}</SectionHeading>
          <AccountPanel email={account.email} name={account.name} />
        </section>
      ) : (
        <section>
          <SectionHeading>{t('profile.dataTitle')}</SectionHeading>
          <DataControls />
        </section>
      )}
    </div>
  )
}
