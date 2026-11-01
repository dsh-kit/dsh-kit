## What changed

<!-- One paragraph. Link the issue or roadmap task. -->

## Verification

- [ ] `pnpm check` (tests, preflight, docs and SSOT checks)
- [ ] `pnpm verify:template` only when the template or generator changed (generates, installs, verifies, cleans up)
- [ ] `pnpm docs:build` when docs changed
- [ ] English docs and Chinese mirror updated together

## Checklist

- [ ] No new runtime dependencies in the template
- [ ] No undocumented DSH APIs
- [ ] No personal data, absolute paths or secrets in the diff
- [ ] The change is squashed into one commit with a clear message
