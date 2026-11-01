# dsh-kit

Build DSH plugins that stay maintainable and keep shipping.

Requires Node 24+ (Node 26 LTS recommended) and pnpm 12; npm works as a fallback.

DSH plugins are easy to start and easy to let rot: the smallest plugin is a manifest and an `apply` function, but a repository that survives
a release cycle needs source layout, a build, type checking, tests for both halves, a reproducible artifact, an
install smoke test and agent-readable context. `dsh-kit` makes that the default.

Status: pre-release, version 0.1.0. The generator and template pass `pnpm verify` end to end; release notes live in
[CHANGELOG.md](CHANGELOG.md), roadmap in [ROADMAP.md](ROADMAP.md).

[中文](README.zh.md)

Site: https://dsh-kit.dev (source in `docs/`, English + 中文). Repository: https://github.com/dsh-kit/dsh-kit. Roadmap: [ROADMAP.md](ROADMAP.md) ·
[中文](ROADMAP.zh.md). Contributions: [CONTRIBUTING.md](CONTRIBUTING.md). Releasing: [PUBLISHING.md](PUBLISHING.md).

## What you get

- TypeScript + React 19 (TSX), strict; current toolchain (`tsc`, `oxlint`, `oxfmt`, `vitest`, `tsdown`).
- `src/host` + `src/client` + `src/shared`, with the DSH client-module wrapper generated, never hand-written.
- Tests for the host half and for client slot registration.
- `pnpm verify` = format check → lint → typecheck → tests → build → pack.
- `AGENTS.md`, `llms.txt`, locale metadata, icon, CI, release checklist.
- One generator: interactive on a TTY, non-interactive with `--yes`.

## A real plugin

[dsh-quicknote](https://github.com/dsh-kit/dsh-quicknote) is built from this template and maintained as a real
plugin: composer capture, a JSON API, four Agent tools, a sidebar page and tests. It is the end-to-end reference
for what the template is expected to deliver.

## Quick start

```bash
pnpm create dsh-kit dsh-hello
cd dsh-hello
pnpm install
pnpm verify
```

npm fallback: `npm create dsh-kit@latest`, `npm install`, `npm run verify`.

Then install it into a profile:

```bash
dsh plugin --profile <profile> add link:$PWD
```

## Layout

```text
dsh-kit/
├── pnpm-workspace.yaml
├── packages/create-dsh-kit/   # generator, template and generator tests
│   ├── index.mjs
│   ├── preflight.mjs
│   └── template/
├── docs/                      # VitePress site (English + 中文)
├── AGENTS.md                  # repository rules for agents
├── llms.txt                   # machine-readable index
├── ROADMAP.md
└── CONTRIBUTING.md
```

## Language

English is primary; Chinese mirrors every document. New docs should ship an English original and a
`*.zh.md` translation.

## License

MIT
