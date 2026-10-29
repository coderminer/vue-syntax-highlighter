import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const root = process.cwd()
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const failures = []

function fail(message) {
  failures.push(message)
  console.error(`package check failed: ${message}`)
}

function pnpm(args) {
  return execFileSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', args, {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
}

function checkTargets(subpath, entry, prefix = '') {
  if (typeof entry === 'string') {
    const target = resolve(root, entry)
    if (!existsSync(target)) fail(`${subpath}${prefix} target ${entry} does not exist`)
    return
  }
  if (!entry || typeof entry !== 'object') {
    fail(`${subpath}${prefix} has an invalid exports target`)
    return
  }
  for (const [condition, target] of Object.entries(entry)) {
    if (typeof target === 'string') {
      const file = resolve(root, target)
      if (!existsSync(file)) fail(`${subpath} ${condition} -> ${target} does not exist`)
    } else {
      checkTargets(subpath, target, ` ${condition}`)
    }
  }
}

for (const [subpath, entry] of Object.entries(pkg.exports ?? {})) {
  checkTargets(subpath, entry)
  if (subpath.endsWith('.css') || subpath === './package.json') continue
  const specifier =
    subpath === '.' ? pkg.name : `${pkg.name}/${subpath.replace(/^\.\//, '')}`
  try {
    const resolved = await import.meta.resolve(specifier)
    if (!resolved.startsWith('file:')) fail(`${specifier} did not resolve to a file`)
  } catch (error) {
    fail(`${specifier} failed to resolve: ${String(error)}`)
  }
}

const jsSubpaths = Object.keys(pkg.exports ?? {}).filter(
  (subpath) => !subpath.endsWith('.css') && subpath !== './package.json',
)
for (const subpath of jsSubpaths) {
  const specifier = subpath === '.' ? pkg.name : `${pkg.name}/${subpath.replace(/^\.\//, '')}`
  try {
    await import(specifier)
  } catch (error) {
    fail(`importing ${specifier} failed: ${String(error)}`)
  }
}

try {
  await import(`${pkg.name}/dist/index.js`)
  fail('a deep dist import unexpectedly resolved')
} catch (error) {
  if (!String(error?.code ?? error).includes('ERR_PACKAGE_PATH_NOT_EXPORTED')) {
    fail(`deep import failed for the wrong reason: ${String(error)}`)
  }
}

if (!Array.isArray(pkg.sideEffects) || !pkg.sideEffects.some((value) => value.endsWith('.css'))) {
  fail('sideEffects must be limited to CSS')
}
if (pkg.type !== 'module') fail('package must be ESM-only (type=module)')
if (!pkg.peerDependencies?.vue) fail('vue must be a required peer dependency')
if (pkg.dependencies?.vue) {
  fail('vue must not be bundled as a regular dependency')
}
for (const peer of ['shiki', 'lowlight', 'highlight.js', 'refractor']) {
  if (!pkg.peerDependencies?.[peer] || pkg.peerDependenciesMeta?.[peer]?.optional !== true) {
    fail(`${peer} must be an optional peer dependency`)
  }
}

const metadata = {
  description: (value) => typeof value === 'string' && value.length > 0,
  author: (value) => typeof value === 'string' && value.length > 0,
  repository: (value) =>
    value?.type === 'git' && /^git\+https:\/\/github\.com\/[^/]+\/[^/]+\.git$/.test(value.url ?? ''),
  homepage: (value) => typeof value === 'string' && value.startsWith('https://'),
  bugs: (value) => typeof value?.url === 'string' && value.url.startsWith('https://'),
  keywords: (value) => Array.isArray(value) && value.length >= 5,
}
for (const [field, validate] of Object.entries(metadata)) {
  if (!validate(pkg[field])) fail(`package.json is missing valid npm metadata: ${field}`)
}
if (pkg.private === true) fail('package.json must not be private')
if (pkg.publishConfig?.access !== 'public') fail('publishConfig.access must be public')
for (const field of ['main', 'types']) {
  const target = pkg[field]
  if (typeof target !== 'string' || !existsSync(resolve(root, target))) {
    fail(`package.json ${field} must point at a built file`)
  }
}

const packOutput = execFileSync(
  process.platform === 'win32' ? 'npm.cmd' : 'npm',
  ['pack', '--dry-run', '--json'],
  { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' },
)
const packed = JSON.parse(packOutput)
const files = packed[0]?.files?.map((file) => file.path) ?? []
for (const required of ['README.md', 'CHANGELOG.md', 'LICENSE', 'package.json', 'dist/index.js', 'dist/index.d.ts', 'dist/styles.css', 'dist/styles/fallback.css', 'dist/styles/complete.css']) {
  if (!files.includes(required)) fail(`packed artifact is missing ${required}`)
}
for (const file of files) {
  if (file.endsWith('.map')) fail(`packed artifact unexpectedly includes source map ${file}`)
  if (/^(src|tests|docs|scripts|openspec)\//.test(file) || /^tsconfig|^vite\.config|^vitest\.|^playwright\./.test(file)) {
    fail(`packed artifact unexpectedly includes ${file}`)
  }
}

try {
  pnpm(['exec', 'publint', '--strict'])
} catch (error) {
  fail(`publint failed: ${String(error.stdout ?? error.message)}`)
}

try {
  execFileSync(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['exec', 'attw', '--pack', '.', '--profile', 'esm-only', '--exclude-entrypoints', 'styles.css', 'styles/fallback.css', 'styles/complete.css'],
    {
      cwd: root,
      stdio: 'pipe',
      encoding: 'utf8',
      shell: process.platform === 'win32',
      // attw runs `npm pack` internally. During `npm publish --dry-run` the
      // inherited flag would suppress the tarball that attw expects to read.
      env: { ...process.env, npm_config_dry_run: 'false' },
    },
  )
} catch (error) {
  fail(`attw failed:\n${String(error.stdout ?? '')}\n${String(error.stderr ?? error.message)}`)
}

const invalid = spawnSync(
  process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
  ['exec', 'tsc', '-p', 'tests/fixtures/invalid-engine/tsconfig.json', '--noEmit'],
  { cwd: root, encoding: 'utf8', shell: process.platform === 'win32' },
)
if (invalid.status === 0) {
  fail('invalid engine type fixture unexpectedly type-checked')
} else if (!/highlight/.test(`${invalid.stdout}${invalid.stderr}`)) {
  fail('invalid engine type fixture failed without a missing-member diagnostic')
}

if (failures.length > 0) {
  console.error(`\n${failures.length} package check(s) failed`)
  process.exitCode = 1
} else {
  console.log(`package check passed (${files.length} packed files)`)
}
