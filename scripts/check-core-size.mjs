import { gzipSync } from 'node:zlib'
import { build, transformWithEsbuild } from 'vite'

const LIMIT = 13_000

const result = await build({
  configFile: false,
  logLevel: 'silent',
  build: {
    write: false,
    target: 'es2020',
    minify: 'esbuild',
    lib: {
      entry: 'dist/core-entry.js',
      formats: ['es'],
      fileName: 'core',
    },
    rollupOptions: {
      external: ['vue'],
    },
  },
})

const outputs = (Array.isArray(result) ? result : [result]).flatMap(
  (item) => item.output ?? [],
)
const code = outputs
  .filter((item) => item.type === 'chunk')
  .map((item) => item.code)
  .join('\n')
// Vite's library build keeps whitespace for ES output. Apply the same esbuild
// minification users get from an application build before measuring.
const minified = await transformWithEsbuild(code, 'core.js', {
  minify: true,
  format: 'esm',
  target: 'es2020',
})
const bytes = gzipSync(Buffer.from(minified.code)).length

if (bytes > LIMIT) {
  console.error(
    `core entry size check failed: ${(bytes / 1000).toFixed(2)} kB gzipped exceeds ${(LIMIT / 1000).toFixed(0)} kB`,
  )
  process.exitCode = 1
} else {
  console.log(
    `core entry size check passed (${(bytes / 1000).toFixed(2)} kB gzipped, limit ${(LIMIT / 1000).toFixed(0)} kB)`,
  )
}
