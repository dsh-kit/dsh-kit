# create-dsh-kit

Scaffold a [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) plugin with TypeScript, React 19 (TSX), tests,
a reproducible build, CI and agent-ready docs.

```bash
pnpm create dsh-kit my-plugin
# npm fallback
npm create dsh-kit@latest my-plugin
```

Non-interactive:

```bash
pnpm create dsh-kit my-plugin --author you --yes
```

The generated project runs:

```bash
pnpm install
pnpm verify   # format → lint → typecheck → test → build → pack
```

Documentation: <https://dsh-kit.dev>. Repository: <https://github.com/dsh-kit/dsh-kit>.
