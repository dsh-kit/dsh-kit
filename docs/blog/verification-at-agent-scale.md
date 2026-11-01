---
title: 'Verification at agent scale: what DSH’s test architecture actually enforces'
description: 'How DeepSeek Harness uses layered evidence, real compositions and auditable snapshots to keep agent-written code trustworthy.'
date: 2026-11-01
---

# Verification at agent scale: what DSH’s test architecture actually enforces

When a large share of a codebase is written by agents, a green test suite becomes easy to produce and hard to
trust. DSH’s test architecture is a response to that problem: each layer answers a different question.

Agents are good at producing plausible implementations and plausible tests. The result is a new failure mode:

```text
the test is green
the implementation looks reasonable
the product is still wrong
```

This article looks at that architecture as an engineering-governance design, using the repository’s public test
policy, harnesses and tests.

## The problem: what a green test can claim

A unit test can prove that a function returns the expected value. It cannot prove that:

- the plugin is mounted by the real Loader;
- the package resolves from the built artifact;
- the client actually registered its slot;
- the model received the right tool;
- the session survived a restart.

If every layer is mocked, a test suite can be internally consistent and still say nothing about the shipped product.
That is the “green unit tests, broken product” gap.

DSH’s testing policy names the gap directly: verify the world, not the self-report. An assertion should re-run the
command or re-read the file externally; a test should not trust the agent’s own summary of what it did.

## The layers are evidence contracts

DSH documents its tiers in [docs/testing.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/testing.md).
Read them as a table of claims about what each layer can establish:

| Layer | What it can establish | What it cannot establish |
| --- | --- | --- |
| Unit (`pnpm run test`) | logic, edge cases, event ordering, registration cleanup | the product boots or ships |
| Per-file 100% coverage | every source line ran; often exposes dead code | behavior is correct |
| Real-API e2e (`pnpm run test:e2e`) | a real provider works with the real agent | keyless CI coverage |
| Owner-local expected | assembled CLI/process output | model variability |
| Session snapshot | the assembled transcript and persisted result | real provider behavior |
| Web browser snapshot | real rendering, slots and ARIA | the model’s answer |
| Benchmarks | latency, heap and scaling budgets | correctness |

Every row answers a different question. The architecture is the discipline of not letting one row pretend to answer
another.

## Real compositions

The test-support group is where this becomes concrete. It provides harnesses that mount the real product:

- `loader-smoke` boots a real bin and `cordis.yml` in an isolated temporary world, captures output, enforces a
  deadline and cleans up. It can run source or built `lib/` mode, so the test can use the consumer path.
- `client-runtime` mounts the production slot registry, renderer and client graph in jsdom. `createClientTest`
  starts the web profile roster with Remote mocks; `reload` and `unload` drive real Loader entries.
- `agent-loop-testkit` mounts the real AgentLoop with only the model boundary mocked.
- `remote-mock`, `llm-replay` and `llm-mock-server` isolate the expensive or non-deterministic boundary, not the
  product logic.

The policy is explicit: prefer the real implementation; mock only the boundary. A hand-built `ctx.plugin(...)` fixture can pass while the product path remains untested. Product-visible plugins
should boot the real composition and assert a model-visible request, durable state, or user-visible output.

## A real example: testing the plugin manager

The plugin-manager tests are a useful case study. `packages/boot/plugin-manager/tests/manager.spec.ts` does not
mock the manager. It:

1. creates a temporary DSH home and profile;
2. boots the real profile Include and Loader;
3. loads the real plugin manager and, when needed, the real HMR service;
4. installs and removes real bundles with the package manager;
5. asserts the observable result.

One test installs a bundle that is unsupported on the current platform and then verifies:

- the bundle is listed with `unsupported-platform`;
- enabling it returns `application: "failed"`;
- `package.json` is byte-for-byte unchanged;
- `cordis.patch.yml` is byte-for-byte unchanged;
- the managed service was never provided.

This is stronger than checking a status code. It proves the failure did not mutate the profile.

`package-reload.spec.ts` goes further: it installs a bundle, replaces its files, and observes the real Loader/HMR
trace. It asserts the order of plugin starts, stops and package publications. It also exercises the
`ResolutionRestartRequired` path; there, “restart required” is the correct result and “reload succeeded” is wrong.

That is the governance value: the test encodes the difference between a successful command and a valid state.

## Snapshots are review artifacts

DSH uses recorded session snapshots for model-, protocol- and human-visible changes. The purpose is to make a change reviewable:

- record a canonical session;
- replay it without a provider key in CI;
- diff the resulting transcript, protocol or UI;
- require the diff to be reviewed in the pull request.

The policy is strict: a non-trivial model, protocol or human-visible change adds or updates a keyless snapshot in
the same PR. Package tests, mocks and prose evidence do not substitute for the assembled transcript.

This is how an agent-written change becomes auditable. A reviewer reads a diff instead of trusting a summary.

## Coverage is a dead-code detector

DSH runs a per-file 100% coverage gate on `packages/*/*/src`. That number is easy to misread. The policy itself says
line coverage is necessary but not sufficient: it proves lines ran, not that the feature works.

The more interesting effect is negative: an uncovered line is often code that should be deleted, not a test that
should be bolted on. In an agent-heavy repository, coverage becomes a counter-pressure against speculative branches
and unreachable “just in case” code.

## Controlling flaky tests is part of the evidence

A flaky test changes result across runs without a code change. A test that passes alone but fails in the suite gives no reliable evidence. DSH’s policy treats resource
ownership as part of the test contract:

- create the resource in the test;
- dispose it in `afterEach`, including on failure and timeout;
- never share a fixture through another spec file;
- own ports, temporary directories and child processes;
- make a passing-only-alone test a test defect, not an unstable runner.

This is unglamorous, and it is exactly what makes the rest of the signals trustworthy.

## What an agent-heavy team can borrow

Not every product needs DSH’s full matrix. The transferable ideas are:

1. **Name the claim.** For each test layer, state what it can and cannot prove.
2. **Match evidence to the surface.** A registry change needs a composition test; a protocol change needs a
   snapshot; a packaging change needs a built-artifact smoke.
3. **Prefer the real composition.** Mock the expensive boundary, not the product.
4. **Verify the world.** Re-read files, re-run commands and assert side effects externally.
5. **Make changes reviewable.** Snapshots and receipts turn invisible behavior into a diff.
6. **Invest in teardown.** Flaky tests destroy trust faster than missing tests.
7. **Keep a real entry path.** Test the built artifact, not only the source-plane import.

## Limits

This architecture is expensive. Snapshots create review load. Real compositions are slower than unit suites.
Per-file coverage can incentivize shallow tests if used without judgment. Agents can also learn to satisfy a test
without satisfying the contract.

DSH has not solved verification. It does treat verification as a designed system with explicit claims, rather
than a pile of green checkmarks.

## Closing

At agent scale, trustworthy evidence is the scarce resource.

A suite that only proves “the code we ran” can still miss the product. The useful suite proves the world the
product promises: the plugin is mounted, the state is durable, the UI is real, the artifact ships, and the failure
leaves a recoverable trace.

That is the engineering-governance lesson worth borrowing.

## References

- [DSH testing policy](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/testing.md)
- [DSH test-support harnesses](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/test-support)
- [Plugin manager tests](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/boot/plugin-manager/tests)
- [Loader smoke](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/test-support/loader-smoke)
- [Client test runtime](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/test-support/client-runtime)
