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

## Before the first public release

The repository carries exactly **one** commit. Until the first public release, do not create follow-up commits:

```bash
git add -A
git commit --amend --no-edit
ALLOW_MAIN_PUSH=1 git push --force origin main
```

After the first public release, switch to normal pull-request history; the pre-push hook keeps `main` behind
reviews from then on.
