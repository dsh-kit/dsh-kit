import assert from 'node:assert/strict'
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { runInNewContext } from 'node:vm'

// Run against the generated project's own installed compiler and copied helper.
const target = process.argv[2]
const projectRequire = createRequire(join(target, 'package.json'))
const { build } = await import(pathToFileURL(projectRequire.resolve('tsdown')).href)
const { nativeClientBuilds } = await import(pathToFileURL(join(target, 'scripts/native-client-build.mjs')).href)
const sharedModules = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis',
  'zod', '@tanstack/react-virtual', '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-primitives', '@deepseek-ai/dsh-client-ui-dockkit'
]
const fixture = join(target, '.native-build-check')
await mkdir(fixture, { recursive: true })
await writeFile(join(fixture, 'shared.ts'), 'export const label = (name: string) => `shared:${name}`;\n')
await writeFile(join(fixture, 'deferred.ts'), 'export const value = "deferred";\n')
await writeFile(join(fixture, 'details.ts'), `import { label } from './shared.ts';
globalThis.effects.push('details');
export const value = label('details');
`)
await writeFile(join(fixture, 'entry.ts'), `${sharedModules.map((specifier, index) => `import { sharedValue as shared${index} } from ${JSON.stringify(specifier)};`).join('\n')}
import { jsxDEV } from 'react/jsx-dev-runtime';
import { privateValue } from 'dsh-kit-build-fixture';
import { label } from './shared.ts';
globalThis.effects.push('entry');
export const shared = [${sharedModules.map((_, index) => `shared${index}`).join(', ')}];
export const developmentRuntimeType = typeof jsxDEV;
export { privateValue };
export const value = label('entry');
export const deferred = () => import('./deferred.ts');
export const open = () => require.async('./client.details.js');
`)

// A production dependency must inline rather than becoming an unknown native request.
const dependency = join(target, 'node_modules/dsh-kit-build-fixture')
await mkdir(dependency, { recursive: true })
await writeFile(join(dependency, 'package.json'), JSON.stringify({ name: 'dsh-kit-build-fixture', version: '1.0.0', type: 'module', main: './index.js' }))
await writeFile(join(dependency, 'index.js'), 'export const privateValue = "bundled-private";\n')
const manifest = JSON.parse(await readFile(join(target, 'package.json'), 'utf8'))
manifest.dependencies = { ...manifest.dependencies, 'dsh-kit-build-fixture': '1.0.0' }
await writeFile(join(target, 'package.json'), JSON.stringify(manifest))

process.chdir(target)
const configs = nativeClientBuilds({
  id: 'dsh-template-check',
  entry: join(fixture, 'entry.ts'),
  chunks: { 'client.details.js': join(fixture, 'details.ts') },
  outDir: join(fixture, 'lib')
})
for (const config of configs) await build({ ...config, config: false, cwd: target })

const output = join(fixture, 'lib')
assert.deepEqual((await readdir(output)).sort(), ['client.details.js', 'client.js'])
const registrations = []
const effects = []
const sandbox = { window: { __ModuleLoader__: { load: (registration) => registrations.push(registration) } }, effects }
for (const fileName of ['client.js', 'client.details.js']) {
  const code = await readFile(join(output, fileName), 'utf8')
  assert.doesNotMatch(code, /\brequire\(["']\.\/client[^"']*\.js["']\)/u)
  runInNewContext(code, sandbox)
}
assert.deepEqual(effects, [])
assert.equal(registrations[0].id, 'dsh-template-check')
assert.equal(registrations[1].id, 'dsh-template-check')
assert.equal(registrations[1].chunk, 'client.details.js')

const seed = Object.fromEntries(sharedModules.map((specifier) => [specifier, { sharedValue: {} }]))
Object.assign(seed.react, projectRequire('react'))
const requests = []
const nativeRequire = Object.assign((specifier) => {
  requests.push(specifier)
  assert.ok(Object.hasOwn(seed, specifier), `Unexpected native request: ${specifier}`)
  return seed[specifier]
}, {
  async: async (specifier) => {
    assert.equal(specifier, './client.details.js')
    return registrations[1].factory(nativeRequire)
  }
})
const plugin = registrations[0].factory(nativeRequire)
assert.equal(plugin.value, 'shared:entry')
for (const [index, specifier] of sharedModules.entries()) {
  assert.equal(plugin.shared[index], seed[specifier].sharedValue)
}
assert.deepEqual(new Set(requests), new Set(sharedModules))
assert.equal(plugin.developmentRuntimeType, (process.env.NODE_ENV ?? 'production') === 'production' ? 'undefined' : 'function')
assert.equal(plugin.privateValue, 'bundled-private')
assert.equal((await plugin.deferred()).value, 'deferred')
assert.deepEqual(effects, ['entry'])
assert.equal((await plugin.open()).value, 'shared:details')
assert.deepEqual(effects, ['entry', 'details'])
console.log('native client build ok: self-contained entry/chunk, host sharing, lazy factories and require.async')
