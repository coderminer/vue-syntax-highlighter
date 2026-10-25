import { defineTheme } from '../core/define-theme.js'

/**
 * Deep blue dark palette. Matched with `vsh-paper`.
 */
export const vshMidnight = defineTheme({
  name: 'vsh-midnight',
  colorScheme: 'dark',
  colors: {
    background: '#0f172a',
    foreground: '#e2e8f0',
    gutter: '#64748b',
    lineHighlight: '#17233b',
    selection: '#334e79',
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  tokens: {
    plain: { color: '#e2e8f0' },
    keyword: { color: '#f472b6', fontWeight: '600' },
    string: { color: '#86efac' },
    regexp: { color: '#5eead4' },
    comment: { color: '#94a3b8', fontStyle: 'italic' },
    number: { color: '#93c5fd' },
    constant: { color: '#93c5fd' },
    function: { color: '#c4b5fd' },
    class: { color: '#fbbf24' },
    type: { color: '#fbbf24' },
    variable: { color: '#e2e8f0' },
    property: { color: '#93c5fd' },
    operator: { color: '#f472b6' },
    punctuation: { color: '#94a3b8' },
    tag: { color: '#86efac' },
    attribute: { color: '#93c5fd' },
    decorator: { color: '#c4b5fd' },
    meta: { color: '#94a3b8' },
    invalid: { color: '#fb7185', textDecoration: 'underline wavy #fb7185' },
  },
})

export default vshMidnight
