import type { MetadataRoute } from 'next'
import { BRAND_NAME } from '@/lib/brand'

// The PWA manifest, generated so the name comes from lib/brand.ts. Served at
// /manifest.webmanifest (Next adds the <link rel="manifest">). Values other
// than the name are unchanged from the former static file.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: BRAND_NAME,
    short_name: BRAND_NAME,
    description: 'Каталог и запись к русскоязычным мастерам в Великобритании.',
    lang: 'ru',
    start_url: '/ru',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0F1830',
    theme_color: '#0F1830',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
