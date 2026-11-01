# Contributing

## Language

English is the primary language. Every document ships with a Chinese mirror (`*.zh.md` or a `/zh/` page), and
translations are welcome as first-class contributions.

## Before a pull request

```bash
pnpm install
pnpm check            # tests, preflight, docs and SSOT checks
pnpm verify:template  # generate → install → verify, one command
pnpm docs:build       # docs-only changes
```

`pnpm verify:template` uses a temp project and cleans it up; add `--keep` to inspect it.

The template must generate a project that passes `pnpm verify` on a clean checkout. If you change the template,
change its tests in the same pull request.

## What we look for

- A failing test or a reproduction first, then the fix.
- No new runtime dependencies in the template.
- No undocumented DSH APIs.
- Documentation changes in both languages, or a note saying the mirror is pending.

## Release

The generator is published as `create-dsh-kit`; plugins live under the `dsh-kit` organization. Releases use
npm provenance; tags must match `package.json`.

---

Build and tooling decisions: [Toolchain](/guide/toolchain).
