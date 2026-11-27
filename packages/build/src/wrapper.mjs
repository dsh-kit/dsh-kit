/** DSH web platform modules; the shell provides these to every client factory. */
export const DSH_CLIENT_EXTERNALS = Object.freeze([
  'react',
  'react-dom',
  'react-dom/client',
  'react/jsx-runtime',
  '@deepseek-ai/cordis',
  'zod',
  '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit'
])

/** Wrap one CJS bundle into the native lazy-CJS registration. */
export function wrapAsModuleLoader(code, id, { chunk } = {}) {
  const chunkField = chunk === undefined ? '' : `, chunk: ${JSON.stringify(chunk)}`
  return `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}${chunkField}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;\n${code}\nreturn module.exports; } });`
}
