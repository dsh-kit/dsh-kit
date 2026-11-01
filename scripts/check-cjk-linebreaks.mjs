#!/usr/bin/env node
/**
 * CJK paragraphs must not be hard-wrapped between two Chinese characters:
 * a Markdown soft line break renders as a space, which is wrong between CJK
 * glyphs. oxfmt does not reflow Markdown prose, so this check owns the rule.
 */
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const docs = join(root, 'docs')
const fix = process.argv.includes('--fix')
const pattern = /([\p{Script=Han}，。；：！？、）》」』】])\n(?=[\p{Script=Han}（《「『【])/gu

async function markdownFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'cache') continue
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)))
    else if (entry.name.endsWith('.md')) files.push(path)
  }
  return files
}

function splitCode(text) {
  return text.split(/(```[\s\S]*?```)/g)
}

let failed = false
for (const file of await markdownFiles(docs)) {
  const original = await readFile(file, 'utf8')
  const parts = splitCode(original)
  let changed = false
  const next = parts.map((part) => {
    if (part.startsWith('```')) return part
    const replaced = part.replace(pattern, '$1')
    if (replaced !== part) changed = true
    return replaced
  }).join('')
  if (!changed) continue
  const name = relative(root, file)
  if (fix) {
    await writeFile(file, next)
    console.log(`fixed ${name}`)
  } else {
    console.error(`${name}: CJK text is hard-wrapped across a soft line break`)
    failed = true
  }
}
if (failed) {
  console.error('Run `node scripts/check-cjk-linebreaks.mjs --fix` to join these lines.')
  process.exit(1)
}
console.log('cjk ok: no CJK soft line breaks')
