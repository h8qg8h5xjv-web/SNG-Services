import { test } from 'node:test'
import assert from 'node:assert/strict'
import { navSection } from './section.ts'

test('home and fixed sections', () => {
  assert.equal(navSection('/'), 'home')
  assert.equal(navSection('/events/some-event'), 'events')
  assert.equal(navSection('/cabinet/bookings'), 'cabinet')
  assert.equal(navSection('/bookings'), 'cabinet')
  assert.equal(navSection('/for-business'), 'business')
  assert.equal(navSection('/requests/abc'), 'request')
})

test('category, listing and booking belong to the catalogue', () => {
  assert.equal(navSection('/beauty'), 'catalog')
  assert.equal(navSection('/beauty/kavkaz-barbers'), 'catalog')
  assert.equal(navSection('/beauty/kavkaz-barbers/book'), 'catalog')
})
