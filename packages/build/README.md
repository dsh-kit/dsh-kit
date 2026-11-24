# @dsh-kit/build

Prototype config-driven Vite build for DSH plugins.

```ts
// dsh.config.ts
import { defineConfig } from '@dsh-kit/build/config'

export default defineConfig({
  host: { entry: 'src/host/index.ts' },
  client: {
    entry: 'src/client/index.tsx',
    chunks: { 'client.workbench.js': 'src/client/workbench.tsx' },
    assets: { 'pdfium.wasm': 'node_modules/@embedpdf/pdfium/dist/pdfium.wasm' }
  }
})
```

`buildDshPlugin()` builds the Host ESM entry and one self-contained CJS client bundle
per declared entry. Every client bundle is wrapped in DSH's
`window.__ModuleLoader__.load({ id, factory })` contract and keeps platform modules
external.

Current prototype scope: explicit `chunks` and assets only. Dynamic-import groups and
CSS-as-text are the next step; see dsh-kit issue #29.
