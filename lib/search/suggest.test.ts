import { test } from 'node:test'
import assert from 'node:assert/strict'
import { suggest, bestCategory, type Corpus } from './suggest.ts'

// A tiny corpus with a «Маникюр» category, so we test the matcher, not the DB.
const corpus: Corpus = {
  categories: [
    { name: 'Маникюр', slug: 'manicure' },
    { name: 'Парикмахеры', slug: 'hair' },
  ],
  providers: [{ name: 'Салон Маникюр Плюс', slug: 'manikur-plus', categorySlug: 'manicure', borough: 'Camden' }],
  boroughs: ['Camden'],
  services: [{ name: 'маникюр с покрытием', categorySlug: 'manicure' }],
}

test('exact Russian query returns the category', () => {
  const r = suggest('маникюр', corpus)
  assert.ok(r.some((s) => s.kind === 'category' && s.href === '/manicure'), 'expected the manicure category')
})

test('wrong keyboard layout «vfybr.h» matches «маникюр»', () => {
  const r = suggest('vfybr.h', corpus)
  assert.ok(r.some((s) => s.href === '/manicure'), 'layout-tolerant match failed')
})

test('one-letter typo «маникур» still matches', () => {
  const r = suggest('маникур', corpus)
  assert.ok(r.some((s) => s.href === '/manicure'), 'typo tolerance failed')
})

test('bestCategory resolves to the slug for Enter/«Найти»', () => {
  assert.equal(bestCategory('маникюр', corpus), 'manicure')
  assert.equal(bestCategory('vfybr.h', corpus), 'manicure')
})

test('too-short query returns nothing', () => {
  assert.deepEqual(suggest('м', corpus), [])
})
