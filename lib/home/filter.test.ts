import { test } from 'node:test'
import assert from 'node:assert/strict'
import { filterFor, applyFilter } from './filter.ts'

const W = [
  { slug: 'kavkaz', categorySlug: 'beauty', name: 'Барбершоп Кавказ', serviceName: 'Стрижка', borough: 'Brent' },
  { slug: 'vesna', categorySlug: 'beauty', name: 'Студия Весна', serviceName: 'Маникюр', borough: 'Ealing' },
  { slug: 'dina', categorySlug: 'education', name: 'English with Dina', serviceName: 'Урок английского', borough: 'Hammersmith' },
]
const CATS = { beauty: ['Красота', 'Beauty'], education: ['Обучение', 'Tutoring'] }

test('no query and no chip: no filter', () => {
  assert.deepEqual(filterFor('  ', null, W, CATS), { cats: null, slugs: null })
})

test('chip wins and filters by category', () => {
  const f = filterFor('маникюр', 'education', W, CATS)
  assert.deepEqual(f.cats, ['education'])
  assert.deepEqual(applyFilter(W, f).map((w) => w.slug), ['dina'])
})

test('query matches service, name, borough and category, with stems', () => {
  assert.deepEqual([...filterFor('маникюра', null, W, CATS).slugs!], ['vesna'])
  assert.deepEqual([...filterFor('Ealing', null, W, CATS).slugs!], ['vesna'])
  assert.deepEqual(filterFor('красота', null, W, CATS).cats, ['beauty'])
})

test('wrong keyboard layout still matches', () => {
  assert.deepEqual([...filterFor('vfybrbh', null, W, CATS).slugs!], ['vesna'])
})

test('a query with no hits gives an empty result, not "no filter"', () => {
  const f = filterFor('ремонт холодильника', null, W, CATS)
  assert.deepEqual(f.cats, [])
  assert.equal(applyFilter(W, f).length, 0)
})
