import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Magic-link callback for the business cabinet. Verifies the OTP and establishes
// the session, then redirects into /business (only — never off-site).
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const fallback = `/${locale}/business/requests`
  const nextParam = searchParams.get('next') ?? fallback
  const next = /^\/[^/]+\/business(?:\/|$)/.test(nextParam) ? nextParam : fallback

  if (tokenHash && type) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, request.url))
  }
  return NextResponse.redirect(new URL(`/${locale}/business/login?error=link`, request.url))
}
