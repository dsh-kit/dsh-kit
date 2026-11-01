# dsh-kit agent setup

You are an agent setting up to work with **dsh-kit**, the maintainable baseline for DeepSeek Harness plugins.

## Read first

1. https://dsh-kit.dev/llms.txt
2. https://dsh-kit.dev/guide/tutorial
3. The target repository's `AGENTS.md`

## Install the dsh-kit skill

```bash
npx -y skills add dsh-kit/dsh-kit --skill dsh-kit --yes --global
```

Then start a new session so the skill is discovered.

## Verify the environment

```bash
node --version    # 24 or newer
pnpm --version    # 12
pnpm create dsh-kit --help
```

If pnpm is unavailable, npm works:

```bash
npm create dsh-kit@latest my-plugin
```

## Working rules

- Generate with `create-dsh-kit`; do not recreate the build and test layer by hand.
- Never hand-write the client ModuleLoader wrapper; it is generated.
- Keep `src/host`, `src/client` and `src/shared` separate.
- Run `pnpm verify` and install the packed artifact into DSH before claiming it works.
- Ask before publishing to npm, pushing a tag, or enabling a public deployment.
- Do not store secrets, tokens or private paths in the repository or in generated docs.

## Need a plugin?

Use the curated list at https://dsh-kit.dev/plugins/ first. If nothing fits, read `CURATION.md` before starting a
new plugin.
