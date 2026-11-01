# Why dsh-kit

## The gap

The smallest DSH plugin is a manifest and a function. That is a great property for experiments, and a poor one for
software that has to survive a release cycle.

The official documentation describes the bundle contract in detail, but ships no runnable template. Community
scaffolds stop at "it loads". The result is a long tail of plugin repositories that are useful once and expensive
forever: no tests, no build, no release automation, no context for the next contributor or agent.

## The reference

The flagship DSH plugin [`omdsh-dev/DSH-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar) shows
the engineering is viable:

- 238 source files, 231 tests;
- TypeScript + tsdown + vitest, ESLint;
- a Playwright mount gate that installs the packed plugin into a fresh profile and boots a real `dsh web`;
- OIDC publishing with provenance, a Windows parity lane, a consumer-type surface check;
- hard rules in `AGENTS.md`, design history in `docs/plans/`.

The cost is mostly one-off scaffolding. The benefit is every later change being verified by default. dsh-kit
packages that one-off work so a new plugin starts at the same level.

## What dsh-kit does not do

- It does not decide your product or UI.
- It does not depend on undocumented DSH APIs.
- It does not hide the build: `lib/` is generated, and you can read `src/` without a transpiler.

---

Next: [Toolchain](/guide/toolchain) explains the build and test stack; [Quick start](/guide/quick-start) gets a project running.
