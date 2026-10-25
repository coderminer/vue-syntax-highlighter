import { defineTheme } from '../core/define-theme.js'

/**
 * Warm light palette. Matched with `vsh-midnight`.
 */
export const vshPaper = defineTheme({
  name: 'vsh-paper',
  colorScheme: 'light',
  colors: {
    background: '#fdf6e3',
    foreground: '#3b3a36',
    gutter: '#6f6653',
    lineHighlight: '#f5ecd5',
    selection: '#d9c9a3',
    fontFamily: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  },
  tokens: {
    plain: { color: '#3b3a36' },
    keyword: { color: '#b3552b', fontWeight: '600' },
    string: { color: '#53733f' },
    regexp: { color: '#2f6f62' },
    comment: { color: '#8b816b', fontStyle: 'italic' },
    number: { color: '#8a4b08' },
    constant: { color: '#8a4b08' },
    function: { color: '#6b4c9a' },
    class: { color: '#9a5b13' },
    type: { color: '#9a5b13' },
    variable: { color: '#3b3a36' },
    property: { color: '#2f5d8a' },
    operator: { color: '#b3552b' },
    punctuation: { color: '#766b57' },
    tag: { color: '#53733f' },
    attribute: { color: '#2f5d8a' },
    decorator: { color: '#6b4c9a' },
    meta: { color: '#8b816b' },
    invalid: { color: '#b3552b', textDecoration: 'underline wavy #b3552b' },
  },
})

export default vshPaper
