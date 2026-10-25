<script setup lang="ts">
import { computed, ref } from 'vue'
import { SyntaxHighlighter } from 'vue-syntax-highlighter'
import { vshDark } from 'vue-syntax-highlighter/themes/vsh-dark'
import { vshLight } from 'vue-syntax-highlighter/themes/vsh-light'
import { vshMidnight } from 'vue-syntax-highlighter/themes/vsh-midnight'
import { vshPaper } from 'vue-syntax-highlighter/themes/vsh-paper'
import type { ColorScheme, ThemeDefinition } from 'vue-syntax-highlighter'

const engines = [
  { id: 'shiki', label: 'Shiki (default)' },
  { id: 'highlightjs', label: 'highlight.js / lowlight' },
  { id: 'lowlight', label: 'lowlight entry' },
  { id: 'prism', label: 'Prism / refractor' },
] as const

const languages = [
  'javascript',
  'typescript',
  'python',
  'go',
  'rust',
  'vue',
  'html',
  'css',
  'json',
  'yaml',
  'markdown',
  'bash',
  'sql',
] as const

const themePairs: Record<string, { label: string; light: ThemeDefinition; dark: ThemeDefinition }> = {
  github: { label: 'vsh light / dark', light: vshLight, dark: vshDark },
  paper: { label: 'vsh paper / midnight', light: vshPaper, dark: vshMidnight },
}

const engine = ref<(typeof engines)[number]['id']>('shiki')
const language = ref<(typeof languages)[number]>('javascript')
const pairId = ref<keyof typeof themePairs>('github')
const colorScheme = ref<ColorScheme>('auto')
const lineNumbers = ref(true)
const wrap = ref(false)
const defer = ref(false)
const code = ref(`import { computed, ref } from 'vue'

export function useCounter(start = 0) {
  const count = ref(start)
  const doubled = computed(() => count.value * 2)

  function increment(step = 1) {
    count.value += step
  }

  return { count, doubled, increment }
}`)

const selectedPair = computed(() => themePairs[pairId.value] ?? themePairs.github!)

const highlighter = ref<{
  copy: () => Promise<boolean>
  refresh: () => Promise<unknown>
} | null>(null)
const status = ref('')

async function copy(): Promise<void> {
  const ok = await highlighter.value?.copy()
  status.value = ok
    ? 'Copied the complete source without gutter numbers.'
    : 'Clipboard is unavailable in this browser context.'
}

async function refresh(): Promise<void> {
  await highlighter.value?.refresh()
  status.value = 'Highlight refreshed.'
}
</script>

<template>
  <section class="vsh-demo" data-testid="live-demo">
    <div class="vsh-demo__controls">
      <label>
        Engine
        <select v-model="engine" data-testid="engine">
          <option v-for="item in engines" :key="item.id" :value="item.id">{{ item.label }}</option>
        </select>
      </label>
      <label>
        Language
        <select v-model="language" data-testid="language">
          <option v-for="item in languages" :key="item" :value="item">{{ item }}</option>
        </select>
      </label>
      <label>
        Theme pair
        <select v-model="pairId" data-testid="theme">
          <option v-for="(item, id) in themePairs" :key="id" :value="id">{{ item.label }}</option>
        </select>
      </label>
      <label>
        Color scheme
        <select v-model="colorScheme" data-testid="scheme">
          <option value="auto">auto</option>
          <option value="light">light</option>
          <option value="dark">dark</option>
        </select>
      </label>
      <label>
        <span>Line numbers</span>
        <input v-model="lineNumbers" type="checkbox" data-testid="line-numbers" />
      </label>
      <label>
        <span>Wrap</span>
        <input v-model="wrap" type="checkbox" data-testid="wrap" />
      </label>
      <label>
        <span>Defer</span>
        <input v-model="defer" type="checkbox" data-testid="defer" />
      </label>
      <button type="button" data-testid="copy" @click="copy">Copy source</button>
      <button type="button" data-testid="refresh" @click="refresh">Refresh</button>
    </div>

    <label>
      Source
      <textarea v-model="code" data-testid="source" spellcheck="false" />
    </label>

    <p class="vsh-demo__status" data-testid="status">{{ status }}</p>

    <SyntaxHighlighter
      ref="highlighter"
      class="vsh-demo__code"
      data-testid="highlighted"
      :code="code"
      :language="language"
      :engine="engine"
      :themes="selectedPair"
      :color-scheme="colorScheme"
      :line-numbers="lineNumbers"
      :wrap="wrap"
      :defer="defer"
      aria-label="Live highlighted code example"
    />
  </section>
</template>
