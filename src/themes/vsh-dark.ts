import { defineTheme } from '../core/define-theme.js'

/**
 * Dark counterpart to `vsh-light`.
 */
export const vshDark = defineTheme({
  name: 'vsh-dark',
  colorScheme: 'dark',
  colors: {
    background: '#0d1117',
    foreground: '#e6edf3',
    gutter: '#7d8590',
    lineHighlight: '#161b22',
    selection: '#264f78',
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  tokens: {
    plain: { color: '#e6edf3' },
    keyword: { color: '#ff7b72', fontWeight: '600' },
    string: { color: '#a5d6ff' },
    regexp: { color: '#7ee787' },
    comment: { color: '#8b949e', fontStyle: 'italic' },
    number: { color: '#79c0ff' },
    constant: { color: '#79c0ff' },
    function: { color: '#d2a8ff' },
    class: { color: '#ffa657' },
    type: { color: '#ffa657' },
    variable: { color: '#e6edf3' },
    property: { color: '#79c0ff' },
    operator: { color: '#ff7b72' },
    punctuation: { color: '#8b949e' },
    tag: { color: '#7ee787' },
    attribute: { color: '#79c0ff' },
    decorator: { color: '#d2a8ff' },
    meta: { color: '#8b949e' },
    invalid: { color: '#ff7b72', textDecoration: 'underline wavy #ff7b72' },
  },
})

export default vshDark
