# Toolchain

The template is deliberately small. It uses:

- **TypeScript 7**, checked with `tsc --noEmit`;
- **tsdown** for the ESM host half and the CJS client bundle, wrapped for `window.__ModuleLoader__`;
- **React 19** for the client half, provided by DSH at runtime and never bundled;
- **vitest** with jsdom for the two test suites;
- **oxlint** and **oxfmt** for linting and formatting;
- **pnpm 12**, Node 24+ (npm works as a fallback).

The reasons are practical: one lockfile, fast checks, zero runtime dependencies, and a build a person can read
without a transpiler.

## Native client chunks

`scripts/native-client-build.mjs` owns the native lazy-CJS wrapper. The default `tsdown.config.ts` builds only
`client.js`; no extra chunk is required. To load an optional view on demand, declare it explicitly:

```ts
...nativeClientBuilds({
  id: pkg.name,
  entry: 'src/client/index.tsx',
  chunks: { 'client.details.js': 'src/client/details.tsx' }
})
```

Each entry is a separate, self-contained browser build. The helper registers the package entry with
`{ id, factory }` and sibling chunks with `{ id, chunk, factory }`; source code never implements a loader.
Chunk names follow `client.<name>.js`. `client.js` and the Host-only `client.node.*` names are reserved.

Request an optional sibling from an event handler using DSH's native asynchronous require:

```ts
declare const require: { async(path: string): Promise<unknown> }

export async function openDetails() {
  return require.async('./client.details.js')
}
```

Ordinary internal `import()` expressions stay inside their own bundle; only the explicit native request fetches a
sibling. Specifiers from the DSH web platform table remain exact external requests, including React, ReactDOM,
Cordis and the shared UI/store modules. Other dependencies inline, including non-platform package subpaths such as
`react/jsx-dev-runtime`. Pass additional module requests through the helper's `external` option and the matching
manifest `dsh.client.inject` or `external` declarations; marking an import external does not make it available at runtime.

Another bundler can reuse `nativeClientWrapper({ id, chunk? })` and `DSH_CLIENT_EXTERNALS` from the same helper.
It has no build-tool runtime imports. That caller must also keep each bundle self-contained and manage its own
assets, CSS and output checks. `pnpm verify:template` checks actual compiler output with a lazy sibling and an
internal dynamic import, including factory timing and shared Host modules.

After changing an entry or chunk, rebuild the plugin and restart DSH. This helper does not provide chunk-only HMR.

## Client assets

JavaScript chunks and non-JavaScript assets are separate concerns. `nativeClientBuilds()` emits only
`client*.js`; it never copies a `.wasm`, font, image or JSON file. `scripts/native-client-assets.mjs` copies the
files a chunk loads at runtime into `lib/` and validates both sides of every mapping:

```ts
// scripts/build-assets.mjs
import { nativeClientAssets } from './native-client-assets.mjs'

const assets = nativeClientAssets({
  assets: {
    'pdfium.wasm': 'node_modules/@embedpdf/pdfium/dist/pdfium.wasm',
    'fonts/inter.woff2': 'src/client/assets/inter.woff2'
  }
})

await assets.copy() // check() first, then copy
```

Every output name is relative to `lib/`. Absolute names, `..`, `?`/`#`, JavaScript files and any source or
destination that resolves outside the package root are rejected. Symlinks are re-checked against the real package
root before copying. `check()` validates sources without writing; `copy()` also verifies that each destination
has the same byte count. The returned `entries`/`plan` array is usable from a build script or a bundler hook.

Wire the copy into the build when a package actually has assets:

```json
"scripts": {
  "build": "tsdown && node scripts/build-assets.mjs",
  "prepack": "tsdown && node scripts/build-assets.mjs"
}
```

Copy after `tsdown`, never before: the host build sets `clean: true` and removes `lib/` before emitting. `prepack`
must run the same two steps, otherwise a pack from a dirty tree can omit the assets or ship stale bytes.

`files` must ship the copied bytes. The template publishes `lib/` wholesale, which already covers every asset
below it. If a package narrows that list, it must add each copied path (`lib/pdfium.wasm`, `lib/fonts/`) or the
tarball silently omits it; `npm pack --dry-run` is the check.

**Remaining Host-side requirement:** DSH does not serve arbitrary packaged files. A `/plugins/<package>/...`
request is answered only for an advertised `client*.js` chunk (or its map). The separate package asset route
serves only image media types (`.svg`, `.png`, `.webp`, `.jpg`, `.jpeg`) through the package's `./assets/*`
export, which must map to `./lib/assets/*`. A copied `.wasm` or `.json` is installed and packaged but has no URL
at runtime. Until DSH adds a route for those media types, embed the bytes (for example as a data URL) or serve
them from a plugin-owned Host route; a relative `fetch()` of `lib/<asset>` will not work. This helper therefore
guarantees packaging and path safety, not a browser URL.

## Splitting third-party dynamic imports

An ordinary internal `import()` stays inside its own self-contained chunk, so a heavy vendor import pulled in by
a dependency would defeat lazy loading. `scripts/dynamic-import-chunks.mjs` rewrites selected dynamic imports
into native sibling requests and builds the chunk entry that restores the module promise:

```js
// build script
import { dynamicImportChunks } from './dynamic-import-chunks.mjs'

const lazy = dynamicImportChunks({
  groups: [
    { file: 'client.syntax.js', match: /^shiki\/(?:wasm|dist)\//u, resolveDir: vendorDir },
    { file: 'client.diagram.js', match: '@streamdown/mermaid' }
  ]
})

// esbuild onLoad hook; a Rollup/tsdown transform or load hook calls the same function.
const { code, changed } = await lazy.rewrite(source, { filename })
if (!changed) return
return { contents: code, loader: 'js', resolveDir: dirname(filename) }

// One entry per group that matched at least one import.
for (const { file, contents, resolveDir } of lazy.entries()) {
  await build({
    stdin: { contents, resolveDir, sourcefile: file, loader: 'js' },
    outfile: `lib/${file}`
  })
}
```

`rewrite()` uses the installed es-module-lexer 3 API (`specifier`, `type`, `importStart`, `importEnd`) and also
accepts the older `n`/`d`/`ss`/`se` record shape. Only dynamic imports are matched; static imports and
`import.meta` are untouched. The whole import expression is replaced, including a second options argument, with:

```js
require.async('./client.syntax.js').then((chunk) => chunk.modules['shiki/...'])
```

`entries()` emits `export const modules = { ... }` for every matched specifier, so the promise resolves to the
original module namespace. The helper's `modules` getter exposes the same `specifier -> ./client.<group>.js` map
for bundler configuration. A malformed or incomplete lexer record is skipped, leaving that expression unchanged
instead of corrupting the source.

Group names follow the same `client.<name>.js` contract as `nativeClientBuilds()`. Set `resolveDir` on a group
when the matched specifiers are relative to a vendor directory; it becomes the entry's resolution base.
`entries()` only produces source text and entry config: each chunk still needs to be bundled and registered with
`nativeClientWrapper()` (or a build wrapper of your choice), its specifiers must be inlined into that chunk rather
than marked external, and DSH must advertise the chunk. The helper does not depend on a specific bundler; the
bundler must have a hook that sees the vendor file.

Selection history lives in pull requests and release notes, not on this page. Download numbers and rejected
alternatives age quickly; this page describes what the template uses today.

---

Day-to-day commands are in [AGENTS.md](https://github.com/dsh-kit/dsh-kit/blob/main/AGENTS.md). Start with
[Quick start](/guide/quick-start) if you have not generated a project yet.
