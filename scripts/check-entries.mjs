import { EngineManager as CoreEngineManager } from '../dist/core-entry.js'
import * as core from '../dist/core-entry.js'
import { existsSync, readFileSync } from 'node:fs'

const failures = []

try {
  new CoreEngineManager().resolve('shiki')
  failures.push('core entry unexpectedly resolved the built-in Shiki engine')
} catch (error) {
  if (!String(error?.message ?? error).includes('core entry has no built-in engine')) {
    failures.push(`core entry failed for the wrong reason: ${String(error)}`)
  }
}

const full = await import('../dist/index.js')
const fullManager = new full.EngineManager()
const loaded = fullManager.resolve('shiki')
if (!loaded || typeof loaded.then !== 'function') {
  failures.push('default entry did not resolve Shiki through the built-in loader')
} else {
  try {
    await loaded
  } catch (error) {
    failures.push(`default entry failed to load Shiki: ${String(error)}`)
  }
}
fullManager.dispose()

const coreKeys = Object.keys(core).sort()
const fullKeys = Object.keys(full).sort()
if (JSON.stringify(coreKeys) !== JSON.stringify(fullKeys)) {
  failures.push('core and default entries expose different runtime keys')
}

const declarationFiles = [
  'dist/api.d.ts',
  'dist/component/SyntaxHighlighter.d.ts',
  'dist/component/SyntaxHighlighterProvider.d.ts',
  'dist/composables/useSyntaxHighlighter.d.ts',
  'dist/core/context.d.ts',
]
const declarations = declarationFiles
  .filter((file) => existsSync(file))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n')
for (const file of declarationFiles) {
  if (!existsSync(file)) failures.push(`missing declaration file ${file}`)
}
for (const name of [
  'ThemeScope',
  'LineHeightMode',
  'HighlighterScopeMode',
  'HighlightInput',
  'themeScope',
  'lineHeightMode',
  'renderless',
  'cacheEngineIdentity',
  'preserveTrailingNewline',
]) {
  if (!declarations.includes(name)) failures.push(`declarations are missing ${name}`)
}
if (!existsSync('dist/styles/complete.css')) {
  failures.push('missing dist/styles/complete.css')
}

if (failures.length > 0) {
  console.error(`entry check failed:\n${failures.map((item) => `  ${item}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`entry check passed (${coreKeys.length} runtime exports, core/full split)`)
}
