import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IconHeart, IconChevronRight } from '@tabler/icons-react'
import { Link } from '@/i18n/navigation'
import Header from '@/components/Header'

// Placeholder — accounts are offered only after a first booking (later phase).
export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations()
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-title font-extrabold tracking-tight">{t('nav.profile')}</h1>

        <Link
          href="/saved"
          className="mt-6 flex items-center gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:border-accent"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <IconHeart className="h-5 w-5" stroke={2} />
          </span>
          <span className="flex-1 text-body font-semibold">{t('saved.title')}</span>
          <IconChevronRight className="h-5 w-5 text-slate-400" stroke={1.5} />
        </Link>

        <p className="mt-6 text-slate-500">{t('misc.comingSoon')}</p>
      </main>
    </>
  )
}
