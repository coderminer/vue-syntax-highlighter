import { execFileSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { gunzipSync } from 'node:zlib'

const root = process.cwd()
const fixture = join(root, 'tests/fixtures/consumer')
const temp = join(root, '.tmp/consumer')
const destination = join(fixture, 'node_modules/vue-syntax-highlighter')

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    stdio: 'pipe',
    encoding: 'utf8',
    shell: process.platform === 'win32',
    ...options,
  })
}

function extractTarGz(buffer, targetDir) {
  const tar = gunzipSync(buffer)
  let offset = 0
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const rawName = header.subarray(0, 100).toString('utf8').replace(/\0.*$/s, '')
    const size = Number.parseInt(header.subarray(124, 136).toString('utf8').trim() || '0', 8)
    const type = String.fromCharCode(header[156] || 48)
    offset += 512
    const data = tar.subarray(offset, offset + size)
    offset += Math.ceil(size / 512) * 512
    if (type === 'g' || type === 'x') continue
    const name = rawName.replace(/^package\//, '')
    if (!name) continue
    const target = resolve(targetDir, name)
    if (!target.startsWith(resolve(targetDir))) {
      throw new Error(`unsafe tarball entry ${name}`)
    }
    if (type === '5' || name.endsWith('/')) {
      mkdirSync(target, { recursive: true })
      continue
    }
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, data)
  }
}

rmSync(temp, { recursive: true, force: true })
rmSync(destination, { recursive: true, force: true })
rmSync(join(fixture, 'dist'), { recursive: true, force: true })
mkdirSync(temp, { recursive: true })

const packOutput = run(process.platform === 'win32' ? 'npm.cmd' : 'npm', [
  'pack',
  '--pack-destination',
  temp,
  '--json',
])
const pack = JSON.parse(packOutput)
const tarballName = pack[0]?.filename
if (!tarballName) throw new Error('npm pack did not produce a tarball')
const tarball = join(temp, tarballName)
extractTarGz(readFileSync(tarball), destination)

if (!existsSync(join(destination, 'dist/index.js'))) {
  throw new Error('packed consumer install is missing dist/index.js')
}

run(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', [
  'exec',
  'vite',
  'build',
  '--config',
  'tests/fixtures/consumer/vite.config.mjs',
])
const builtHtml = readFileSync(join(fixture, 'dist/index.html'), 'utf8')
if (!builtHtml.includes('assets/')) {
  throw new Error('consumer browser build did not emit assets')
}
const assets = readdirSync(join(fixture, 'dist/assets'))
if (!assets.some((file) => file.endsWith('.js'))) {
  throw new Error('consumer browser build did not emit JavaScript')
}

run(process.execPath, ['tests/fixtures/consumer/ssr.mjs'])

console.log('consumer fixture passed (packed tarball, Vite browser build, SSR render)')
