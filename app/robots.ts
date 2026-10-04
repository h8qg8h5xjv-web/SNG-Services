import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/brand'

const siteUrl = SITE_URL

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/admin' }],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
