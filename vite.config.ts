import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

const entries = {
  index: 'src/index.ts',
  'core-entry': 'src/core-entry.ts',
  full: 'src/full.ts',
  'engines/shiki': 'src/engines/shiki.ts',
  'engines/highlightjs': 'src/engines/highlightjs.ts',
  'engines/prism': 'src/engines/prism.ts',
  'engines/lowlight': 'src/engines/lowlight.ts',
  themes: 'src/themes.ts',
  'themes/default': 'src/themes/default.ts',
  'themes/vsh-light': 'src/themes/vsh-light.ts',
  'themes/vsh-dark': 'src/themes/vsh-dark.ts',
  'themes/vsh-paper': 'src/themes/vsh-paper.ts',
  'themes/vsh-midnight': 'src/themes/vsh-midnight.ts',
}

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      outDirs: 'dist',
      insertTypesEntry: false,
      tsconfigPath: './tsconfig.json',
      include: ['src'],
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    sourcemap: true,
    lib: {
      entry: entries,
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'vue',
        /^shiki(\/.*)?$/,
        /^@shikijs\/.*$/,
        /^lowlight(\/.*)?$/,
        /^highlight\.js(\/.*)?$/,
        /^refractor(\/.*)?$/,
      ],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        preserveModules: false,
      },
    },
  },
})
