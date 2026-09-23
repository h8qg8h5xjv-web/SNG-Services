import { test } from 'node:test'
import assert from 'node:assert/strict'
import { searchNavPath } from './target.ts'

// Regression guard for the recurring search bug: typing text and submitting MUST
// navigate to /search carrying that text as q. (Run: npm test)
test('non-empty query navigates to /search with the text as q', () => {
  assert.equal(searchNavPath('маникюр'), '/search?q=' + encodeURIComponent('маникюр'))
})

test('wrong-layout text is carried verbatim (decodes back to what was typed)', () => {
  const path = searchNavPath('vfybr.h')
  assert.ok(path)
  const q = new URLSearchParams(path.split('?')[1]).get('q')
  assert.equal(q, 'vfybr.h')
})

test('surrounding whitespace is trimmed but inner text kept', () => {
  assert.equal(searchNavPath('  маникюр  '), '/search?q=' + encodeURIComponent('маникюр'))
})

test('special characters are encoded, not dropped', () => {
  const path = searchNavPath('a & b')
  assert.ok(path && !path.includes(' & '))
  assert.equal(new URLSearchParams(path.split('?')[1]).get('q'), 'a & b')
})

test('empty or whitespace query navigates nowhere', () => {
  assert.equal(searchNavPath(''), null)
  assert.equal(searchNavPath('   '), null)
})
