import { readFileSync, writeFileSync } from 'node:fs'

const TOKEN_TYPES = [
  'plain',
  'keyword',
  'string',
  'regexp',
  'comment',
  'number',
  'constant',
  'function',
  'class',
  'type',
  'variable',
  'property',
  'operator',
  'punctuation',
  'tag',
  'attribute',
  'decorator',
  'meta',
  'invalid',
]

// Short internal aliases keep the stylesheet under its gzip budget. Public
// overrides use the --vsh-light-*/--vsh-dark-* theme variables.
const SHORT = {
  plain: 'p',
  keyword: 'k',
  string: 's',
  regexp: 'r',
  comment: 'c',
  number: 'n',
  constant: 'o',
  function: 'f',
  class: 'l',
  type: 't',
  variable: 'v',
  property: 'q',
  operator: 'a',
  punctuation: 'u',
  tag: 'g',
  attribute: 'b',
  decorator: 'd',
  meta: 'm',
  invalid: 'i',
}

const source = readFileSync('src/types.ts', 'utf8')
const declared = [...source.matchAll(/'([a-z]+)'/g)].map((match) => match[1])
if (!TOKEN_TYPES.every((type) => declared.includes(type))) {
  throw new Error('Token type list is out of sync with src/types.ts')
}

const styleAliases = (scheme) => {
  const prefix = `--vsh-${scheme}`
  const declarations = []
  for (const type of TOKEN_TYPES) {
    const short = SHORT[type]
    declarations.push(
      `--vsh-t-${short}-s: var(${prefix}-token-${type}-font-style, inherit);`,
      `--vsh-t-${short}-w: var(${prefix}-token-${type}-font-weight, inherit);`,
      `--vsh-t-${short}-d: var(${prefix}-token-${type}-text-decoration, inherit);`,
    )
  }
  return declarations.join('\n  ')
}

const tokenRules = TOKEN_TYPES.map((type) => {
  const short = SHORT[type]
  return `.vsh-token-${type} {
  color: var(--vsh-c-${short}, light-dark(var(--vsh-light-token-${type}-color, inherit), var(--vsh-dark-token-${type}-color, inherit)));
  font-style: var(--vsh-t-${short}-s, inherit);
  font-weight: var(--vsh-t-${short}-w, inherit);
  text-decoration: var(--vsh-t-${short}-d, inherit);
}`
}).join('\n')

const css = `/* vue-syntax-highlighter base stylesheet. Theme values are supplied as CSS custom properties. */
.vsh-scope {
  display: contents;
}

.vsh {
  position: relative;
  box-sizing: border-box;
  background: var(--vsh-bg, light-dark(var(--vsh-light-bg, #ffffff), var(--vsh-dark-bg, #0d1117)));
  color: var(--vsh-fg, light-dark(var(--vsh-light-fg, #24292f), var(--vsh-dark-fg, #e6edf3)));
  font-family: var(--vsh-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  font-size: 0.875rem;
  line-height: 1.5;
  border-radius: 6px;
  overflow: hidden;
  tab-size: 4;
}

.vsh-pre {
  box-sizing: border-box;
  margin: 0;
  padding: 0.875rem 1rem;
  overflow: auto;
  font: inherit;
  line-height: inherit;
}

.vsh-pre:focus-visible {
  outline: 2px solid var(--vsh-selection, light-dark(var(--vsh-light-selection, #b6d7ff), var(--vsh-dark-selection, #264f78)));
  outline-offset: -2px;
}

.vsh-code {
  display: block;
  font: inherit;
  line-height: inherit;
}

.vsh-line {
  display: flex;
  align-items: flex-start;
  min-height: 1.5em;
}

.vsh-line-highlighted {
  background: var(--vsh-line-highlight, light-dark(var(--vsh-light-line-highlight, transparent), var(--vsh-dark-line-highlight, transparent)));
}

.vsh-line-content {
  flex: 1 1 auto;
  min-width: 0;
  white-space: pre;
}

.vsh-wrap .vsh-pre {
  overflow-x: hidden;
}

.vsh-wrap .vsh-line-content {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.vsh-gutter {
  flex: 0 0 auto;
  width: var(--vsh-gutter-width);
  margin-right: 1ch;
  text-align: right;
  color: var(--vsh-gutter, light-dark(var(--vsh-light-gutter, #6e7781), var(--vsh-dark-gutter, #7d8590)));
  user-select: none;
}

.vsh ::selection {
  background: var(--vsh-selection, light-dark(var(--vsh-light-selection, #b6d7ff), var(--vsh-dark-selection, #264f78)));
}

${tokenRules}

/* color-scheme makes light-dark() follow the nearest scope, so nested scopes
   override their ancestors without descendant-specific selectors. */
.vsh[data-vsh-scheme='light'],
.vsh-scope[data-vsh-scheme='light'] {
  color-scheme: light;
  --vsh-font-family: var(--vsh-light-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  ${styleAliases('light')}
}

.vsh[data-vsh-scheme='dark'],
.vsh-scope[data-vsh-scheme='dark'] {
  color-scheme: dark;
  --vsh-font-family: var(--vsh-dark-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  ${styleAliases('dark')}
}

.vsh[data-vsh-scheme='auto'],
.vsh-scope[data-vsh-scheme='auto'] {
  color-scheme: light dark;
  --vsh-font-family: var(--vsh-light-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  ${styleAliases('light')}
}

@media (prefers-color-scheme: dark) {
  .vsh[data-vsh-scheme='auto'],
  .vsh-scope[data-vsh-scheme='auto'] {
    --vsh-font-family: var(--vsh-dark-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
    ${styleAliases('dark')}
  }
}
`

