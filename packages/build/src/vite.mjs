/**
 * Vite plugin: emits one self-contained lazy-CJS client bundle for DSH.
 *
 * This is the low-level seam. It intentionally rejects extra chunks/assets so a
 * plugin author cannot accidentally ship an artifact DSH cannot load.
 */
import { readFileSync } from 'node:fs'
import { basename, dirname, join, relative } from 'node:path'
import { DSH_CLIENT_EXTERNALS } from './wrapper.mjs'

const MAP = /\.map$/u

function readExports(projectRoot) {
  try {
    const pkg = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf8'))
    return pkg
  } catch {
    return undefined
  }
}

function externalJudge(original, platform) {
  return (source) => platform.includes(source) || (typeof original === 'function' ? original(source) === true : Array.isArray(original) ? original.includes(source) : original === source)
}

export function dshClientPlugin({ entry, id, fileName, platformModules = [] } = {}) {
  const platform = [...DSH_CLIENT_EXTERNALS, ...platformModules]
  let projectRoot = process.cwd()
  let resolvedId = id
  let outputFile = fileName

  return {
    name: 'dsh-kit:client',
    enforce: 'pre',
    config(config) {
      projectRoot = typeof config.root === 'string' ? config.root : process.cwd()
      const pkg = readExports(projectRoot)
      resolvedId ??= pkg?.name
      const declared = pkg?.exports?.['./client']
      const target = typeof declared === 'string' ? declared : declared?.import ?? declared?.default
      if (typeof target === 'string' && outputFile === undefined) {
        outputFile = basename(target)
        config.build ??= {}
        config.build.outDir ??= relative(projectRoot, dirname(join(projectRoot, target))) || '.'
      }
      const build = (config.build ??= {})
      build.emptyOutDir = false
      build.sourcemap = false
      build.cssCodeSplit = false
      build.lib ??= { entry, formats: ['cjs'], fileName: () => 'client.cjs' }
      const rollup = (build.rollupOptions ??= {})
      rollup.external = externalJudge(rollup.external, platform)
      rollup.output = {
        ...(rollup.output ?? {}),
        format: 'cjs',
        inlineDynamicImports: true,
        entryFileNames: outputFile ?? 'client.js',
      }
    },
    generateBundle(_options, bundle) {
      const items = Object.values(bundle)
      const chunks = items.filter((item) => item.type === 'chunk')
      const assets = items.filter((item) => item.type === 'asset')
      const foreign = assets.filter((item) => !MAP.test(item.fileName))
      if (foreign.length > 0) this.error(`dsh-kit: standalone client assets are not supported yet: ${foreign.map((item) => item.fileName).join(', ')}`)
      if (chunks.length !== 1) this.error(`dsh-kit: expected one client chunk, got ${chunks.length}`)
      const chunk = chunks[0]
      if (chunk === undefined) return
      if (resolvedId === undefined) this.error('dsh-kit: pass an id or provide package.json name')
      outputFile ??= 'client.js'
      chunk.code = wrapAsModuleLoader(chunk.code, resolvedId, { ...(outputFile === 'client.js' ? {} : { chunk: outputFile }) })
      chunk.map = null
    },
  }
}

function wrapAsModuleLoader(code, id, options) {
  const chunkField = options.chunk === undefined ? '' : `, chunk: ${JSON.stringify(options.chunk)}`
  return `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}${chunkField}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;\n${code}\nreturn module.exports; } });`
}
