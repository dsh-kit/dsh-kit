#!/usr/bin/env node
/**
 * Internal links must resolve. External URLs are out of scope; the public site
 * and GitHub links are checked manually before a release.
 *
 * @module scripts/check-links
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, extname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const problems = []

const isFile = async (path) => {
  const info = await stat(path).catch(() => null)
  return Boolean(info?.isFile())
}

async function resolveTarget(source, target) {
  const clean = target.split('#')[0].split('?')[0]
  if (!clean || /^(https?:|mailto:|tel:)/.test(clean)) return true
  if (clean.startsWith('/')) {
    const base = join(root, 'docs', clean)
    return (
      (await isFile(base)) ||
      (await isFile(`${base}.md`)) ||
      (await isFile(join(base, 'index.md'))) ||
      (await isFile(join(root, 'docs', 'public', clean)))
    )
  }
  const base = resolve(dirname(source), clean)
  return (
    (await isFile(base)) ||
    (await isFile(`${base}.md`)) ||
    (await isFile(join(base, 'index.md')))
  )
}

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'cache'].includes(entry.name)) continue
    const full = join(directory, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
      continue
    }
    if (!entry.name.endsWith('.md')) continue
    const text = await readFile(full, 'utf8')
    for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].trim()
      if (target.startsWith('<') && target.endsWith('>')) continue
      if (!(await resolveTarget(full, target))) {
        problems.push(`${relative(root, full)}: broken link ${target}`)
      }
    }
  }
}

await walk(root)

if (problems.length > 0) {
  console.error(problems.join('\n'))
  process.exit(1)
}
console.log('links ok: every internal markdown link resolves')
