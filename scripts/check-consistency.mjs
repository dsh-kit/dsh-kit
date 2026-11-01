#!/usr/bin/env node
/**
 * Facts repeated across the repository must agree. This is the SSOT guard:
 * package metadata is the source, and the docs are checked against it.
 *
 * @module scripts/check-consistency
 */

import { readFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (path) => readFile(join(root, path), 'utf8')
const problems = []
const need = (file, needle, label) => {
  const text = read(file)
  return text.then((value) => {
    if (!value.includes(needle)) problems.push(`${file}: expected ${label} (${needle})`)
  })
}

const pkg = JSON.parse(await read('package.json'))
const generator = JSON.parse(await read('packages/create-dsh-kit/package.json'))
const template = JSON.parse(await read('packages/create-dsh-kit/template/package.json'))
const changelog = await read('CHANGELOG.md')
const nodeMin = pkg.engines.node.match(/\d+/)?.[0]
const pnpmMajor = pkg.packageManager.split('@')[1].split('.')[0]
const nvm = (await read('.nvmrc')).trim()
const ci = await read('.github/workflows/ci.yml')

if (pkg.version !== generator.version) problems.push('root and generator versions differ')
if (!changelog.includes(`## ${generator.version}`)) problems.push('CHANGELOG has no entry for the current version')
if (pkg.engines.node !== template.engines.node) problems.push('root and template Node engines differ')
if (!nvm) problems.push('.nvmrc is empty')
if (!ci.includes(`[24, ${nvm}]`)) problems.push('CI matrix does not include the .nvmrc Node version')

await Promise.all([
  need('README.md', `Node ${nodeMin}+`, 'Node requirement'),
  need('llms.txt', `Node >=${nodeMin}`, 'Node requirement'),
  need('llms.txt', `pnpm ${pnpmMajor}`, 'pnpm requirement'),
  need('llms.txt', 'github.com/dsh-kit/dsh-kit', 'repository URL'),
  need('README.md', `pnpm ${pnpmMajor}`, 'pnpm requirement'),
  need('README.md', `Node ${nvm} LTS`, 'recommended Node LTS'),
  need('README.md', 'create-dsh-kit', 'package name'),
  need('README.md', 'github.com/dsh-kit/dsh-kit', 'repository URL'),
  need('README.zh.md', 'github.com/dsh-kit/dsh-kit', 'repository URL'),
  need('README.zh.md', pkg.homepage, 'homepage'),
  need('README.md', pkg.homepage, 'homepage'),
  need('packages/create-dsh-kit/README.md', 'create-dsh-kit', 'package name'),
  need('packages/create-dsh-kit/template/README.md', `Node ${nodeMin}+`, 'Node requirement'),
  need('packages/create-dsh-kit/template/README.md', `pnpm ${pnpmMajor}`, 'pnpm requirement'),
  need('docs/guide/quick-start.md', `Node ${nodeMin}+`, 'Node requirement'),
  need('docs/guide/quick-start.md', `pnpm ${pnpmMajor}`, 'pnpm requirement'),
  need('docs/guide/toolchain.md', `Node ${nodeMin}+`, 'Node requirement'),
  need('docs/zh/guide/quick-start.md', `Node ${nodeMin}+`, 'Node requirement'),
  need('docs/zh/guide/quick-start.md', `pnpm ${pnpmMajor}`, 'pnpm requirement'),
  need('docs/zh/guide/toolchain.md', `Node ${nodeMin}+`, 'Node requirement'),
  need('docs/.vitepress/config.mts', 'github.com/dsh-kit/dsh-kit', 'repository URL'),
  need('ROADMAP.md', '# Roadmap', 'roadmap title'),
  need('ROADMAP.zh.md', '# 路线图', 'roadmap title'),
  need('docs/guide/roadmap.md', 'ROADMAP.md', 'canonical roadmap link'),
  need('docs/zh/guide/roadmap.md', 'ROADMAP.zh.md', 'canonical roadmap link')
])

for (const file of ['docs/guide/roadmap.md', 'docs/zh/guide/roadmap.md']) {
  const text = await read(file)
  if (text.split('\n').length > 15) problems.push(`${file}: mirrors the roadmap instead of linking to it`)
}

for (const file of ['README.md', 'README.zh.md', 'docs/guide/why.md', 'docs/zh/guide/why.md']) {
  const text = await read(file)
  if (text.includes('github.com/wilsonwangdev/dsh-quicknote')) {
    problems.push(`${file}: links to a personal plugin repository; use the canonical repository when it exists`)
  }
}

for (const asset of ['docs/public/logo.svg', 'docs/public/logo-dark.svg', 'docs/public/favicon.svg']) {
  if (!(await stat(join(root, asset)).catch(() => null))) problems.push(`missing asset: ${asset}`)
}

if (problems.length > 0) {
  console.error(problems.map((problem) => `- ${problem}`).join('\n'))
  process.exit(1)
}
console.log(`consistency ok: version ${generator.version}, Node ${nodeMin}+, pnpm ${pnpmMajor}, repo metadata aligned`)
