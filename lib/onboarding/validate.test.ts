import { test } from 'node:test'
import assert from 'node:assert/strict'
import { checkCard, checkCatalogRequest, NO_CATEGORY } from './validate.ts'

const refs = { categoryIds: new Set(['cat-beauty']), boroughs: new Set(['Camden', 'Hammersmith and Fulham']) }

test('card: category and district must come from the reference lists', () => {
  assert.equal(checkCard({ categoryId: 'cat-beauty', borough: 'Camden' }, refs), null)
  assert.equal(checkCard({ categoryId: 'cat-made-up', borough: 'Camden' }, refs), 'badCategory')
  assert.equal(checkCard({ categoryId: NO_CATEGORY, borough: 'Camden' }, refs), 'badCategory')
  assert.equal(checkCard({ categoryId: 'cat-beauty', borough: 'camden' }, refs), 'badBorough')
  assert.equal(checkCard({ categoryId: 'cat-beauty', borough: 'Somewhere nice' }, refs), 'badBorough')
})

test('catalogue request: a listed category, or «no category» with a suggestion', () => {
  assert.deepEqual(checkCatalogRequest({ categoryId: 'cat-beauty', suggestion: 'ignored', borough: 'Camden' }, refs), {
    ok: true,
    categoryId: 'cat-beauty',
    suggestion: null,
    borough: 'Camden',
  })
  assert.deepEqual(checkCatalogRequest({ categoryId: NO_CATEGORY, suggestion: '  Ремонт   часов ', borough: 'Camden' }, refs), {
    ok: true,
    categoryId: null,
    suggestion: 'Ремонт часов',
    borough: 'Camden',
  })
  assert.deepEqual(checkCatalogRequest({ categoryId: NO_CATEGORY, suggestion: '  ', borough: 'Camden' }, refs), {
    ok: false,
    error: 'needSuggestion',
  })
  assert.deepEqual(checkCatalogRequest({ categoryId: NO_CATEGORY, suggestion: 'x'.repeat(201), borough: 'Camden' }, refs), {
    ok: false,
    error: 'needSuggestion',
  })
  assert.deepEqual(checkCatalogRequest({ categoryId: 'Beauty salon', suggestion: null, borough: 'Camden' }, refs), {
    ok: false,
    error: 'badCategory',
  })
  assert.deepEqual(checkCatalogRequest({ categoryId: 'cat-beauty', suggestion: null, borough: 'Zone 2' }, refs), {
    ok: false,
    error: 'badBorough',
  })
})
