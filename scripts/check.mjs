#!/usr/bin/env node
/**
 * One entry point for the repository checks. Keeping the list here makes the
 * check surface readable, ordered and easy to extend; individual scripts stay
 * independent and runnable on their own.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const node = process.execPath

const checks = [
  ['generator tests', pnpm, ['test']],
  ['release preflight', pnpm, ['preflight']],
  ['CJK line breaks', node, ['scripts/check-cjk-linebreaks.mjs']],
  ['docs copy rules', node, ['scripts/check-docs.mjs']],
  ['repository consistency', node, ['scripts/check-consistency.mjs']],
  ['internal links', node, ['scripts/check-links.mjs']]
]

let failed = 0
for (const [label, command, args] of checks) {
  console.log(`\n▶ ${label}`)
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env })
  if (result.error !== undefined) {
    console.error(`${label}: ${result.error.message}`)
    failed += 1
    break
  }
  if (result.status !== 0) {
    console.error(`\n${label} failed`)
    failed += 1
    break
  }
}

if (failed > 0) process.exit(1)
console.log('\nall checks passed')
