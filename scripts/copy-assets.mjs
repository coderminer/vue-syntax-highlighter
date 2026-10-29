import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildBaseStyles, buildCompleteStyles } from './css.mjs'

const root = process.cwd()
const dist = join(root, 'dist')
mkdirSync(dist, { recursive: true })

const source = join(root, 'src/styles/base.css')
const target = join(dist, 'styles.css')
const fallbackSource = join(root, 'src/styles/fallback.css')
const fallbackDir = join(dist, 'styles')
const fallbackTarget = join(fallbackDir, 'fallback.css')
const completeTarget = join(fallbackDir, 'complete.css')
mkdirSync(fallbackDir, { recursive: true })
copyFileSync(fallbackSource, fallbackTarget)

const base = readFileSync(source, 'utf8')
const fallback = readFileSync(fallbackSource, 'utf8')
writeFileSync(target, buildBaseStyles(base), 'utf8')
writeFileSync(completeTarget, buildCompleteStyles(base, fallback), 'utf8')

const bytes = statSync(target).size
const completeBytes = statSync(completeTarget).size
console.log(
  `copied styles.css (${bytes} bytes), styles/fallback.css, and styles/complete.css (${completeBytes} bytes)`,
)
