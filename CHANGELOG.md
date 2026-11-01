# Changelog

## 0.1.1 — 2026-11-01

First release through npm Trusted Publishing, with provenance.

- No generator behavior changes
- Published from the protected `release.yml` workflow

## 0.1.0 — 2026-11-01

First public version of the generator.

- `npm create dsh-kit@latest my-plugin` / `npx create-dsh-kit@latest`
- Template: TypeScript 7 + React 19 (TSX), tsdown, vitest, oxlint, oxfmt
- Node 24+ and pnpm 12 (npm fallback)
- `pnpm verify`: format, lint, typecheck, tests, build, pack, manifest check
- Host and client test suites with a shared jsdom harness
- AGENTS.md, llms.txt, locale metadata, icon, CI
- VitePress documentation site (English + 中文)
