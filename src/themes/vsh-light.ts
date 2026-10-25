import { defineTheme } from '../core/define-theme.js'

/**
 * The default light palette. Colors are intentionally authored for this
 * library rather than copied from an engine-specific theme file.
 */
export const vshLight = defineTheme({
  name: 'vsh-light',
  colorScheme: 'light',
  colors: {
    background: '#ffffff',
    foreground: '#24292f',
    gutter: '#6e7781',
    lineHighlight: '#f2f6fc',
    selection: '#b6d7ff',
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },
  tokens: {
    plain: { color: '#24292f' },
    keyword: { color: '#cf222e', fontWeight: '600' },
    string: { color: '#0a3069' },
    regexp: { color: '#116329' },
    comment: { color: '#6e7781', fontStyle: 'italic' },
    number: { color: '#0550ae' },
    constant: { color: '#0550ae' },
    function: { color: '#8250df' },
    class: { color: '#953800' },
    type: { color: '#953800' },
    variable: { color: '#24292f' },
    property: { color: '#0550ae' },
    operator: { color: '#cf222e' },
    punctuation: { color: '#57606a' },
    tag: { color: '#116329' },
    attribute: { color: '#0550ae' },
    decorator: { color: '#8250df' },
    meta: { color: '#6e7781' },
    invalid: { color: '#cf222e', textDecoration: 'underline wavy #cf222e' },
  },
})

export default vshLight
