import assert from 'node:assert/strict'
import { mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import { nativeClientAssets } from '../template/scripts/native-client-assets.mjs'

async function fixture() {
  return mkdtemp(join(tmpdir(), 'dsh-assets-'))
}

test('copies declared non-JS assets into lib and reports the plan', async () => {
  const root = await fixture()
  try {
    const wasm = Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00])
    await writeFile(join(root, 'pdfium.wasm'), wasm)
    await mkdir(join(root, 'vendor'))
    await writeFile(join(root, 'vendor/font.woff2'), 'font-bytes')

    const assets = nativeClientAssets({
      root,
      assets: {
        'pdfium.wasm': 'pdfium.wasm',
        'fonts/font.woff2': './vendor/font.woff2'
      }
    })

    assert.deepEqual(
      assets.entries.map((entry) => entry.name),
      ['pdfium.wasm', 'fonts/font.woff2']
    )
    assert.equal(assets.plan, assets.entries)
    assert.deepEqual(await assets.check(), assets.entries)
    await assets.copy()
    assert.deepEqual(await readFile(join(root, 'lib/pdfium.wasm')), wasm)
    assert.equal(await readFile(join(root, 'lib/fonts/font.woff2'), 'utf8'), 'font-bytes')
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects a missing source before writing anything', async () => {
  const root = await fixture()
  try {
    await writeFile(join(root, 'present.wasm'), 'x')
    const assets = nativeClientAssets({
      root,
      assets: { 'present.wasm': 'present.wasm', 'gone.wasm': 'does-not-exist.wasm' }
    })

    await assert.rejects(assets.check(), /Missing asset source/)
    await assert.rejects(assets.copy(), /Missing asset source/)
    assert.equal(await stat(join(root, 'lib/present.wasm')).catch(() => null), null)
    assert.equal(await stat(join(root, 'lib/gone.wasm')).catch(() => null), null)
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects names and sources that escape the package root', async () => {
  const root = await fixture()
  try {
    await writeFile(join(root, 'inside.wasm'), 'x')
    const outside = join(tmpdir(), 'dsh-assets-outside.wasm')

    assert.throws(
      () => nativeClientAssets({ root, assets: { '../escape.wasm': 'inside.wasm' } }),
      /escapes the output directory/
    )
    assert.throws(
      () => nativeClientAssets({ root, assets: { '/absolute.wasm': 'inside.wasm' } }),
      /package-relative/
    )
    assert.throws(
      () => nativeClientAssets({ root, assets: { 'escape.wasm': '../outside.wasm' } }),
      /source escapes the package root/
    )
    assert.throws(
      () => nativeClientAssets({ root, assets: { 'escape.wasm': outside } }),
      /source escapes the package root/
    )
    assert.throws(
      () => nativeClientAssets({ root, outDir: '../published', assets: { 'ok.wasm': 'inside.wasm' } }),
      /output directory escapes the package root/
    )
    assert.throws(
      () => nativeClientAssets({ root, assets: { 'client.js': 'inside.wasm' } }),
      /must not be JavaScript/
    )
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})

test('rejects symlink sources and output directories that resolve outside the root', async () => {
  const root = await fixture()
  const outside = await fixture()
  try {
    await writeFile(join(outside, 'real.wasm'), 'outside')
    await symlink(join(outside, 'real.wasm'), join(root, 'linked.wasm'))
    const linked = nativeClientAssets({ root, assets: { 'linked.wasm': 'linked.wasm' } })
    await assert.rejects(linked.copy(), /resolves outside the package root/)
    await assert.rejects(linked.check(), /resolves outside the package root/)

    await rm(join(root, 'linked.wasm'))
    await writeFile(join(root, 'inside.wasm'), 'inside')
    await mkdir(join(outside, 'lib'))
    await symlink(join(outside, 'lib'), join(root, 'lib'))
    const redirected = nativeClientAssets({ root, assets: { 'inside.wasm': 'inside.wasm' } })
    await assert.rejects(redirected.copy(), /target resolves outside the package root/)
  } finally {
    await rm(root, { recursive: true, force: true })
    await rm(outside, { recursive: true, force: true })
  }
})
