import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Onest, Unbounded } from 'next/font/google'
import { notFound } from 'next/navigation'
import { hasLocale } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { routing } from '@/i18n/routing'
import { ogLocale } from '@/i18n/locales'
import { buildLanguageAlternates } from '@/lib/i18n/alternates'
import BottomNav from '@/components/BottomNav'
import Footer from '@/components/Footer'
import Header from '@/components/Header'
import InstallPrompt from '@/components/InstallPrompt'
import SessionStart from '@/components/SessionStart'
import NavMotion from '@/components/site/NavMotion'
import { Toaster } from '@/components/ui/Toast'
import { DUSK } from '@/lib/palette'
import '../../globals.css'

// v2 type: Unbounded (display: headings, times, prices; 500/600) and Onest
// (text; 400/500/600). Both load as variable fonts — one file per subset
// instead of one per weight. Latin + Cyrillic; Georgian/Armenian (ka/hy, still
// disabled) fall back to system fonts until they are self-hosted.
const onest = Onest({ variable: '--font-onest', subsets: ['latin', 'cyrillic'] })
const unbounded = Unbounded({ variable: '--font-unbounded', subsets: ['latin', 'cyrillic'] })

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

// Browser UI / installed app colour: the night header (PWA).
export const viewport: Viewport = { themeColor: DUSK, viewportFit: 'cover' }

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
  const t = await getTranslations({ locale })

  return (
    <html lang={locale} className={`${onest.variable} ${unbounded.variable}`}>
      <body>
        <NextIntlClientProvider>
          <a href="#main" className="skip">
            {t('common.skipToContent')}
          </a>
          <Header />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <Footer />
          <BottomNav />
          <InstallPrompt />
          <SessionStart />
          <NavMotion />
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
