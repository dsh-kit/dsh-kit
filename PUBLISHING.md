# Publishing

This project keeps the repository on GitHub and the package on npm. They have different jobs:

- GitHub owns history, review and releases. `main` is protected; changes arrive through pull requests.
- npm owns the published artifact. Only CI publishes, with provenance; local publish is a bootstrap fallback.

## Before a release

1. `pnpm check` and `pnpm verify:template` are green.
2. Bump `version` in `packages/create-dsh-kit/package.json`.
3. Add the matching entry to `CHANGELOG.md`.
4. Open a pull request; the required checks are `verify (24)`, `verify (26)` and `gitleaks`.
5. Merge with squash; `main` stays linear and releasable.

## Release

1. Tag `main`: `git tag v<version> && git push origin v<version>`.
2. `release.yml` re-runs `pnpm check`, generates and verifies a project, and publishes with
   `npm publish --provenance`.
3. Verify:
   ```bash
   npm view create-dsh-kit version
   npm view create-dsh-kit dist.integrity
   npm create dsh-kit@latest /tmp/release-check -- --author ci
   ```
4. `release.yml` creates the GitHub Release from the `CHANGELOG.md` section, with the npm link and install command.
5. Review the generated release page after the workflow finishes.

## First publish

Trusted Publishing can be configured before the package exists; complete the first publish within two days of
configuring it. If the npm UI refuses a pending package, publish once manually from the package directory with
`npm publish --provenance`, then configure Trusted Publishing for `release.yml`.

## Rollback

- npm: `npm deprecate create-dsh-kit@<version> "reason"` and publish a fixed patch; never unpublish a public version.
- GitHub: revert the offending pull request; do not rewrite `main`.
