// Password rules for cabinet accounts. Supabase enforces the same minimum
// (password_min_length; locally supabase/config.toml), so the server rejects
// what the form would.

export const PASSWORD_MIN = 10
// bcrypt reads only the first 72 bytes; Supabase refuses anything longer.
export const PASSWORD_MAX_BYTES = 72

export type PasswordProblem = 'tooShort' | 'tooLong' | 'mismatch'

// Length in characters, not UTF-16 units or bytes: «пароль» is 6, not 12.
export function checkPassword(password: string, repeat?: string): PasswordProblem | null {
  if ([...password].length < PASSWORD_MIN) return 'tooShort'
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) return 'tooLong'
  if (repeat !== undefined && repeat !== password) return 'mismatch'
  return null
}
