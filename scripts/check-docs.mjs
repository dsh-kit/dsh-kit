#!/usr/bin/env node
/**
 * Copy buttons copy a whole code block. A block that mixes pnpm and npm
 * commands is therefore never copy-paste correct; alternatives belong in a
 * VitePress code group, one block per package manager.
 *
 * @module scripts/check-docs
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'docs')
const problems = []

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '.vitepress', 'dist', 'cache'].includes(entry.name)) continue
    const full = join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
      continue
    }
    if (!entry.name.endsWith('.md')) continue
    const text = await readFile(full, 'utf8')
    const blocks = text.matchAll(/```(?:bash|sh)\n([\s\S]*?)```/g)
    for (const block of blocks) {
      const lines = block[1].split('\n').map((line) => line.trim())
      const hasPnpm = lines.some((line) => line.startsWith('pnpm '))
      const hasNpm = lines.some((line) => line.startsWith('npm '))
      if (hasPnpm && hasNpm) {
        const line = text.slice(0, block.index).split('\n').length
        problems.push(`${relative(process.cwd(), full)}:${line}: one block mixes pnpm and npm; use a code group`)
      }
    }
  }
}

await walk(root)

if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log('docs ok: every copyable block targets one package manager')
