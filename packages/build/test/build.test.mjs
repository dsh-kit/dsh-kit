import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { buildDshPlugin } from '../src/build.mjs'

const fixture = new URL('./fixture', import.meta.url).pathname

test('builds host ESM and a wrapped lazy-CJS client', async () => {
  await rm(join(fixture, 'lib'), { recursive: true, force: true })
  await buildDshPlugin({
    root: fixture,
    host: { entry: 'src/host/index.ts' },
    client: { entry: 'src/client/index.ts' },
  })
  const host = await readFile(join(fixture, 'lib/index.js'), 'utf8')
  assert.match(host, /export/)
  const client = await readFile(join(fixture, 'lib/client.js'), 'utf8')
  assert.match(client, /window\.__ModuleLoader__\.load/)
  assert.match(client, /"@example\/dsh-fixture"/)

  const registrations = []
  const sandbox = { window: { __ModuleLoader__: { load: (registration) => registrations.push(registration) } } }
  runInNewContext(client, sandbox)
  assert.equal(registrations.length, 1)
  const module = registrations[0].factory((specifier) => {
    throw new Error(`unexpected require: ${specifier}`)
  })
  assert.equal(module.answer, 42)
  assert.equal(module.identity, 'fixture')
})

test('keeps platform modules external', async () => {
  await rm(join(fixture, 'lib'), { recursive: true, force: true })
  await buildDshPlugin({
    root: fixture,
    host: false,
    client: { entry: 'src/client/index.ts' },
  })
  const client = await readFile(join(fixture, 'lib/client.js'), 'utf8')
  assert.doesNotMatch(client, /require\("react"\)/)
})

test('builds every explicit sibling chunk with its own loader registration', async () => {
  await rm(join(fixture, 'lib'), { recursive: true, force: true })
  await buildDshPlugin({
    root: fixture,
    host: false,
    client: {
      entry: 'src/client/index.ts',
      chunks: { 'client.extra.js': 'src/client/extra.ts' },
    },
  })
  for (const file of ['client.js', 'client.extra.js']) {
    const code = await readFile(join(fixture, 'lib', file), 'utf8')
    assert.match(code, /window\.__ModuleLoader__\.load/)
  }
  const extra = await readFile(join(fixture, 'lib/client.extra.js'), 'utf8')
  assert.match(extra, /chunk: "client\.extra\.js"/)
})
