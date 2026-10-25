import { describe, expect, it } from 'vitest'
import {
  mapHljsClasses,
  mapPrismClasses,
  mapShikiScopes,
  mapTokenClasses,
  normalizeClassNames,
} from '@/core/token-types'

describe('semantic token mapping', () => {
  it.each([
    [['source.js', 'storage.type.js'], 'keyword'],
    [['source.ts', 'keyword.control'], 'keyword'],
    [['string.quoted.single.js'], 'string'],
    [['string.regexp.js'], 'regexp'],
    [['comment.line.double-slash.js'], 'comment'],
    [['constant.numeric.decimal.js'], 'number'],
    [['constant.language.boolean'], 'constant'],
    [['entity.name.function'], 'function'],
    [['entity.name.class'], 'class'],
    [['support.type.property-name'], 'property'],
    [['entity.name.tag'], 'tag'],
    [['entity.other.attribute-name'], 'attribute'],
    [['punctuation.definition.tag'], 'punctuation'],
    [['meta.decorator'], 'decorator'],
    [['unknown.scope'], 'plain'],
    [['source.js', 'unmapped.zone'], 'plain'],
    [[], 'plain'],
  ] as const)('maps Shiki scopes %j to %s', (scopes, expected) => {
    expect(mapShikiScopes([...scopes])).toBe(expected)
  })

  it.each([
    [['hljs-keyword'], 'keyword'],
    [['hljs-string'], 'string'],
    [['hljs-title', 'function_'], 'function'],
    [['title', 'class_'], 'class'],
    [['hljs-attr'], 'attribute'],
    [['hljs-comment'], 'comment'],
    [['hljs-number'], 'number'],
    [['hljs-built_in'], 'function'],
    [['hljs-type'], 'type'],
    [['hljs-variable'], 'variable'],
    [['hljs-operator'], 'operator'],
    [['hljs-meta'], 'meta'],
    [['hljs-unknown'], 'plain'],
    [undefined, 'plain'],
  ] as const)('maps highlight.js classes %j to %s', (classes, expected) => {
    expect(mapHljsClasses(classes)).toBe(expected)
  })

  it.each([
    [['token', 'keyword'], 'keyword'],
    [['token', 'string'], 'string'],
    [['token', 'comment'], 'comment'],
    [['token', 'function'], 'function'],
    [['token', 'class-name'], 'class'],
    [['token', 'attr-name'], 'attribute'],
    [['token', 'number'], 'number'],
    [['token', 'boolean'], 'constant'],
    [['token', 'regex'], 'regexp'],
    [['token', 'operator'], 'operator'],
    [['token', 'punctuation'], 'punctuation'],
    [['token', 'decorator'], 'decorator'],
    [['token', 'nope'], 'plain'],
  ] as const)('maps Prism classes %j to %s', (classes, expected) => {
    expect(mapPrismClasses(classes)).toBe(expected)
  })

  it('normalizes class names from strings, arrays and objects', () => {
    expect(normalizeClassNames('a b')).toEqual(['a', 'b'])
    expect(normalizeClassNames(['a', ['b']])).toEqual(['a', 'b'])
    expect(normalizeClassNames({ a: true, b: false })).toEqual(['a'])
    expect(normalizeClassNames(null)).toEqual([])
  })

  it('detects the class dialect', () => {
    expect(mapTokenClasses(['hljs-keyword'])).toBe('keyword')
    expect(mapTokenClasses(['token', 'string'])).toBe('string')
  })
})
