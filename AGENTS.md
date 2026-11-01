# dsh-kit — agent notes

Monorepo for the generator, its template and the documentation site.

## Commands

```bash
pnpm install
pnpm check         # tests, preflight, docs and SSOT checks
pnpm test          # generator tests
pnpm preflight     # release checks: identity, placeholders, private paths
pnpm pack:check    # inspect the tarball
pnpm docs:dev      # VitePress on http://127.0.0.1:4173
pnpm docs:build
```

## Layout

- `packages/create-dsh-kit/index.mjs` — the generator (zero dependencies).
- `packages/create-dsh-kit/template/` — copied into every new project.
- `packages/create-dsh-kit/test/` — generator tests; they run the CLI against a temp directory.
- `docs/` — VitePress site (English primary, `zh/` mirrors).
- `docs/.vitepress/config.mts` — nav, sidebar and locales.

## Rules

- pnpm is the primary package manager; npm must keep working as a fallback.
- The generated project has zero runtime dependencies; do not add any.
- The template's `verify` script calls binaries directly (`oxfmt`, `tsc`, `vitest`, `tsdown`), never a
  package manager, so both pnpm and npm work.
- `lib/` inside a generated project is built; never hand-edit it.
- English docs first, Chinese mirror in the same change.
- Run `pnpm test` and `pnpm preflight` before committing.

## Release

`main` is protected. Open a pull request, wait for `verify (24)`, `verify (26)` and `gitleaks`, then squash
merge. Release by tagging the merged commit:

```bash
git tag v<version>
git push origin v<version>
```

The tag must equal `packages/create-dsh-kit/package.json`'s version. `release.yml` runs the full gate and publishes
with npm Trusted Publishing and provenance. See `PUBLISHING.md`.

## Agent entry points

- `skills/dsh-kit/SKILL.md` — installable skill for plugin work.
- `docs/public/agent-setup/prompt.md` — one-page setup for agents.
- `llms.txt` — machine-readable repository index.
