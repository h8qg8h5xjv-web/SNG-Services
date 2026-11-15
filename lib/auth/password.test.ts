import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkPassword, PASSWORD_MIN } from './password.ts'

test('at least 10 characters', () => {
  assert.equal(PASSWORD_MIN, 10)
  assert.equal(checkPassword('123456789'), 'tooShort')
  assert.equal(checkPassword(''), 'tooShort')
  assert.equal(checkPassword('1234567890'), null)
})

test('counts characters, not bytes or UTF-16 units', () => {
  assert.equal(checkPassword('пароль123'), 'tooShort') // 9 chars, 15 bytes
  assert.equal(checkPassword('парольчик1'), null)
  assert.equal(checkPassword('🔑🔑🔑🔑🔑🔑🔑🔑🔑'), 'tooShort') // 9 chars, 18 UTF-16 units
})

test('no more than 72 bytes (bcrypt)', () => {
  assert.equal(checkPassword('a'.repeat(72)), null)
  assert.equal(checkPassword('a'.repeat(73)), 'tooLong')
  assert.equal(checkPassword('я'.repeat(37)), 'tooLong') // 74 bytes
})

test('repeat must match when given', () => {
  assert.equal(checkPassword('1234567890', '1234567890'), null)
  assert.equal(checkPassword('1234567890', '1234567891'), 'mismatch')
  assert.equal(checkPassword('short', 'other'), 'tooShort') // length first
})
