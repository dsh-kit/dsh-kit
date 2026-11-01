#!/usr/bin/env node
/**
 * Generate a DSH plugin from `template/`.
 *
 * Interactive on a TTY (Enter accepts every default); fully non-interactive
 * with flags or `--yes`, so an agent never hangs on a prompt.
 *
 *   npm create dsh-kit@latest my-plugin
 *   npx create-dsh-kit@latest my-plugin --author you --yes
 *
 * @module scripts/new
 */

import { execFile } from 'node:child_process'
import { cp, mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, join, resolve } from 'node:path'
import { stdin, stdout } from 'node:process'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const here = dirname(fileURLToPath(import.meta.url))
const template = join(here, 'template')
const pkg = JSON.parse(await readFile(join(here, 'package.json'), 'utf8'))
const run = promisify(execFile)

function parseArgs(argv) {
  const values = {}
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      values[key] = true
    } else {
      values[key] = next
      i += 1
    }
  }
  return values
}

function usage() {
  console.log(`create-dsh-kit ${pkg.version}

Usage:
  create-dsh-kit <dir> [options]
  npm create dsh-kit@latest <dir>

Options:
  --name <pkg>        npm package name (default: directory name)
  --author <handle>   copyright holder (default: git user.name)
  --title-en <text>   English title
  --title-zh <text>   Chinese title
  --desc-en <text>    English description
  --desc-zh <text>    Chinese description
  --plugin-id <id>    cordis patch row id (default: package name)
  --yes               accept every default without prompting
  --force             generate into a non-empty directory
  -h, --help          show this help
  -v, --version       print the version`)
}

const argv = process.argv.slice(2)
if (argv.includes('-h') || argv.includes('--help')) {
  usage()
  process.exit(0)
}
if (argv.includes('-v') || argv.includes('--version')) {
  console.log(pkg.version)
  process.exit(0)
}

const args = parseArgs(argv)
const positional = argv.find((arg) => !arg.startsWith('--') && arg !== 'new')
const interactive = Boolean(stdin.isTTY && stdout.isTTY) && !args.yes

let targetArg = args.dir ?? positional
if (targetArg === undefined) {
  if (!interactive) {
    usage()
    process.exit(1)
  }
  targetArg = 'dsh-plugin'
}

const rl = interactive ? createInterface({ input: stdin, output: stdout }) : null
const ask = async (label, fallback) => {
  if (!rl) return fallback
  const answer = (await rl.question(`${label} (${fallback}) `)).trim()
  return answer || fallback
}

if (interactive && args.dir === undefined && positional === undefined) {
  targetArg = await ask('Project directory', targetArg)
}

const target = resolve(String(targetArg))
let name = String(args.name ?? basename(target))

async function gitName() {
  try {
    const { stdout: value } = await run('git', ['config', '--get', 'user.name'])
    return value.trim() || 'your-github-handle'
  } catch {
    return 'your-github-handle'
  }
}

const author = String(args.author ?? (await gitName()))

if (interactive && args.name === undefined) {
  name = await ask('Package name', name)
}

const defaults = {
  titleEn: String(args['title-en'] ?? name),
  titleZh: String(args['title-zh'] ?? args['title-en'] ?? name),
  descEn: String(args['desc-en'] ?? 'A DeepSeek Harness plugin.'),
  descZh: String(args['desc-zh'] ?? args['desc-en'] ?? '一个 DeepSeek Harness 插件。'),
  author
}

if (interactive) {
  if (args['title-en'] === undefined) defaults.titleEn = await ask('Title (English)', defaults.titleEn)
  if (args['desc-en'] === undefined) defaults.descEn = await ask('Description (English)', defaults.descEn)
  if (args.author === undefined) defaults.author = await ask('Author (GitHub handle)', defaults.author)
  if (args['title-zh'] === undefined) defaults.titleZh = defaults.titleEn
  if (args['desc-zh'] === undefined) defaults.descZh = defaults.descEn
  rl?.close()
}

if (!/^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*$/.test(name)) {
  console.error(`invalid package name: ${name}\nuse lowercase letters, digits, "-", "_" or "."`)
  process.exit(1)
}

const resolvedTemplate = resolve(template)
if (target === resolvedTemplate || target === resolve(here)) {
  console.error('refusing to generate over the create-dsh-kit repository itself')
  process.exit(1)
}

const targetExists = await stat(target).catch(() => null)
if (targetExists) {
  if (!targetExists.isDirectory()) {
    console.error(`target exists and is not a directory: ${target}`)
    process.exit(1)
  }
  const entries = await readdir(target)
  if (entries.length > 0 && !args.force) {
    console.error(`target directory is not empty: ${target}\npass --force to generate anyway`)
    process.exit(1)
  }
}

const replacements = {
  __PKG__: name,
  __PLUGIN_ID__: String(args['plugin-id'] ?? name.replace(/^@[^/]+\//, '')),
  __TITLE_ZH__: defaults.titleZh,
  __TITLE_EN__: defaults.titleEn,
  __DESC_ZH__: defaults.descZh,
  __DESC_EN__: defaults.descEn,
  __AUTHOR__: defaults.author
}

await mkdir(target, { recursive: true })
await cp(template, target, { recursive: true })

async function rewrite(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'lib' || entry.name === '.git') continue
      await rewrite(full)
      continue
    }
    if (!/\.(tsx?|mjs|json|ya?ml|md|txt|svg)$/.test(entry.name) && entry.name !== 'LICENSE') continue
    let text = await readFile(full, 'utf8')
    for (const [key, value] of Object.entries(replacements)) text = text.split(key).join(value)
    await writeFile(full, text)
  }
}

await rewrite(target)

// npm never packs a `.gitignore`; the template ships it as `gitignore` and the
// generated project gets the real name back.
const plainIgnore = join(target, 'gitignore')
try {
  await rename(plainIgnore, join(target, '.gitignore'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

console.log(`\ncreated ${name} in ${target}\n`)
console.log(`next steps:
  cd ${target}
  pnpm install
  pnpm verify
  dsh plugin --profile web add link:$PWD
  # desktop app: install through its plugin page; the desktop profile is app-managed

npm fallback: npm install && npm run verify
`)
