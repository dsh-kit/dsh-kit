/**
 * Split selected third-party dynamic imports into explicit native client chunks.
 *
 * A native client bundle is self-contained, so a `import()` of a heavy vendor
 * module would stay in the current chunk. This helper rewrites only the
 * selected dynamic imports into `require.async()` requests and builds the
 * matching chunk entries, whose `modules` map restores the original promise
 * shape.
 *
 * es-module-lexer 3 reports `type`, `specifier`, `importStart` and `importEnd`.
 * The older v1 shape (`d`, `n`, `ss`, `se`) is still accepted, and a malformed
 * record is skipped rather than corrupting the source.
 *
 * @module scripts/dynamic-import-chunks
 */

import { clientChunkName } from "./native-client-build.mjs";
import { init, parse as parseImports } from "es-module-lexer";

/**
 * Turn a user-supplied matcher into `(specifier) => boolean`.
 * @param {RegExp | string | readonly (RegExp | string)[] | ((specifier: string) => boolean)} match
 * @returns {(specifier: string) => boolean}
 */
function matcher(match) {
  if (typeof match === "function") return (specifier) => Boolean(match(specifier));
  if (typeof match === "string") return (specifier) => specifier === match;
  if (match instanceof RegExp) {
    return (specifier) => {
      // Reset state so a /g or /y matcher behaves the same on every import.
      match.lastIndex = 0;
      return match.test(specifier);
    };
  }
  if (Array.isArray(match)) {
    const matchers = match.map(matcher);
    return (specifier) => matchers.some((test) => test(specifier));
  }
  throw new Error("A dynamic import group needs a match string, RegExp, array or predicate");
}

/**
 * Tell whether one lexer record is a dynamic import across lexer versions.
 * @param {Record<string, unknown>} item
 * @returns {boolean}
 */
function isDynamicImport(item) {
  if (item === null || typeof item !== "object") return false;
  if (item.type === "dynamic") return true;
  // es-module-lexer v1: `d` is the `(` of a dynamic import and -1 otherwise.
  return typeof item.d === "number" && item.d >= 0;
}

/**
 * Resolve the module specifier across lexer versions.
 * @param {Record<string, unknown>} item
 * @returns {string | undefined}
 */
function specifierOf(item) {
  if (typeof item.specifier === "string") return item.specifier;
  if (typeof item.n === "string") return item.n;
  return undefined;
}

/**
 * Find the closing `)` of a dynamic import call.
 * @param {string} source
 * @param {number} open index of the opening `(`
 * @returns {number | undefined} index just after the closing `)`
 */
function callEnd(source, open) {
  let depth = 0;
  let quote;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  for (let index = open; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote !== undefined) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = undefined;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth += 1;
    else if (char === ")") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return undefined;
}

/**
 * Tell whether a source range contains only whitespace and comments.
 * @param {string} source
 * @param {number} start
 * @param {number} end
 * @returns {boolean}
 */
function hasOnlyTrivia(source, start, end) {
  for (let index = start; index < end; index += 1) {
    const char = source[index];
    if (/\s/u.test(char)) continue;
    if (char === "/" && source[index + 1] === "/") {
      const newline = source.indexOf("\n", index);
      if (newline < 0 || newline >= end) return false;
      index = newline;
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      const close = source.indexOf("*/", index + 2);
      if (close < 0 || close + 2 > end) return false;
      index = close + 1;
      continue;
    }
    return false;
  }
  return true;
}

/**
 * Find the `import` keyword that owns a legacy `d` offset.
 * @param {string} source
 * @param {number} open index of the opening `(`
 * @returns {number | undefined}
 */
function importKeyword(source, open) {
  let start = source.lastIndexOf("import", open);
  while (start >= 0) {
    const before = source[start - 1];
    if (
      (before === undefined || !/[A-Za-z0-9_$]/u.test(before)) &&
      hasOnlyTrivia(source, start + 6, open)
    ) {
      return start;
    }
    start = source.lastIndexOf("import", start - 1);
  }
  return undefined;
}

/**
 * Resolve the span of the entire import expression.
 * @param {string} source
 * @param {Record<string, unknown>} item
 * @returns {{ start: number, end: number } | undefined}
 */
function importSpan(source, item) {
  if (
    Number.isInteger(item.importStart) &&
    Number.isInteger(item.importEnd) &&
    item.importStart >= 0 &&
    item.importEnd > item.importStart &&
    item.importEnd <= source.length
  ) {
    return { start: item.importStart, end: item.importEnd };
  }
  // Older lexers only report the specifier or the `(`, so recover the full
  // expression instead of replacing part of an `import(...)` call.
  if (typeof item.d !== "number" || item.d < 0 || item.d >= source.length) return undefined;
  if (source[item.d] !== "(") return undefined;
  const start = importKeyword(source, item.d);
  if (start === undefined) return undefined;
  const end = callEnd(source, item.d);
  if (end === undefined) return undefined;
  return { start, end };
}

