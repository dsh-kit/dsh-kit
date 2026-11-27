/**
 * Native client build helpers copied from the dsh-kit template.
 * No build-tool runtime is imported, so another bundler can reuse the wrapper.
 *
 * @module scripts/native-client-build
 */

/**
 * Shell-owned modules must remain requests to DSH's native module table.
 * Source: deepseek-harness/packages/client/web/src/platform.ts and seed.ts.
 */
export const DSH_CLIENT_EXTERNALS = Object.freeze([
  "react",
  "react-dom",
  "react-dom/client",
  "react/jsx-runtime",
  "@deepseek-ai/cordis",
  "zod",
  "@tanstack/react-virtual",
  "@deepseek-ai/dsh-client-store",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-primitives",
  "@deepseek-ai/dsh-client-ui-dockkit",
]);

/** Published package-local chunk names accepted by the native DSH route. */
const CLIENT_CHUNK = /^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$/;

/**
 * Validate one package-local sibling chunk name.
 * @param {string} chunk
 * @returns {string} the same chunk name
 */
export function clientChunkName(chunk) {
  if (
    typeof chunk !== "string" ||
    !CLIENT_CHUNK.test(chunk) ||
    chunk === "client.node.js" ||
    chunk.startsWith("client.node.")
  ) {
    throw new Error(`Invalid native client chunk name: ${String(chunk)}`);
  }
  return chunk;
}

/**
 * Register a lazy CJS factory; its body runs only when DSH materializes it.
 * @param {{ id: string, chunk?: string }} options
 * @returns {{ banner: string, footer: string }}
 */
export function nativeClientWrapper({ id, chunk }) {
  if (typeof id !== "string" || id.length === 0) throw new Error("A client package id is required");
  if (chunk !== undefined) clientChunkName(chunk);
  const chunkField = chunk === undefined ? "" : `, chunk: ${JSON.stringify(chunk)}`;
  return {
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(id)}${chunkField}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;`,
    footer: "return module.exports; } });",
  };
}

/**
 * Build every explicitly named client entry separately, without shared CJS chunks.
 * Request sibling chunks from client source with native `require.async()`.
 * @param {{ id: string, entry: string, chunks?: Record<string, string>, outDir?: string, external?: string[] }} options
 * @returns {import('tsdown').UserConfig[]}
 */
export function nativeClientBuilds({ id, entry, chunks = {}, outDir = "lib", external = [] }) {
  const requested = new Set([...DSH_CLIENT_EXTERNALS, ...external]);
  for (const chunk of Object.keys(chunks)) nativeClientWrapper({ id, chunk });
  return [["client.js", entry], ...Object.entries(chunks)].map(([fileName, source]) => {
    const { banner, footer } = nativeClientWrapper({
      id,
      ...(fileName === "client.js" ? {} : { chunk: fileName }),
    });
    if (typeof source !== "string" || source.length === 0)
      throw new Error("A client entry source is required");
    return {
      entry: { [fileName.slice(0, -3)]: source },
      outDir,
      format: "cjs",
      platform: "browser",
      target: "es2022",
      // CJS defaults to Node in tsdown; the native factory still runs in a browser.
      inputOptions: { platform: "browser" },
      define: { "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV ?? "production") },
      deps: {
        neverBundle: (specifier) => requested.has(specifier),
        alwaysBundle: (specifier) => !requested.has(specifier),
      },
      dts: false,
      clean: false,
      outputOptions: { entryFileNames: fileName, banner, footer, codeSplitting: false },
      plugins: [
        {
          name: "dsh-self-contained-client",
          generateBundle(_options, bundle) {
            const scripts = Object.values(bundle).filter((output) => output.type === "chunk");
            if (scripts.length !== 1 || scripts[0].fileName !== fileName) {
              throw new Error(
                "Native client bundles must be self-contained; declare sibling chunks and use require.async()",
              );
            }
          },
        },
      ],
    };
  });
}
