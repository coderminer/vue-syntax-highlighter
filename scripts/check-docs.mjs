import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const root = process.cwd()
const docs = join(root, 'docs')
const failures = []

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const file = join(dir, name)
    return statSync(file).isDirectory() ? walk(file) : [file]
  })
}

const markdown = walk(docs).filter((file) => file.endsWith('.md'))

function resolvesToDocs(pathname) {
  const clean = pathname.split('#')[0].split('?')[0]
  if (!clean || clean === '/') return existsSync(join(docs, 'index.md'))
  const withoutSlash = clean.replace(/^\//, '').replace(/\/$/, '')
  const candidates = [
    join(docs, `${withoutSlash}.md`),
    join(docs, withoutSlash, 'index.md'),
    join(docs, withoutSlash),
  ]
  return candidates.some((candidate) => existsSync(candidate))
}

for (const file of markdown) {
  const source = readFileSync(file, 'utf8')
  for (const match of source.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = match[1]
    if (!target || target.startsWith('http') || target.startsWith('mailto:') || target.startsWith('#')) {
      continue
    }
    if (target.startsWith('/')) {
      if (!resolvesToDocs(target)) failures.push(`${relative(root, file)} -> ${target}`)
      continue
    }
    if (target.startsWith('./') || target.startsWith('../')) {
      const resolved = resolve(dirname(file), target.split('#')[0].split('?')[0])
      if (!existsSync(resolved) && !existsSync(`${resolved}.md`) && !existsSync(join(resolved, 'index.md'))) {
        failures.push(`${relative(root, file)} -> ${target}`)
      }
    }
  }
}

const api = readFileSync(join(docs, 'api.md'), 'utf8')
const examples = readFileSync(join(docs, 'guide/api-examples.md'), 'utf8')
const index = readFileSync(join(root, 'src/api.ts'), 'utf8')
const exported = new Set()
for (const match of index.matchAll(/export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from/g)) {
  for (const part of match[1].split(',')) {
    const cleaned = part.replace(/\/\*[\s\S]*?\*\//g, '').trim().replace(/^type\s+/, '')
    if (!cleaned) continue
    const [original, alias] = cleaned.split(/\s+as\s+/)
    if (original && original !== 'default') exported.add(original.trim())
    if (alias) exported.add(alias.trim())
  }
}
for (const name of exported) {
  if (!api.includes(`\`${name}\``)) {
    failures.push(`docs/api.md is missing export ${name}`)
  }
  if (!examples.includes(name)) {
    failures.push(`docs/guide/api-examples.md is missing export ${name}`)
  }
}

const adapterExports = [
  'createShikiEngine',
  'ShikiEngine',
  'ShikiEngineOptions',
  'ShikiLanguageRegistration',
  'ShikiLanguageLoader',
  'languageLoaders',
  'languageAliases',
  'supportedLanguages',
  'createHighlightjsEngine',
  'HighlightjsEngine',
  'HighlightjsEngineOptions',
  'HighlightjsLanguageRegistration',
  'HighlightjsLanguageLoader',
  'createLowlightEngine',
  'LowlightEngine',
  'LowlightEngineOptions',
  'LowlightLanguageRegistration',
  'LowlightLanguageLoader',
  'createPrismEngine',
  'PrismEngine',
  'PrismEngineOptions',
  'PrismLanguageRegistration',
  'PrismLanguageLoader',
  'vshLight',
  'vshDark',
  'vshPaper',
  'vshMidnight',
]
for (const name of adapterExports) {
  if (!examples.includes(name)) {
    failures.push(`docs/guide/api-examples.md is missing adapter/theme export ${name}`)
  }
}

if (failures.length > 0) {
  console.error(`docs check failed:\n${failures.map((item) => `  ${item}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`docs check passed (${markdown.length} pages, ${exported.size} root exports documented)`)
}
