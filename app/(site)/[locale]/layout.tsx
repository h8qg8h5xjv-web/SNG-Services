import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { routing } from '@/i18n/routing'
import { ogLocale } from '@/i18n/locales'
import { buildLanguageAlternates } from '@/lib/i18n/alternates'
import BottomNav from '@/components/BottomNav'
import Footer from '@/components/Footer'
import '../../globals.css'

// Only weights 400 and 600 (DESIGN-SYSTEM §2) — extra weights are extra bytes.
// Inter covers the only enabled locales (Latin + Cyrillic). Georgian/Armenian
// (ka/hy) are disabled for now; when enabled they'll be self-hosted via
// next/font/local. Until then they fall back to system fonts via the CSS stack.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

// Only the enabled locales are valid values for [locale]. Anything else — a
// service-worker request (/sw.js), a stray static file (/favicon.ico), a typo —
// 404s at the routing layer instead of rendering this subtree with a bogus
// "locale" (which then crashed Intl and did wasted data work). generateStaticParams
// above is the allow-list; dynamicParams=false rejects the rest.
export const dynamicParams = false

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
      className={`${inter.variable} h-full antialiased`}
    >
      {/* pb-16: off-scale on purpose — clears the fixed bottom nav (its height). */}
      <body className="flex min-h-full flex-col pb-16 sm:pb-0">
        <NextIntlClientProvider>
          {children}
          <Footer />
          <BottomNav />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
