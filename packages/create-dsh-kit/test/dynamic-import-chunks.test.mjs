import assert from 'node:assert/strict'
import { test } from 'node:test'

import { dynamicImportChunks } from '../template/scripts/dynamic-import-chunks.mjs'

test('rewrites only the selected dynamic imports', async () => {
  const chunks = dynamicImportChunks({
    groups: [{ file: 'client.vendor.js', match: /^\.\/vendor\//u }]
  })
  const source = `import "./vendor/static.js";
export const load = () => import("./vendor/heavy.js");
`
  const result = await chunks.rewrite(source)

  assert.equal(result.changed, true)
  assert.equal(result.matches, 1)
  assert.match(result.code, /^import "\.\/vendor\/static\.js";/u)
  assert.doesNotMatch(result.code, /import\("\.\/vendor\/heavy\.js"\)/u)
  assert.match(
    result.code,
    /require\.async\("\.\/client\.vendor\.js"\)\.then\(\(chunk\) => chunk\.modules\["\.\/vendor\/heavy\.js"\]\)/u
  )
})

test('replaces the full dynamic import expression, including options', async () => {
  const chunks = dynamicImportChunks({
    groups: [{ file: 'client.heavy.js', match: './heavy.js' }]
  })
  const source = `export const load = () => import(
  "./heavy.js",
  { with: { type: "json" } },
);
`
  const result = await chunks.rewrite(source)

  assert.equal(result.matches, 1)
  assert.doesNotMatch(result.code, /import\(/u)
  assert.equal(
    result.code,
    `export const load = () => require.async("./client.heavy.js").then((chunk) => chunk.modules["./heavy.js"]);\n`
  )
})

test('builds one entry exporting a modules map for every matched group', async () => {
  const chunks = dynamicImportChunks({
    groups: [
      { file: 'client.heavy.js', match: ['./heavy.js', './high.js'], resolveDir: '/tmp/client' },
      { file: 'client.unused.js', match: './unused.js' }
    ]
  })
  await chunks.rewrite(`export const a = () => import("./heavy.js");\nexport const b = () => import("./high.js");\n`)

  assert.deepEqual(chunks.modules, {
    './heavy.js': './client.heavy.js',
    './high.js': './client.heavy.js'
  })
  const entries = chunks.entries()
  assert.equal(entries.length, 1)
  assert.equal(entries[0].file, 'client.heavy.js')
  assert.equal(entries[0].resolveDir, '/tmp/client')
  assert.match(entries[0].contents, /import \* as m0 from "\.\/heavy\.js";/u)
  assert.match(entries[0].contents, /import \* as m1 from "\.\/high\.js";/u)
  assert.match(entries[0].contents, /export const modules = \{"\.\/heavy\.js": m0, "\.\/high\.js": m1\};/u)
})

test('leaves source unchanged when no dynamic import matches', async () => {
  const chunks = dynamicImportChunks({
    groups: [{ file: 'client.vendor.js', match: /^\.\/vendor\//u }]
  })
  const source = `import "./vendor/static.js";\nexport const load = () => import("./other.js");\n`
  const result = await chunks.rewrite(source)

  assert.equal(result.changed, false)
  assert.equal(result.matches, 0)
  assert.equal(result.code, source)
  assert.deepEqual(chunks.modules, {})
  assert.deepEqual(chunks.entries(), [])
})

test('falls back to the older d/n/ss/se lexer shape', async () => {
  const source = `export const load = () => import /* split */ ('./legacy.js');\n`
  const open = source.indexOf('(', source.indexOf('import'))
  const specifier = "'./legacy.js'"
  const specifierStart = source.indexOf(specifier) + 1
  const chunks = dynamicImportChunks({
    groups: [{ file: 'client.legacy.js', match: './legacy.js' }],
    parse: () => [
      {
        d: open,
        n: './legacy.js',
        ss: specifierStart,
        se: specifierStart + './legacy.js'.length
      }
    ]
  })
  const result = await chunks.rewrite(source)

  assert.equal(result.changed, true)
  assert.equal(result.matches, 1)
  assert.doesNotMatch(result.code, /import/u)
  assert.match(
    result.code,
    /require\.async\("\.\/client\.legacy\.js"\)\.then\(\(chunk\) => chunk\.modules\["\.\/legacy\.js"\]\)/u
  )

  // The specifier span (ss/se) is not required once `d` locates the call.
  const withoutSpecifierSpan = dynamicImportChunks({
    groups: [{ file: 'client.legacy.js', match: './legacy.js' }],
    parse: () => [{ d: open, n: './legacy.js' }]
  })
  assert.equal((await withoutSpecifierSpan.rewrite(source)).changed, true)
})

test('skips malformed lexer records instead of corrupting the source', async () => {
  const source = `export const load = () => import("./broken.js");\n`
  const shapes = [
    [{ type: 'dynamic' }],
    [{ type: 'dynamic', specifier: './broken.js' }],
    [{ type: 'dynamic', specifier: './broken.js', importStart: 400, importEnd: 420 }],
    [{ type: 'dynamic', specifier: './broken.js', importStart: -1, importEnd: 3 }]
  ]
  for (const imports of shapes) {
    const chunks = dynamicImportChunks({
      groups: [{ file: 'client.broken.js', match: './broken.js' }],
      parse: () => imports
    })
    const result = await chunks.rewrite(source)
    assert.equal(result.changed, false)
    assert.equal(result.code, source)
    assert.deepEqual(chunks.entries(), [])
  }
})

test('validates group chunk names and matchers', () => {
  assert.throws(() => dynamicImportChunks({ groups: [] }), /At least one dynamic import group/u)
  assert.throws(
    () => dynamicImportChunks({ groups: [{ file: 'vendor.js', match: './x.js' }] }),
    /chunk name/u
  )
  assert.throws(
    () => dynamicImportChunks({ groups: [{ file: 'client.vendor.js', match: 42 }] }),
    /match string/u
  )
})
