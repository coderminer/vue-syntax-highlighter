import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'

const root = process.cwd()
const dist = resolve(root, 'dist')

function fail(message) {
  console.error(`graph check failed: ${message}`)
  process.exitCode = 1
}

function read(file) {
  return readFileSync(file, 'utf8')
}

function staticImports(file) {
  const code = read(file)
  const specifiers = new Set()
  for (const match of code.matchAll(/\b(?:import|export)\s*(?:[^"'`()]*?\bfrom\s*)?["']([^"']+)["']/g)) {
    if (match[1]) specifiers.add(match[1])
  }
  return [...specifiers]
}

function dynamicImports(file) {
  const code = read(file)
  return [...code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)]
    .map((match) => match[1])
    .filter(Boolean)
}

function graph(entry) {
  const entryFile = resolve(dist, entry)
  if (!existsSync(entryFile)) {
    fail(`missing build entry ${entry}`)
    return { modules: [], dynamic: [] }
  }
  const modules = new Set()
  const dynamic = new Set()
  const queue = [entryFile]
  while (queue.length) {
    const file = queue.pop()
    if (!file || modules.has(file)) continue
    modules.add(file)
    for (const specifier of dynamicImports(file)) dynamic.add(specifier)
    for (const specifier of staticImports(file)) {
      if (!specifier.startsWith('.')) continue
      const target = resolve(dirname(file), specifier)
      if (!existsSync(target)) {
        fail(`${relative(dist, file)} imports missing ${specifier}`)
        continue
      }
      queue.push(target)
    }
  }
  return {
    modules: [...modules].map((file) => relative(dist, file).split(sep).join('/')).sort(),
    dynamic: [...dynamic].sort(),
  }
}

function assertNoGraph(entry, patterns, label) {
  const result = graph(entry)
  for (const file of result.modules) {
    for (const pattern of patterns) {
      if (pattern.test(file)) fail(`${entry} ${label} unexpectedly includes ${file}`)
    }
  }
  return result
}

const full = assertNoGraph(
  'index.js',
  [/^engines\//, /^chunks\/(?:shiki|highlightjs|prism)-/, /languages/],
  'static graph',
)
if (full.dynamic.length === 0) fail('the default entry should reference adapters through dynamic imports')
for (const specifier of full.dynamic) {
  if (!/engines\/(shiki|highlightjs|lowlight|prism)\.js$/.test(specifier)) {
    fail(`unexpected default-entry dynamic import ${specifier}`)
  }
}

const core = assertNoGraph(
  'core-entry.js',
  [/^engines\//, /^chunks\/builtin-engines-/, /languages/],
  'static graph',
)
if (core.dynamic.length !== 0) {
  fail(`core entry must not reference built-in adapters: ${core.dynamic.join(', ')}`)
}

const shiki = assertNoGraph(
  'engines/shiki.js',
  [/^engines\/(?:highlightjs|prism)\.js$/, /^themes\//, /^index\.js$/],
  'static graph',
)
const highlightjs = assertNoGraph(
  'engines/highlightjs.js',
  [/^engines\/(?:shiki|prism)\.js$/, /^themes\//, /^index\.js$/],
  'static graph',
)
const lowlight = assertNoGraph(
  'engines/lowlight.js',
  [/^engines\/(?:shiki|prism)\.js$/, /^themes\//, /^index\.js$/],
  'static graph',
)
const prism = assertNoGraph(
  'engines/prism.js',
  [/^engines\/(?:shiki|highlightjs|lowlight)\.js$/, /^themes\//, /^index\.js$/],
  'static graph',
)

const darkTheme = assertNoGraph(
  'themes/vsh-dark.js',
  [/^themes\/(?!vsh-dark\.js$)/, /^engines\//, /^index\.js$/],
  'static graph',
)

const coreCode = core.modules.map((file) => read(resolve(dist, file))).join('\n')
if (/\bdocument\./.test(coreCode)) fail('core static graph accesses document at import scope')
if (/import\s*\(\s*["'][^"']*langs?/.test(coreCode)) fail('core static graph references language data')

console.log('static graph check passed')
console.log(`  default/full: ${full.modules.join(', ')}`)
console.log(`  default/full dynamic adapters: ${full.dynamic.join(', ')}`)
console.log(`  core entry: ${core.modules.join(', ')}`)
console.log(`  core entry dynamic adapters: ${core.dynamic.join(', ') || 'none'}`)
console.log(`  shiki: ${shiki.modules.join(', ')}`)
console.log(`  highlight.js: ${highlightjs.modules.join(', ')}`)
console.log(`  lowlight: ${lowlight.modules.join(', ')}`)
console.log(`  prism: ${prism.modules.join(', ')}`)
console.log(`  theme: ${darkTheme.modules.join(', ')}`)

const styles = resolve(dist, 'styles.css')
if (!existsSync(styles)) fail('missing dist/styles.css')
if (!existsSync(resolve(dist, 'styles/fallback.css'))) fail('missing dist/styles/fallback.css')
