import { test } from 'node:test'
import assert from 'node:assert/strict'
import { authProblem } from './errors.ts'

test('no error is success', () => {
  assert.equal(authProblem(null, 'signIn'), null)
})

test('sign-in never tells an unknown email from a wrong password', () => {
  assert.equal(authProblem({ code: 'invalid_credentials', status: 400 }, 'signIn'), 'invalidCredentials')
  assert.equal(authProblem({ code: 'user_not_found', status: 400 }, 'signIn'), 'invalidCredentials')
  assert.equal(authProblem({ code: 'email_address_invalid', status: 400 }, 'signIn'), 'invalidCredentials')
  assert.equal(authProblem({ status: 500 }, 'signIn'), 'invalidCredentials')
})

test('sign-in: unconfirmed email (only after the password matched)', () => {
  assert.equal(authProblem({ code: 'email_not_confirmed', status: 400 }, 'signIn'), 'emailNotConfirmed')
})

test('sign-up: an existing account looks like success', () => {
  assert.equal(authProblem({ code: 'user_already_exists', status: 422 }, 'signUp'), null)
  assert.equal(authProblem({ code: 'email_exists', status: 422 }, 'signUp'), null)
  assert.equal(authProblem({ code: 'weak_password', status: 422 }, 'signUp'), 'weakPassword')
  assert.equal(authProblem({ code: 'email_address_invalid', status: 400 }, 'signUp'), 'invalidEmail')
})

test('rate limits in every flow', () => {
  for (const flow of ['signIn', 'signUp', 'emailLink', 'newPassword'] as const) {
    assert.equal(authProblem({ code: 'over_email_send_rate_limit', status: 429 }, flow), 'rateLimited')
    assert.equal(authProblem({ status: 429 }, flow), 'rateLimited')
  }
})

test('new password: same password, missing session', () => {
  assert.equal(authProblem({ code: 'same_password', status: 422 }, 'newPassword'), 'samePassword')
  assert.equal(authProblem({ code: 'session_not_found', status: 403 }, 'newPassword'), 'sessionMissing')
  assert.equal(authProblem({ name: 'AuthSessionMissingError', status: 400 }, 'newPassword'), 'sessionMissing')
  assert.equal(authProblem({ code: 'weak_password', status: 422 }, 'newPassword'), 'weakPassword')
})

test('email links: anything else is generic', () => {
  assert.equal(authProblem({ code: 'unexpected_failure', status: 500 }, 'emailLink'), 'generic')
  assert.equal(authProblem({ code: 'user_already_exists', status: 422 }, 'emailLink'), 'generic')
})
