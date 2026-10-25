import { readFileSync } from 'node:fs'
import { parse } from 'yaml'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const failures = []

function readWorkflow(path) {
  return parse(readFileSync(path, 'utf8'))
}

function validateCommands(workflow, label) {
  const steps = Object.values(workflow?.jobs ?? {}).flatMap((job) => job?.steps ?? [])
  for (const step of steps) {
    if (typeof step.uses === 'string' && !/^[\w.-]+\/[\w.-]+@v\d+$/.test(step.uses)) {
      failures.push(`${label}: unpinned or malformed action ${step.uses}`)
    }
    if (typeof step.run !== 'string') continue
    for (const command of step.run.split('\n').map((line) => line.trim()).filter(Boolean)) {
      if (command.startsWith('npm ')) continue
      if (!command.startsWith('pnpm ')) {
        failures.push(`${label}: unexpected workflow command ${command}`)
        continue
      }
      const parts = command.split(/\s+/)
      if (parts[1] === 'exec' || parts[1] === 'install') continue
      if (!pkg.scripts?.[parts[1]]) {
        failures.push(`${label}: workflow command pnpm ${parts[1]} has no package script`)
      }
    }
  }
  return steps
}

const ci = readWorkflow('.github/workflows/ci.yml')
if (!ci?.on) failures.push('CI workflow has no trigger')
const matrix = ci?.jobs?.verify?.strategy?.matrix?.node
if (!Array.isArray(matrix) || !matrix.includes(20) || !matrix.includes(22)) {
  failures.push('CI must run on Node 20 and Node 22')
}
const ciSteps = validateCommands(ci, 'ci.yml')

const docs = readWorkflow('.github/workflows/docs.yml')
if (!docs?.on) failures.push('docs workflow has no trigger')
if (docs?.permissions?.pages !== 'write' || docs?.permissions?.['id-token'] !== 'write') {
  failures.push('docs workflow must grant pages:write and id-token:write')
}
if (!docs?.jobs?.build || !docs?.jobs?.deploy) {
  failures.push('docs workflow must have build and deploy jobs')
}
if (!docs?.jobs?.build?.env?.DOCS_BASE) {
  failures.push('docs workflow must set DOCS_BASE for GitHub Pages subpaths')
}
const docsSteps = validateCommands(docs, 'docs.yml')
const docsActions = docsSteps.map((step) => step.uses).filter(Boolean)
for (const action of [
  'actions/configure-pages@v4',
  'actions/upload-pages-artifact@v3',
  'actions/deploy-pages@v4',
]) {
  if (!docsActions.includes(action)) failures.push(`docs workflow is missing ${action}`)
}

const release = readWorkflow('.github/workflows/release.yml')
if (!release?.on) failures.push('release workflow has no trigger')
const releaseTags = release?.on?.push?.tags
if (!Array.isArray(releaseTags) || !releaseTags.includes('v*')) {
  failures.push('release workflow must run on v* tags')
}
if (release?.permissions?.['id-token'] !== 'write') {
  failures.push('release workflow must grant id-token:write for provenance')
}
const releaseSteps = validateCommands(release, 'release.yml')
const releaseCommands = releaseSteps.map((step) => step.run).filter(Boolean).join('\n')
if (!releaseCommands.includes('pnpm check:release')) {
  failures.push('release workflow must verify the tag with pnpm check:release')
}
if (!releaseCommands.includes('npm publish') || !releaseCommands.includes('--provenance')) {
  failures.push('release workflow must publish with npm publish --provenance')
}

if (failures.length > 0) {
  console.error(`workflow check failed:\n${failures.map((item) => `  ${item}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(
    `workflow check passed (${ciSteps.length} CI steps, ${docsSteps.length} docs steps, ${releaseSteps.length} release steps, Node ${matrix.join('/')})`,
  )
}
