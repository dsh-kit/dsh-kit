# Rollback

A rollback is a normal, reviewable change. Prefer **revert** over rewriting history; `main` is protected and
force-pushes are disabled.

## Decide first

- **Revert** when the change is wrong, unapproved, or user-visible and the previous state was safe.
- **Fix forward** only when the previous state is also broken, or when a security fix must ship immediately.
- Never unpublish a public npm version to hide a mistake; deprecate it and publish a patch.

## Code and documentation

```bash
git fetch origin
git switch -c revert/<subject> origin/main
git revert <commit> --no-edit
pnpm check
git push -u origin revert/<subject>
```

Open a PR, let `verify (24)`, `verify (26)` and `gitleaks` pass, squash merge. For a docs-only change, also verify
the deployed URL and the specific asset or page.

For a brand change, local preview and explicit approval are required before merge. If an unapproved brand change
reached production, revert it the same day rather than iterating in public.

## npm

```bash
npm deprecate create-dsh-kit@<bad-version> "Superseded by <fixed-version>"
```

Publish a fixed patch through the normal tag workflow. Do not `npm unpublish` a public version.

If a broken version is `latest` and users must stop receiving it immediately, move the dist-tag to the last known
good version, then publish the fix:

```bash
npm dist-tag add create-dsh-kit@<good-version> latest
npm view create-dsh-kit dist-tags
```

Moving a dist-tag is reversible but affects every new install; record it in the issue and CHANGELOG.

## Deployments

- **dsh-kit docs (Cloudflare Workers):** revert and let `deploy-cloudflare` publish, or use `wrangler rollback`
  for an immediate previous deployment. Verify the custom domain and static assets after either path.
- **quicknote docs (GitHub Pages):** revert the docs commit, merge, and wait for `docs` to deploy. GitHub Pages has
  no per-deployment rollback button; the repository state is the source of truth.

## Record

- Add a `Reverted` or `Fixed` entry to `CHANGELOG.md` when a published version was affected.
- Link the revert PR from the original PR.
- If users could have seen the bad state, note it in the release or issue, not just in chat.
