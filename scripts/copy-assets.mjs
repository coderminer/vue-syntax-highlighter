import { copyFileSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const dist = join(root, 'dist')
mkdirSync(dist, { recursive: true })

const source = join(root, 'src/styles/base.css')
const target = join(dist, 'styles.css')
const fallbackSource = join(root, 'src/styles/fallback.css')
const fallbackDir = join(dist, 'styles')
const fallbackTarget = join(fallbackDir, 'fallback.css')
mkdirSync(fallbackDir, { recursive: true })
copyFileSync(fallbackSource, fallbackTarget)

const readable = readFileSync(source, 'utf8')
const minified = readable
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/\s+/g, ' ')
  .replace(/\s*([{};,>])\s*/g, '$1')
  .replace(/:\s+/g, ':')
  .trim()
writeFileSync(target, `${minified}\n`, 'utf8')

const bytes = statSync(target).size
console.log(`copied styles.css (${bytes} bytes) and styles/fallback.css`)
