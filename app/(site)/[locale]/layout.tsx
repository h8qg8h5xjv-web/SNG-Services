import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter, Noto_Sans_Georgian, Noto_Sans_Armenian } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { routing } from '@/i18n/routing'
import { ogLocale } from '@/i18n/locales'
import { buildLanguageAlternates } from '@/lib/i18n/alternates'
import BottomNav from '@/components/BottomNav'
import '../../globals.css'

// Only weights 400 and 600 (DESIGN-SYSTEM §2) — extra weights are extra bytes.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600'],
})
const notoGeorgian = Noto_Sans_Georgian({
  variable: '--font-noto-georgian',
  subsets: ['georgian'],
  weight: ['400', '600'],
})
const notoArmenian = Noto_Sans_Armenian({
  variable: '--font-noto-armenian',
  subsets: ['armenian'],
  weight: ['400', '600'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })
  const languages = await buildLanguageAlternates()

  return {
    metadataBase: new URL(siteUrl),
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
    alternates: { languages },
    openGraph: {
      type: 'website',
      siteName: t('title'),
      title: t('title'),
      description: t('description'),
      locale: ogLocale(locale),
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }
  // Enable static rendering for this locale.
  setRequestLocale(locale)

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${notoGeorgian.variable} ${notoArmenian.variable} h-full antialiased`}
    >
      {/* pb-16: off-scale on purpose — clears the fixed bottom nav (its height). */}
      <body className="flex min-h-full flex-col pb-16 sm:pb-0">
        <NextIntlClientProvider>
          {children}
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
