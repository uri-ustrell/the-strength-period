import assert from 'node:assert/strict'
import { test } from 'node:test'
import { findDuplicateKeys } from './findDuplicateKeys'

test('returns empty array for valid JSON with no duplicates', () => {
  const raw = JSON.stringify({ a: 1, b: { c: 2, d: 3 }, e: [1, 2, 3] }, null, 2)
  assert.deepEqual(findDuplicateKeys(raw), [])
})

test('flags a duplicate key at the root', () => {
  const raw = `{
    "a": 1,
    "b": 2,
    "a": 3
  }`
  assert.deepEqual(findDuplicateKeys(raw), ['a'])
})

test('flags a duplicate key nested in an object with a dotted path', () => {
  const raw = `{
    "session": {
      "rest": "Descans",
      "skip": "Salta",
      "rest": { "skip_aria": "x" }
    }
  }`
  assert.deepEqual(findDuplicateKeys(raw), ['session.rest'])
})

test('does NOT flag the same key name in two different objects', () => {
  const raw = `{
    "ca": { "name": "a" },
    "es": { "name": "b" }
  }`
  assert.deepEqual(findDuplicateKeys(raw), [])
})

test('ignores key-like text inside string values, incl. {{interpolation}}', () => {
  const raw = `{
    "msg": "Exercici {{current}} de {{total}}",
    "other": "has a : colon and \\"quotes\\" and { braces }"
  }`
  assert.deepEqual(findDuplicateKeys(raw), [])
})

test('flags duplicates inside objects nested within arrays', () => {
  const raw = `{
    "items": [
      { "id": 1, "id": 2 }
    ]
  }`
  assert.deepEqual(findDuplicateKeys(raw), ['items.id'])
})

test('reports each repeated occurrence beyond the first', () => {
  const raw = `{ "a": 1, "a": 2, "a": 3 }`
  assert.deepEqual(findDuplicateKeys(raw), ['a', 'a'])
})
