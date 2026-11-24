/** Config-driven Host + Client build; one self-contained Vite build per client entry. */
import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { build } from 'vite'
import { dshClientPlugin } from './vite.mjs'

export async function buildDshPlugin(config) {
  const root = resolve(config.root ?? process.cwd())
  const outDir = config.outDir ?? 'lib'
  const pkg = JSON.parse(await (await import('node:fs/promises')).readFile(join(root, 'package.json'), 'utf8'))
  const target = join(root, outDir)
  await mkdir(target, { recursive: true })

  if (config.host !== false) {
    await build({
      root, configFile: false, logLevel: 'warn',
      build: {
        ssr: config.host?.entry ?? 'src/host/index.ts', outDir, emptyOutDir: false, minify: false, sourcemap: false,
        rollupOptions: { external: [/^@deepseek-ai\//u, /^node:/u], output: { format: 'esm', entryFileNames: 'index.js' } },
      },
    })
  }

  if (config.client !== false) {
    const client = config.client ?? {}
    const entries = { 'client.js': client.entry ?? 'src/client/index.tsx', ...(client.chunks ?? {}) }
    for (const [file, entry] of Object.entries(entries)) {
      await build({
        root, configFile: false, logLevel: 'warn',
        build: {
          outDir, minify: true, sourcemap: false, cssCodeSplit: false, emptyOutDir: false,
          lib: { entry, formats: ['cjs'], fileName: () => 'client.cjs' },
          rollupOptions: { output: { inlineDynamicImports: true } },
        },
        plugins: [dshClientPlugin({ id: pkg.name, entry, fileName: file })],
      })
    }
  }

  for (const [name, source] of Object.entries(config.assets ?? {})) {
    await cp(join(root, source), join(target, name))
  }
  return { root, outDir, packageName: pkg.name }
}
