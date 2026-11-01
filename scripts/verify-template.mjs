#!/usr/bin/env node
/**
 * One command to prove the template still generates a working project.
 *
 *   pnpm verify:template            # generate, install, verify, clean up
 *   pnpm verify:template --keep     # keep the generated directory for inspection
 *
 * @module scripts/verify-template
 */

import { execFile } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const keep = process.argv.includes('--keep')
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const target = await mkdtemp(join(tmpdir(), 'dsh-template-'))

try {
  await run(process.execPath, [
    join(root, 'packages/create-dsh-kit/index.mjs'),
    target,
    '--yes',
    '--name',
    'dsh-template-check',
    '--author',
    'ci'
  ], {
    stdio: 'inherit'
  })
  await run(pnpm, ['install'], { cwd: target, stdio: 'inherit' })
  await run(pnpm, ['verify'], { cwd: target, stdio: 'inherit' })
  console.log(`\ntemplate ok: ${target}`)
} finally {
  if (keep) console.log(`kept: ${target}`)
  else await rm(target, { recursive: true, force: true })
}
