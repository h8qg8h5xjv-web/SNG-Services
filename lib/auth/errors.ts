// Supabase auth errors → the few messages the cabinet shows. None of them may
// reveal whether an account exists for an email:
// - sign-in: a wrong password and an unknown email are both invalidCredentials;
// - sign-up: «already registered» is reported as success (the form always says
//   «check your inbox»);
// - reset and magic link: Supabase itself answers the same for any email.
// emailNotConfirmed is the one specific answer, and Supabase gives it only
// after the password matched, so it tells nothing to someone without it.

export type AuthFlow = 'signIn' | 'signUp' | 'emailLink' | 'newPassword'

export type AuthProblem =
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'invalidEmail'
  | 'weakPassword'
  | 'samePassword'
  | 'sessionMissing'
  | 'rateLimited'
  | 'generic'

export type AuthErrorLike = { code?: string; status?: number; name?: string }

const ACCOUNT_EXISTS = new Set(['user_already_exists', 'email_exists', 'identity_already_exists'])
const RATE_LIMITED = new Set(['over_email_send_rate_limit', 'over_request_rate_limit'])
const SESSION_MISSING = new Set(['session_not_found', 'session_expired'])

// null: treat as success.
export function authProblem(error: AuthErrorLike | null, flow: AuthFlow): AuthProblem | null {
  if (!error) return null
  const code = error.code ?? ''
  if (RATE_LIMITED.has(code) || error.status === 429) return 'rateLimited'
  if (flow === 'signUp' && ACCOUNT_EXISTS.has(code)) return null
  if (code === 'weak_password' && (flow === 'signUp' || flow === 'newPassword')) return 'weakPassword'
  if (code === 'email_address_invalid' && flow !== 'signIn') return 'invalidEmail'
  if (flow === 'signIn') return code === 'email_not_confirmed' ? 'emailNotConfirmed' : 'invalidCredentials'
  if (flow === 'newPassword') {
    if (code === 'same_password') return 'samePassword'
    if (SESSION_MISSING.has(code) || error.name === 'AuthSessionMissingError') return 'sessionMissing'
  }
  return 'generic'
}