/**
 * Build a reusable dynamic-import splitter.
 *
 * `rewrite()` is async because es-module-lexer may need one initialisation
 * pass. Call it from a bundler's load/transform hook, then use `entries()` to
 * build one chunk per group that matched at least one import. `modules` maps
 * each rewritten specifier to its chunk request for bundler configuration.
 *
 * @param {{
 *   groups: ReadonlyArray<{
 *     file: string,
 *     match: RegExp | string | readonly (RegExp | string)[] | ((specifier: string) => boolean),
 *     resolveDir?: string
 *   }>,
 *   parse?: (source: string, name?: string) => ReadonlyArray<Record<string, unknown>>
 * }} options
 * @returns {{
 *   rewrite: (source: string, options?: { filename?: string }) => Promise<{ code: string, changed: boolean, matches: number }>,
 *   entries: () => ReadonlyArray<{ file: string, contents: string, resolveDir?: string }>,
 *   readonly modules: Readonly<Record<string, string>>
 * }}
 */
export function dynamicImportChunks({ groups, parse } = {}) {
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error("At least one dynamic import group is required");
  }
  const states = groups.map((group) => {
    if (group === null || typeof group !== "object") {
      throw new Error("A dynamic import group must be an object");
    }
    return {
      file: clientChunkName(group.file),
      match: matcher(group.match),
      resolveDir: group.resolveDir,
      imports: new Set(),
    };
  });
  const lexer = typeof parse === "function" ? parse : parseImports;
  let ready;

  /**
   * Load the default lexer once; an injected parser owns its own setup.
   * @returns {Promise<void>}
   */
  async function prepare() {
    if (typeof parse === "function") return;
    ready ??= Promise.resolve(typeof init === "function" ? init() : init).then(() => undefined);
    await ready;
  }

  /**
   * Rewrite selected dynamic imports in one module source.
   * @param {string} source
   * @param {{ filename?: string }} [options]
   * @returns {Promise<{ code: string, changed: boolean, matches: number }>}
   */
  async function rewrite(source, { filename } = {}) {
    if (typeof source !== "string") throw new Error("Dynamic import source must be a string");
    await prepare();
    const parsed = lexer(source, filename);
    if (!Array.isArray(parsed)) throw new Error("The lexer did not return an import array");
    // es-module-lexer returns [imports, exports, ...]; an injected test parser
    // may return the imports array directly.
    const records = Array.isArray(parsed[0]) ? parsed[0] : parsed;
    const replacements = [];
    for (const item of records) {
      if (!isDynamicImport(item)) continue;
      const specifier = specifierOf(item);
      if (specifier === undefined) continue;
      const state = states.find((candidate) => candidate.match(specifier));
      if (state === undefined) continue;
      const span = importSpan(source, item);
      if (span === undefined) continue;
      state.imports.add(specifier);
      replacements.push({ ...span, specifier, file: state.file });
    }
    replacements.sort((left, right) => right.start - left.start);
    let code = source;
    for (const replacement of replacements) {
      const request = `require.async(${JSON.stringify(`./${replacement.file}`)})`;
      const mapLookup = `chunk.modules[${JSON.stringify(replacement.specifier)}]`;
      code =
        code.slice(0, replacement.start) +
        `${request}.then((chunk) => ${mapLookup})` +
        code.slice(replacement.end);
    }
    return Object.freeze({ code, changed: code !== source, matches: replacements.length });
  }

  /**
   * Build one bundle entry per group that matched at least one import.
   * @returns {ReadonlyArray<{ file: string, contents: string, resolveDir?: string }>}
   */
  function entries() {
    return Object.freeze(
      states
        .filter((state) => state.imports.size > 0)
        .map((state) => {
          const specifiers = [...state.imports].sort();
          const imports = specifiers.map(
            (specifier, index) => `import * as m${index} from ${JSON.stringify(specifier)};`,
          );
          const map = specifiers.map(
            (specifier, index) => `${JSON.stringify(specifier)}: m${index}`,
          );
          return Object.freeze({
            file: state.file,
            contents: `${imports.join("\n")}\nexport const modules = {${map.join(", ")}};\n`,
            ...(state.resolveDir === undefined ? {} : { resolveDir: state.resolveDir }),
          });
        }),
    );
  }

  return Object.freeze({
    rewrite,
    entries,
    get modules() {
      return Object.freeze(
        Object.fromEntries(
          states.flatMap((state) =>
            [...state.imports].map((specifier) => [specifier, `./${state.file}`]),
          ),
        ),
      );
    },
  });
}
