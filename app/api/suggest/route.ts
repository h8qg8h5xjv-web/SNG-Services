import { NextResponse, type NextRequest } from 'next/server'
import { buildCorpus } from '@/lib/search/corpus'
import { suggest, bestCategory } from '@/lib/search/suggest'
import { routing } from '@/i18n/routing'

// Search suggestions (§11): categories, masters, districts, services — typo- and
// layout-tolerant. Best-effort; failures return an empty list.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').slice(0, 80)
  const localeParam = searchParams.get('locale') ?? routing.defaultLocale
  const locale = (routing.locales as readonly string[]).includes(localeParam)
    ? localeParam
    : routing.defaultLocale
  try {
    const corpus = await buildCorpus(locale)
    return NextResponse.json({ suggestions: suggest(q, corpus), best: bestCategory(q, corpus) })
  } catch (err) {
    // Suggestions are best-effort for the user, but a silent empty list hid a real
    // prod failure (missing Supabase env / RLS / data). Log so Vercel shows it.
    console.error('[suggest] failed to build corpus or match', err)
    return NextResponse.json({ suggestions: [], best: null })
  }
}
