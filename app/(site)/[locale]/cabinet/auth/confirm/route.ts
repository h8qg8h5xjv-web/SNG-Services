import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Email-link callback for the unified cabinet (sign-in, signup confirmation,
// recovery, invite, email change). Verifies the OTP and returns to /cabinet,
// where browser data auto-links to the account — or, for recovery, to
// /new-password.
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
    if (!error) {
      // Reset password email: the session is there, now choose the password.
      const next = type === 'recovery' ? `/${locale}/new-password` : dest
      return NextResponse.redirect(new URL(next, request.url))
    }
  }
  // Expired, already used, or (for ?code=) opened in another browser — say so
  // instead of landing on the signed-out cabinet as if nothing happened.
  // Straight to a tab: the /cabinet index redirect drops the query.
  return NextResponse.redirect(new URL(`${dest}/requests?error=link`, request.url))
}
