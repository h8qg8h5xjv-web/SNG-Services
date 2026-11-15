import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Magic-link callback for the unified cabinet. Verifies the OTP and returns to
// /cabinet (only), where browser data auto-links to the account.
// Accepts both link shapes: ?token_hash=&type= (our templates, verifyOtp) and
// ?code= (Supabase's default {{ .ConfirmationURL }} under PKCE), so sign-in
// doesn't depend on which template the hosted dashboard has.
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  const dest = `/${locale}/cabinet`

  if ((tokenHash && type) || code) {
    const supabase = await createClient()
    const { error } =
      tokenHash && type
        ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        : await supabase.auth.exchangeCodeForSession(code ?? '')
    if (!error) return NextResponse.redirect(new URL(dest, request.url))
  }
  // Expired, already used, or (for ?code=) opened in another browser — say so
  // instead of landing on the signed-out cabinet as if nothing happened.
  // Straight to a tab: the /cabinet index redirect drops the query.
  return NextResponse.redirect(new URL(`${dest}/requests?error=link`, request.url))
}
