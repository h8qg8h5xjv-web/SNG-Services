import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// Minimal browser stand-in: the store only needs window + localStorage.
const mem = new Map<string, string>()
const g = globalThis as Record<string, unknown>
g.window = g
g.localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => void mem.set(k, v),
  removeItem: (k: string) => void mem.delete(k),
}

const store = await import('./local-store.ts')

beforeEach(() => mem.clear())

test('bookings and requests share one list; old entries (no kind) are requests', () => {
  mem.set('sng_requests', JSON.stringify([{ ref: 'OLD1', token: 't0', at: '2030-01-01T00:00:00Z' }]))
  store.saveBooking('BK1', 'tb')
  store.saveRequest('RQ1', 'tr')
  assert.deepEqual(store.getSavedItems().map((i) => i.ref), ['RQ1', 'BK1', 'OLD1'])
  assert.deepEqual(store.getSavedBookings().map((i) => i.ref), ['BK1'])
  assert.deepEqual(store.getSavedRequests().map((i) => i.ref), ['RQ1', 'OLD1'])
})

test('merging from the account keeps the booking kind and dedupes by ref', () => {
  store.saveBooking('BK1', 'tb')
  store.mergeRequests([
    { ref: 'BK1', token: 'tb', kind: 'booking' },
    { ref: 'BK2', token: 'tb2', kind: 'booking' },
    { ref: 'RQ9', token: 'tr9' },
  ])
  assert.deepEqual(store.getSavedBookings().map((i) => i.ref).sort(), ['BK1', 'BK2'])
  assert.deepEqual(store.getSavedRequests().map((i) => i.ref), ['RQ9'])
})

test('broken storage content reads as empty, not a crash', () => {
  mem.set('sng_requests', '{not json')
  assert.deepEqual(store.getSavedItems(), [])
  mem.set('sng_requests', JSON.stringify([{ ref: 1 }, null, { ref: 'A', token: 'x', at: '' }]))
  assert.deepEqual(store.getSavedItems().map((i) => i.ref), ['A'])
})
