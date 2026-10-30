import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { init, parse } from 'es-module-lexer'

/**
 * Freezes the public export surface. The additive-only policy makes every
 * export a permanent commitment, so adding one must be an explicit, reviewed
 * step instead of a side effect of editing src/api.ts.
 *
 * Runtime names come from the built entry; type names come from the flat
 * declaration aggregator (`dist/api.d.ts`). `dist/index.d.ts` only re-exports
 * both, so it is asserted separately instead of being parsed.
 */

await init

if (
  !existsSync('dist/index.js') ||
  !existsSync('dist/api.d.ts') ||
  !existsSync('dist/index.d.ts')
) {
  console.error('api check failed: dist is missing; run pnpm build first')
  process.exit(1)
}

const snapshotPath = 'scripts/api-snapshot.json'
const update = process.argv.includes('--update')
const failures = []

function read(file) {
  if (!existsSync(file)) {
    failures.push(`${file} is missing; run pnpm build first`)
    return ''
  }
  return readFileSync(file, 'utf8')
}

function exportNames(file) {
  const source = read(file)
  if (!source) return []
  const [, exports] = parse(source)
  const names = []
  for (const entry of exports) {
    if (!entry.n) {
      failures.push(`${file} contains an unresolved export star; list names explicitly`)
      continue
    }
    names.push(entry.n)
  }
  return [...new Set(names)].sort()
}

function declarationNames(file) {
  const source = read(file)
  if (!source) return []
  if (/export\s+\*/.test(source)) {
    failures.push(`${file} contains an unresolved export star; list names explicitly`)
  }
  const names = new Set()
  const clause = /export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+['"][^'"]+['"];?/g
  for (const match of source.matchAll(clause)) {
    for (const raw of match[1].split(',')) {
      const part = raw.trim().replace(/^type\s+/, '')
      if (!part) continue
      const [local, exported] = part.split(/\s+as\s+/)
      const name = (exported ?? local).trim()
      if (name && name !== 'default') names.add(name)
    }
  }
  return [...names].sort()
}

function diff(expected, actual) {
  const expectedSet = new Set(expected)
  const actualSet = new Set(actual)
  return {
    added: actual.filter((name) => !expectedSet.has(name)),
    removed: expected.filter((name) => !actualSet.has(name)),
  }
}

function formatDiff(label, { added, removed }) {
  for (const name of added) {
    failures.push(`${label} added "${name}"; run --update and record why in ${snapshotPath}`)
  }
  for (const name of removed) {
    failures.push(`${label} removed "${name}"; the additive-only policy forbids removals`)
  }
}

// The root declaration file must stay a thin re-export so type names can be
// read from one flat aggregator.
const declarationLines = read('dist/index.d.ts')
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
const expectedDeclarationLines = [
  "export { default } from './api.js';",
  "export * from './api.js';",
]
if (
  declarationLines.length !== expectedDeclarationLines.length ||
  !expectedDeclarationLines.every((line) => declarationLines.includes(line))
) {
  failures.push(
    'dist/index.d.ts must stay a thin re-export of ./api.js; update the type snapshot logic if this changes',
  )
}

const runtime = exportNames('dist/index.js')
const declarations = declarationNames('dist/api.d.ts')

for (const [label, file] of [
  ['core entry', 'dist/core-entry.js'],
  ['full entry', 'dist/full.js'],
]) {
  const names = exportNames(file)
  for (const name of names) {
    if (!runtime.includes(name))
      failures.push(`${label} exports "${name}" but the root entry does not`)
  }
  for (const name of runtime) {
    if (!names.includes(name)) failures.push(`${label} is missing "${name}" from the root entry`)
  }
}

let snapshot = { runtime: [], declarations: [], notes: {} }
if (existsSync(snapshotPath)) {
  snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'))
}
const notes = { ...(snapshot.notes ?? {}) }
for (const name of runtime) {
  if (!(name in notes)) notes[name] = ''
}

const runtimeDiff = diff(snapshot.runtime ?? [], runtime)
const declarationDiff = diff(snapshot.declarations ?? [], declarations)

if (update) {
  for (const [label, { removed }] of [
    ['runtime export', runtimeDiff],
    ['declaration export', declarationDiff],
  ]) {
    for (const name of removed) {
      failures.push(
        `${label} removed "${name}"; the additive-only policy forbids removals, restore it before updating`,
      )
    }
  }
} else {
  formatDiff('runtime export', runtimeDiff)
  formatDiff('declaration export', declarationDiff)
}

for (const name of runtime) {
  if (!notes[name] || !String(notes[name]).trim()) {
    failures.push(`runtime export "${name}" has no note; explain why it must stay public`)
  }
}
for (const name of Object.keys(notes)) {
  if (!runtime.includes(name)) {
    failures.push(`note for "${name}" has no matching runtime export; remove the stale note`)
  }
}

if (update) {
  const next = {
    runtime,
    declarations,
    notes: Object.fromEntries(
      Object.keys(notes)
        .filter((name) => runtime.includes(name))
        .sort()
        .map((name) => [name, notes[name]]),
    ),
  }
  writeFileSync(snapshotPath, JSON.stringify(next, null, 2) + '\n')
}

if (failures.length > 0) {
  console.error(`api check failed:\n${failures.map((item) => `  ${item}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(
    `api check passed (${runtime.length} runtime exports, ${declarations.length} declaration exports${update ? ', snapshot updated' : ''})`,
  )
}
