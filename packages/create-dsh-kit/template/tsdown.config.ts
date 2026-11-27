/**
 * Library build for both halves.
 *
 * The template helper registers native lazy factories and can also build
 * explicitly named package-local chunks. Keep wrappers out of client source.
 *
 * @module tsdown.config
 */
import pkg from './package.json' with { type: 'json' }
import { nativeClientBuilds } from './scripts/native-client-build.mjs'

export default [
  {
    entry: { index: 'src/host/index.ts' },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    dts: false,
    clean: true,
    outputOptions: { entryFileNames: 'index.js' }
  },
  ...nativeClientBuilds({ id: pkg.name, entry: 'src/client/index.tsx' })
]
