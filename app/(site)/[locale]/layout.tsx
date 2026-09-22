import type { Metadata, Viewport } from 'next'
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
import InstallPrompt from '@/components/InstallPrompt'
import '../../globals.css'

// Weights 400/600 for body + UI, 700 for list-card names, 800 for showcase
// headings (DESIGN-SYSTEM §2). Inter covers the enabled locales (Latin + Cyrillic).
// Georgian/Armenian (ka/hy) are disabled for now; when enabled they'll be
// self-hosted via next/font/local. Until then they fall back to system fonts.
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '600', '700', '800'],
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Accent theme colour for the browser UI / installed app (PWA, idea #8).
export const viewport: Viewport = { themeColor: '#1e40af' }

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
    manifest: '/manifest.webmanifest',
    icons: {
      icon: [
        { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
        { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
        { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      ],
      apple: '/icons/apple-touch-icon.png',
    },
    appleWebApp: { capable: true, title: t('title'), statusBarStyle: 'default' },
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
      {/* has-bottom-nav: bottom clearance for the sticky mobile nav (§2). */}
      <body className="has-bottom-nav flex min-h-full flex-col">
        <NextIntlClientProvider>
          {children}
          <Footer />
          <BottomNav />
          <InstallPrompt />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
