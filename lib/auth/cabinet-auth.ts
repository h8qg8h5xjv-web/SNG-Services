// Every supabase.auth call the cabinet makes (browser side: the session lands
// in cookies the server reads). Results carry an AuthProblem, never Supabase's
// own message — see errors.ts for why.
import { createClient } from '@/lib/supabase/client'
import { authProblem, type AuthFlow, type AuthProblem } from './errors'

export type AuthResult = { ok: true } | { ok: false; problem: AuthProblem }

// The email templates append ?token_hash=&type= to this, so it carries no query.
function confirmUrl(locale: string): string {
  return `${window.location.origin}/${locale}/cabinet/auth/confirm`
}

function result(error: Parameters<typeof authProblem>[0], flow: AuthFlow): AuthResult {
  const problem = authProblem(error, flow)
  return problem ? { ok: false, problem } : { ok: true }
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  const { error } = await createClient().auth.signInWithPassword({ email, password })
  return result(error, 'signIn')
}

// No session until the email is confirmed (mailer_autoconfirm is off), so the
// cabinet opens only from the Confirm signup link.
export async function signUpWithPassword(email: string, password: string, locale: string): Promise<AuthResult> {
  const { error } = await createClient().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: confirmUrl(locale) },
  })
  return result(error, 'signUp')
}

export async function resendSignupEmail(email: string, locale: string): Promise<AuthResult> {
  const { error } = await createClient().auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: confirmUrl(locale) },
  })
  return result(error, 'emailLink')
}

export async function sendPasswordReset(email: string, locale: string): Promise<AuthResult> {
  const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: confirmUrl(locale) })
  return result(error, 'emailLink')
}

export async function sendMagicLink(email: string, locale: string): Promise<AuthResult> {
  const { error } = await createClient().auth.signInWithOtp({
    email,
    options: { emailRedirectTo: confirmUrl(locale), shouldCreateUser: true },
  })
  return result(error, 'emailLink')
}

export async function setNewPassword(password: string): Promise<AuthResult> {
  const { error } = await createClient().auth.updateUser({ password })
  return result(error, 'newPassword')
}
