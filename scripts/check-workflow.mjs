import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

const workflow = parse(readFileSync('.github/workflows/ci.yml', 'utf8'))
const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const failures = []

if (!workflow?.jobs || Object.keys(workflow.jobs).length === 0) {
  failures.push('workflow has no jobs')
}
if (!workflow?.on) failures.push('workflow has no trigger')

const matrix = workflow?.jobs?.verify?.strategy?.matrix?.node
if (!Array.isArray(matrix) || !matrix.includes(20) || !matrix.includes(22)) {
  failures.push('CI must run on Node 20 and Node 22')
}

const steps = workflow?.jobs?.verify?.steps ?? []
for (const step of steps) {
  if (typeof step.uses === 'string' && !/^[\w.-]+\/[\w.-]+@v\d+$/.test(step.uses)) {
    failures.push(`unpinned or malformed action ${step.uses}`)
  }
  if (typeof step.run !== 'string') continue
  for (const command of step.run.split('\n').map((line) => line.trim()).filter(Boolean)) {
    if (!command.startsWith('pnpm ')) {
      failures.push(`unexpected non-pnpm workflow command: ${command}`)
      continue
    }
    const parts = command.split(/\s+/)
    if (parts[1] === 'exec') continue
    if (parts[1] === 'install') continue
    if (!pkg.scripts?.[parts[1]]) {
      failures.push(`workflow command pnpm ${parts[1]} has no package script`)
    }
  }
}

if (failures.length > 0) {
  console.error(`workflow check failed:\n${failures.map((item) => `  ${item}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`workflow check passed (${steps.length} steps, Node ${matrix.join('/')})`)
}
