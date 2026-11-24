/**
 * Copy non-JavaScript client assets into the published `lib/` directory.
 *
 * Client chunks and assets are separate outputs: `native-client-build.mjs`
 * builds JavaScript, while this helper copies bytes such as `.wasm`, `.json`
 * or fonts that a chunk loads at runtime. Every source and destination is
 * verified to stay inside the package root.
 *
 * @module scripts/native-client-assets
 */

import { cp, lstat, mkdir, realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";

/** JavaScript is built as a chunk, never copied as an asset. */
const SCRIPT_ASSET = /\.(?:cjs|mjs|js)$/iu;

/** Path characters that would be reinterpreted by a URL or the shell. */
function unsafeName(name) {
  return (
    ["?", "#", "\\\\"].some((char) => name.includes(char)) ||
    [...name].some((char) => char.charCodeAt(0) < 0x20)
  );
}

/**
 * Tell whether `child` is `parent` or lives below it.
 * @param {string} parent
 * @param {string} child
 * @returns {boolean}
 */
function isInside(parent, child) {
  const path = relative(parent, child);
  return path === "" || (!isAbsolute(path) && path !== ".." && !path.startsWith(`..${sep}`));
}

/**
 * Reject one output-relative asset name before it touches the filesystem.
 * @param {string} name
 * @returns {string} the same name
 */
function assetName(name) {
  if (typeof name !== "string" || name.length === 0) {
    throw new Error("An asset output name is required");
  }
  if (name.startsWith("/") || /^[A-Za-z]:/u.test(name) || unsafeName(name)) {
    throw new Error(`Asset output name must be a plain package-relative path: ${name}`);
  }
  if (name.split("/").some((segment) => segment === "" || segment === "." || segment === "..")) {
    throw new Error(`Asset output name escapes the output directory: ${name}`);
  }
  if (SCRIPT_ASSET.test(name)) {
    throw new Error(`Asset output must not be JavaScript; declare a chunk instead: ${name}`);
  }
  return name;
}

/**
 * Build a validated copy plan for declared non-JavaScript assets.
 *
 * The returned `entries` array is the plan, and `copy()` executes it after
 * checking every source still exists and resolves inside the package root.
 * A build script can also call `check()` alone to fail early.
 *
 * @param {{
 *   assets?: Record<string, string>,
 *   root?: string,
 *   outDir?: string
 * }} options
 * @returns {{
 *   entries: ReadonlyArray<{ name: string, source: string, target: string }>,
 *   plan: ReadonlyArray<{ name: string, source: string, target: string }>,
 *   check: () => Promise<ReadonlyArray<{ name: string, source: string, target: string }>>,
 *   copy: () => Promise<ReadonlyArray<{ name: string, source: string, target: string }>>
 * }}
 */
export function nativeClientAssets({ assets = {}, root = process.cwd(), outDir = "lib" } = {}) {
  if (assets === null || typeof assets !== "object" || Array.isArray(assets)) {
    throw new Error("Assets must be a record of output name to source path");
  }
  if (typeof root !== "string" || root.length === 0) throw new Error("A package root is required");
  if (typeof outDir !== "string" || outDir.length === 0) {
    throw new Error("An asset output directory is required");
  }

  const packageRoot = resolve(root);
  const outputRoot = resolve(packageRoot, outDir);
  if (!isInside(packageRoot, outputRoot)) {
    throw new Error(`Asset output directory escapes the package root: ${outDir}`);
  }

  const entries = Object.entries(assets).map(([name, source]) => {
    const outputName = assetName(name);
    if (typeof source !== "string" || source.length === 0) {
      throw new Error(`An asset source is required for ${outputName}`);
    }
    const sourcePath = resolve(packageRoot, source);
    if (!isInside(packageRoot, sourcePath)) {
      throw new Error(`Asset source escapes the package root: ${source}`);
    }
    const target = resolve(outputRoot, outputName);
    if (!isInside(outputRoot, target)) {
      throw new Error(`Asset target escapes the output directory: ${outputName}`);
    }
    return Object.freeze({ name: outputName, source: sourcePath, target });
  });
  const plan = Object.freeze(entries);

  /**
   * Validate every declared source against the real package root.
   * @returns {Promise<typeof plan>}
   */
  async function check() {
    let realRoot;
    try {
      realRoot = await realpath(packageRoot);
    } catch {
      throw new Error(`Package root does not exist: ${packageRoot}`);
    }
    for (const entry of plan) {
      let realSource;
      try {
        realSource = await realpath(entry.source);
      } catch (error) {
        if (error?.code === "ENOENT")
          throw new Error(`Missing asset source for ${entry.name}: ${entry.source}`);
        throw error;
      }
      if (!isInside(realRoot, realSource)) {
        throw new Error(`Asset source resolves outside the package root: ${entry.name}`);
      }
      const info = await stat(realSource);
      if (!info.isFile()) throw new Error(`Asset source is not a file: ${entry.name}`);
    }
    return plan;
  }

  /**
   * Copy every declared asset and verify each destination byte count.
   * @returns {Promise<typeof plan>}
   */
  async function copy() {
    await check();
    const realRoot = await realpath(packageRoot);
    for (const entry of plan) {
      await mkdir(dirname(entry.target), { recursive: true });
      const realTargetDirectory = await realpath(dirname(entry.target));
      if (!isInside(realRoot, realTargetDirectory)) {
        throw new Error(`Asset target resolves outside the package root: ${entry.name}`);
      }
      const existing = await lstat(entry.target).catch(() => undefined);
      if (existing?.isSymbolicLink()) {
        throw new Error(`Asset target is a symbolic link: ${entry.name}`);
      }
      await cp(entry.source, entry.target);
      const [from, to] = await Promise.all([stat(entry.source), stat(entry.target)]);
      if (from.size !== to.size) {
        throw new Error(`Asset copy size mismatch for ${entry.name}: ${from.size} != ${to.size}`);
      }
    }
    return plan;
  }

  return Object.freeze({ entries: plan, plan, check, copy });
}
