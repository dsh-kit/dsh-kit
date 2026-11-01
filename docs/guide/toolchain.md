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

Selection history lives in pull requests and release notes, not on this page. Download numbers and rejected
alternatives age quickly; this page describes what the template uses today.

---

Day-to-day commands are in [AGENTS.md](https://github.com/dsh-kit/dsh-kit/blob/main/AGENTS.md). Start with
[Quick start](/guide/quick-start) if you have not generated a project yet.
