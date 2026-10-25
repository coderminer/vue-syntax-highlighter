import { readFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
const tag = process.env.RELEASE_TAG ?? process.argv[2]
const failures = []

if (!tag) {
  failures.push('a release tag is required: set RELEASE_TAG or pass vX.Y.Z as an argument')
} else if (tag !== `v${pkg.version}`) {
  failures.push(`tag ${tag} does not match package version v${pkg.version}`)
}

const changelog = readFileSync('CHANGELOG.md', 'utf8')
if (!changelog.includes(`## [${pkg.version}]`)) {
  failures.push(`CHANGELOG.md has no section for ${pkg.version}`)
}

if (pkg.private === true) failures.push('package.json must not be private')
if (pkg.publishConfig?.access !== 'public') {
  failures.push('publishConfig.access must be public')
}

if (failures.length > 0) {
  console.error(`release check failed:\n${failures.map((item) => `  ${item}`).join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`release check passed (${pkg.name}@${pkg.version}, ${tag})`)
}
