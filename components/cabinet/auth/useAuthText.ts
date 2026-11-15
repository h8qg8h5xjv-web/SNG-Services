import { useTranslations } from 'next-intl'
import type { AuthProblem } from '@/lib/auth/errors'
import { PASSWORD_MIN, type PasswordProblem } from '@/lib/auth/password'

// One wording per problem, shared by every cabinet auth form.
export function useAuthText(): (problem: AuthProblem | PasswordProblem) => string {
  const t = useTranslations('cabinetAuth')
  return (problem) => {
    switch (problem) {
      case 'invalidCredentials':
        return t('errInvalidCredentials')
      case 'emailNotConfirmed':
        return t('errEmailNotConfirmed')
      case 'invalidEmail':
        return t('errInvalidEmail')
      case 'weakPassword':
        return t('errWeakPassword', { min: PASSWORD_MIN })
      case 'tooShort':
        return t('errTooShort', { min: PASSWORD_MIN })
      case 'tooLong':
        return t('errTooLong')
      case 'mismatch':
        return t('errMismatch')
      case 'samePassword':
        return t('errSamePassword')
      case 'rateLimited':
        return t('errRateLimited')
      case 'sessionMissing':
        return t('newPasswordNoSession')
      case 'generic':
        return t('errGeneric')
    }
  }
}
