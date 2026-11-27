import assert from 'node:assert/strict'
import { test } from 'node:test'
import { runInNewContext } from 'node:vm'

import {
  DSH_CLIENT_EXTERNALS,
  nativeClientBuilds,
  nativeClientWrapper
} from '../template/scripts/native-client-build.mjs'

test('registers lazy entry and sibling factories without executing their bodies', async () => {
  const registrations = []
  const effects = []
  const sandbox = {
    window: { __ModuleLoader__: { load: (registration) => registrations.push(registration) } },
    effects
  }
  const entry = nativeClientWrapper({ id: '@example/plugin' })
  const chunk = nativeClientWrapper({ id: '@example/plugin', chunk: 'client.details.js' })

  runInNewContext(`${entry.banner}\neffects.push('entry'); exports.open = () => require.async('./client.details.js');\n${entry.footer}`, sandbox)
  runInNewContext(`${chunk.banner}\neffects.push('details'); exports.answer = 42;\n${chunk.footer}`, sandbox)

  assert.equal(registrations.length, 2)
  assert.equal(registrations[0].id, '@example/plugin')
  assert.equal(registrations[0].chunk, undefined)
  assert.equal(registrations[1].id, '@example/plugin')
  assert.equal(registrations[1].chunk, 'client.details.js')
  assert.deepEqual(effects, [])

  const requests = []
  const nativeRequire = Object.assign(() => { throw new Error('unexpected synchronous request') }, {
    async: async (specifier) => {
      requests.push(specifier)
      return registrations[1].factory(nativeRequire)
    }
  })
  const plugin = registrations[0].factory(nativeRequire)
  assert.deepEqual(effects, ['entry'])
  const details = await plugin.open()
  assert.equal(details.answer, 42)
  assert.deepEqual(requests, ['./client.details.js'])
  assert.deepEqual(effects, ['entry', 'details'])
})

test('builds each requested browser entry separately with shared host modules external', () => {
  const builds = nativeClientBuilds({
    id: '@example/plugin',
    entry: 'src/client/index.tsx',
    chunks: { 'client.details.js': 'src/client/details.tsx' }
  })
  assert.equal(builds.length, 2)
  for (const build of builds) {
    assert.equal(Object.keys(build.entry).length, 1)
    assert.equal(build.format, 'cjs')
    assert.equal(build.platform, 'browser')
    assert.equal(build.clean, false)
    for (const specifier of ['react', 'react-dom', '@deepseek-ai/cordis', '@deepseek-ai/dsh-client-store', '@deepseek-ai/dsh-client-ui-slots', 'zod']) {
      assert.equal(build.deps.neverBundle(specifier), true)
      assert.equal(build.deps.alwaysBundle(specifier), false)
    }
    assert.equal(build.deps.neverBundle('react/jsx-dev-runtime'), false)
    assert.equal(build.deps.alwaysBundle('react/jsx-dev-runtime'), true)
    assert.equal(build.deps.alwaysBundle('non-shared-dependency'), true)
  }
  assert.equal(builds[0].outputOptions.entryFileNames, 'client.js')
  assert.equal(builds[1].outputOptions.entryFileNames, 'client.details.js')
  assert.equal(nativeClientBuilds({ id: 'simple', entry: 'src/client/index.tsx' }).length, 1)
  assert.ok(Object.isFrozen(DSH_CLIENT_EXTERNALS))
  const [custom] = nativeClientBuilds({ id: 'consumer', entry: 'index.ts', external: ['@example/service/client'] })
  assert.equal(custom.deps.neverBundle('@example/service/client'), true)
  assert.equal(custom.deps.alwaysBundle('@example/service/client'), false)
})

test('rejects chunk names outside the native package-local chunk contract', () => {
  for (const chunk of ['client.js', '../client.details.js', 'details.js', 'client.details.css', 'client.node.js', 'client.node.details.js']) {
    assert.throws(() => nativeClientWrapper({ id: 'plugin', chunk }), /chunk/i)
    assert.throws(() => nativeClientBuilds({ id: 'plugin', entry: 'index.ts', chunks: { [chunk]: 'details.ts' } }), /chunk/i)
  }
  assert.throws(() => nativeClientBuilds({ id: 'plugin', entry: 'index.ts', chunks: { 'client.js': 'index.ts' } }), /chunk/i)
})
