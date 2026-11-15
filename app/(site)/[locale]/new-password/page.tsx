import type { Metadata } from 'next'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import NightHeader from '@/components/site/NightHeader'
import NewPasswordForm from '@/components/cabinet/auth/NewPasswordForm'
import { ButtonLink } from '@/components/ui/Button'
import { getAccount } from '@/lib/cabinet/data'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'cabinetAuth' })
  return { title: t('newPasswordTitle'), robots: { index: false, follow: false } }
}

// Landing for the Reset password email (auth/confirm, type=recovery). Outside
// the cabinet layout so the form isn't buried under its tabs.
export default async function NewPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('cabinetAuth')
  const account = await getAccount()

  return (
    <>
      <NightHeader>
        <h1 className="ph1">{t('newPasswordTitle')}</h1>
      </NightHeader>
      <div className="wrap page pt-8">
        <section className="card cab-login">
          {account ? (
            <>
              <p className="muted">{t('newPasswordBody')}</p>
              <div className="cab-auth">
                <NewPasswordForm email={account.email} />
              </div>
            </>
          ) : (
            <>
              <p className="msg-err-inline" role="alert">
                {t('newPasswordNoSession')}
              </p>
              <div>
                <ButtonLink href="/cabinet/requests?auth=forgot" variant="ink">
                  {t('newPasswordRequest')}
                </ButtonLink>
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
