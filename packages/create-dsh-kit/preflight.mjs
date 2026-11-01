#!/usr/bin/env node
/**
 * Release preflight: fail before a tarball or tag exposes something that should
 * not be public.
 *
 * @module scripts/preflight
 */

import { readdir, readFile, stat } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url))
const repoRoot = join(root, '..', '..')
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const problems = []

if (pkg.name !== 'create-dsh-kit') problems.push(`unexpected package name: ${pkg.name}`)
if (pkg.license !== 'MIT') problems.push('license must be MIT')
if (!pkg.author?.includes('dsh-kit')) problems.push('package author must be dsh-kit contributors')

const license = await readFile(join(repoRoot, 'LICENSE'), 'utf8')
if (!license.includes('dsh-kit contributors')) problems.push('LICENSE must name dsh-kit contributors')
if (!(await stat(join(root, 'LICENSE')).catch(() => null))) problems.push('the package needs its own LICENSE')
if (!pkg.repository?.url?.includes('dsh-kit')) problems.push('repository must point at the dsh-kit org')

const forbiddenFiles = ['.env', '.env.local', 'id_rsa', 'id_ed25519']
const forbiddenPatterns = [
  /\/Users\//,
  /C:\\\\Users\\\\/,
  /BEGIN (RSA|OPENSSH|EC) PRIVATE KEY/,
  /Copyright \(c\) 2026 (?!dsh-kit contributors)/
]

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist', 'cache'].includes(entry.name)) continue
    const full = join(directory, entry.name)
    const rel = relative(repoRoot, full)
    if (entry.isDirectory()) {
      if (rel === 'research') problems.push('research/ must not ship in the public repository')
      await walk(full)
      continue
    }
    if (rel === 'packages/create-dsh-kit/preflight.mjs') continue
    if (forbiddenFiles.includes(entry.name)) problems.push(`forbidden file: ${rel}`)
    if (!/\.(md|json|ya?ml|ts|mjs|js|css|html|txt)$/.test(entry.name)) continue
    const text = await readFile(full, 'utf8')
    for (const pattern of forbiddenPatterns) {
      if (pattern.test(text)) problems.push(`suspicious content in ${rel}: ${pattern}`)
    }
  }
}

await walk(repoRoot)

const template = JSON.parse(await readFile(join(root, 'template/package.json'), 'utf8'))
if (!template.name?.includes('__PKG__')) problems.push('template/package.json lost its __PKG__ placeholder')
if (await stat(join(repoRoot, 'ROADMAP.md')).catch(() => null) === null) problems.push('ROADMAP.md is missing')

if (problems.length > 0) {
  console.error(problems.map((problem) => `- ${problem}`).join('\n'))
  process.exit(1)
}

console.log('preflight ok: package identity, template placeholders, no private paths or keys')
console.log(`
Before the first public release:
  1. repository is private; history is a single squashed commit
  2. gitleaks detect --source . --verbose   (and the secret-scan workflow is green)
  3. npm pack --dry-run                      (inspect every file)
  4. the maintainer has reviewed the diff and the site
  5. tag v${pkg.version} matches package.json
`)