writeFileSync('src/styles/base.css', css)

const FALLBACK_COLORS = {
  light: {
    bg: '#ffffff',
    fg: '#24292f',
    gutter: '#6e7781',
    selection: '#b6d7ff',
  },
  dark: {
    bg: '#0d1117',
    fg: '#e6edf3',
    gutter: '#7d8590',
    selection: '#264f78',
  },
}

const fallbackAliases = (scheme) => {
  const prefix = `--vsh-${scheme}`
  const defaults = FALLBACK_COLORS[scheme]
  const declarations = [
    `--vsh-bg: var(${prefix}-bg, ${defaults.bg});`,
    `--vsh-fg: var(${prefix}-fg, ${defaults.fg});`,
    `--vsh-gutter: var(${prefix}-gutter, ${defaults.gutter});`,
    `--vsh-line-highlight: var(${prefix}-line-highlight, transparent);`,
    `--vsh-selection: var(${prefix}-selection, ${defaults.selection});`,
    `--vsh-font-family: var(${prefix}-font-family, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);`,
  ]
  for (const type of TOKEN_TYPES) {
    const short = SHORT[type]
    declarations.push(
      `--vsh-c-${short}: var(${prefix}-token-${type}-color, var(--vsh-fg));`,
      `--vsh-t-${short}-s: var(${prefix}-token-${type}-font-style, inherit);`,
      `--vsh-t-${short}-w: var(${prefix}-token-${type}-font-weight, inherit);`,
      `--vsh-t-${short}-d: var(${prefix}-token-${type}-text-decoration, inherit);`,
    )
  }
  return declarations.join('\n  ')
}

const fallback = `/* Optional fallback for browsers without light-dark(). Import after styles.css. */
@supports not (color: light-dark(#000000, #ffffff)) {
  .vsh-gutter {
    -webkit-user-select: none;
  }

  .vsh[data-vsh-scheme='light'],
  .vsh-scope[data-vsh-scheme='light'] {
  ${fallbackAliases('light')}
  }

  .vsh[data-vsh-scheme='dark'],
  .vsh-scope[data-vsh-scheme='dark'] {
  ${fallbackAliases('dark')}
  }

  .vsh[data-vsh-scheme='auto'],
  .vsh-scope[data-vsh-scheme='auto'] {
  ${fallbackAliases('light')}
  }

  @media (prefers-color-scheme: dark) {
    .vsh[data-vsh-scheme='auto'],
    .vsh-scope[data-vsh-scheme='auto'] {
    ${fallbackAliases('dark')}
    }
  }
}
`
writeFileSync('src/styles/fallback.css', fallback)
console.log('generated src/styles/base.css and src/styles/fallback.css')
