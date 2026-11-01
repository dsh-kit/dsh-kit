# Quick start

## Requirements

Node 24+, pnpm 12 (npm fallback).

## Create

::: code-group

```bash [pnpm]
pnpm create dsh-kit my-plugin
```

```bash [npm]
npm create dsh-kit@latest my-plugin
```

:::

Non-interactive:

::: code-group

```bash [pnpm]
pnpm create dsh-kit my-plugin --author your-handle --title-zh "我的插件" --title-en "My Plugin"
```

```bash [npm]
npm create dsh-kit@latest my-plugin -- --author your-handle --title-zh "我的插件" --title-en "My Plugin"
```

:::

## Verify

::: code-group

```bash [pnpm]
cd my-plugin
pnpm install
pnpm verify
```

```bash [npm]
cd my-plugin
npm install
npm run verify
```

:::

`pnpm verify` runs, in order: `oxfmt --check` → `oxlint` → `tsc --noEmit` → `vitest run` → `tsdown` →
`npm pack` → `scripts/check.mjs` (package name, patch row, constants and the built bundle id must agree).

## Install into DSH

```bash
dsh plugin --profile <profile> add link:$PWD
dsh --profile <profile> --dump-config | grep -A2 "id: my-plugin"
```

`link:` installs the working copy for development; a published plugin is installed by package name.

Desktop profiles are app-managed: add the package to `dsh.profile.bundles` and the dependency, run
`pnpm install` in the profile, then restart DSH.

## What you get

```text
src/host/        # Node half: services, tools, routes
src/client/      # browser half: slots, components
src/shared/      # constants both halves import
tests/           # one suite per half
lib/             # generated and committed
AGENTS.md        # agent rules
llms.txt         # machine index
```

Read [Toolchain](/guide/toolchain) for why these tools, and [Contributing](/guide/contributing) before opening a
pull request.

---

Why the template looks like this: [Why dsh-kit](/guide/why). Maintainer details: [Toolchain](/guide/toolchain).
