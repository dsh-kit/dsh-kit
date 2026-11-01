import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, basename } from 'node:path'
import { test } from 'node:test'
import { promisify } from 'node:util'

const run = promisify(execFile)
const root = new URL('..', import.meta.url).pathname

async function generate(args) {
  return run(process.execPath, [join(root, 'index.mjs'), ...args])
}

test('generates a project with the package name and no placeholders', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'dsh-generator-'))
  const dir = join(parent, 'dsh-test-plugin')
  try {
    const { stdout } = await generate([dir, '--yes', '--author', 'tester'])
    assert.match(stdout, /created dsh-test-plugin/)
    const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8'))
    assert.equal(pkg.name, 'dsh-test-plugin')
    assert.equal(pkg.author, 'tester')
    const constants = await readFile(join(dir, 'src/shared/constants.ts'), 'utf8')
    assert.match(constants, /NAME = "dsh-test-plugin"/)
    const patch = await readFile(join(dir, 'cordis.patch.yml'), 'utf8')
    assert.match(patch, /name: dsh-test-plugin/)
    assert.ok(await readFile(join(dir, '.gitignore'), 'utf8'))
    assert.ok(await readFile(join(dir, 'PUBLISHING.md'), 'utf8'))
    async function assertNoPlaceholders(directory) {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue
        const full = join(directory, entry.name)
        if (entry.isDirectory()) {
          await assertNoPlaceholders(full)
          continue
        }
        if (!/\.(tsx?|mjs|json|ya?ml|md|txt|svg)$/.test(entry.name)) continue
        const text = await readFile(full, 'utf8')
        assert.doesNotMatch(text, /__[A-Z_]+__/, `${full} still contains a placeholder`)
      }
    }
    await assertNoPlaceholders(dir)
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})

test('refuses a non-empty directory without --force', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'dsh-generator-'))
  const dir = join(parent, 'occupied')
  try {
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, 'keep.txt'), 'x')
    await assert.rejects(generate([dir, '--yes']), (error) => {
      assert.equal(error.code, 1)
      assert.match(error.stderr, /not empty/)
      return true
    })
    assert.equal(basename(dir), 'occupied')
  } finally {
    await rm(parent, { recursive: true, force: true })
  }
})
