import { existsSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve, sep } from 'node:path'
import { init, parse } from 'es-module-lexer'

await init

const root = process.cwd()
const dist = resolve(root, 'dist')

function fail(message) {
  console.error(`graph check failed: ${message}`)
  process.exitCode = 1
}

function read(file) {
  return readFileSync(file, 'utf8')
}

function importsOf(file) {
  return parse(read(file))[0]
}

function graph(entry) {
  const entryFile = resolve(dist, entry)
  if (!existsSync(entryFile)) {
    fail(`missing build entry ${entry}`)
    return { modules: [], dynamic: [], computed: [], bare: [] }
  }
  const modules = new Set()
  const dynamic = new Set()
  const computed = new Set()
  const bare = new Set()
  const queue = [entryFile]
  while (queue.length) {
    const file = queue.pop()
    if (!file || modules.has(file)) continue
    modules.add(file)
    for (const imported of importsOf(file)) {
      // d === -1 is a static import/export, d >= 0 is dynamic import().
      // import.meta uses d === -2 and is ignored.
      if (imported.d === -1) {
        if (!imported.n) continue
        if (!imported.n.startsWith('.')) {
          bare.add(imported.n)
          continue
        }
        const target = resolve(dirname(file), imported.n)
        if (!existsSync(target)) {
          fail(`${relative(dist, file)} imports missing ${imported.n}`)
          continue
        }
        queue.push(target)
      } else if (imported.d >= 0) {
        if (imported.n) {
          dynamic.add(imported.n)
        } else {
          const where = `${relative(dist, file).split(sep).join('/')}:${imported.s}`
          computed.add(where)
        }
      }
    }
  }
  return {
    modules: [...modules].map((file) => relative(dist, file).split(sep).join('/')).sort(),
    dynamic: [...dynamic].sort(),
    computed: [...computed].sort(),
    bare: [...bare].sort(),
  }
}

function assertBare(result, entry, allowed) {
  for (const specifier of result.bare) {
    if (!allowed.some((pattern) => pattern.test(specifier))) {
      fail(`${entry} statically imports unexpected package ${specifier}`)
    }
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
assertBare(full, 'index.js', [/^vue$/])
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
assertBare(core, 'core-entry.js', [/^vue$/])
if (core.dynamic.length !== 0) {
  fail(`core entry must not reference built-in adapters: ${core.dynamic.join(', ')}`)
}
if (core.computed.length !== 0) {
  fail(`core entry must not contain computed dynamic imports: ${core.computed.join(', ')}`)
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
assertBare(shiki, 'engines/shiki.js', [/^vue$/, /^shiki(\/.*)?$/, /^@shikijs\/.*$/])
assertBare(highlightjs, 'engines/highlightjs.js', [
  /^vue$/,
  /^lowlight(\/.*)?$/,
  /^highlight\.js(\/.*)?$/,
])
assertBare(lowlight, 'engines/lowlight.js', [
  /^vue$/,
  /^lowlight(\/.*)?$/,
  /^highlight\.js(\/.*)?$/,
])
assertBare(prism, 'engines/prism.js', [/^vue$/, /^refractor(\/.*)?$/])

const darkTheme = assertNoGraph(
  'themes/vsh-dark.js',
  [/^themes\/(?!vsh-dark\.js$)/, /^engines\//, /^index\.js$/],
  'static graph',
)
assertBare(darkTheme, 'themes/vsh-dark.js', [/^vue$/])

const coreCode = core.modules.map((file) => read(resolve(dist, file))).join('\n')
if (/\bdocument\./.test(coreCode)) fail('core static graph accesses document at import scope')
if (/import\s*\(\s*["'][^"']*langs?/.test(coreCode)) fail('core static graph references language data')

if (process.exitCode === 1) {
  console.error('static graph check failed')
} else {
  console.log('static graph check passed')
}
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
