import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Magic-link callback: verifies the OTP token and establishes the session.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  // Supabase's default {{ .ConfirmationURL }} under PKCE returns ?code= instead.
  const code = searchParams.get('code')
  // Set by the login page (the link itself has only token_hash and type).
  const nextParam = searchParams.get('next') ?? request.cookies.get('admin_next')?.value ?? '/admin'
  const next = nextParam.startsWith('/admin') ? nextParam : '/admin'

  if ((tokenHash && type) || code) {
    const supabase = await createClient()
    const { error } =
      tokenHash && type
        ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
        : await supabase.auth.exchangeCodeForSession(code ?? '')
    if (!error) {
      const response = NextResponse.redirect(new URL(next, request.url))
      response.cookies.delete({ name: 'admin_next', path: '/admin/auth' })
      return response
    }
  }
  return NextResponse.redirect(new URL('/admin/login?error=link', request.url))
}
