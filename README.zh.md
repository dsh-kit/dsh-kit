# dsh-kit

让 DSH 插件可以长期维护、持续迭代。

DSH 插件很容易起步，也很容易失修：最小的插件只是一个 manifest 和一个 `apply` 函数，但一个能活过发布周期的仓库需要源码结构、
构建、类型检查、双半侧测试、可复现产物、安装冒烟和 agent 可读的上下文。`dsh-kit` 把这些变成默认。

状态：预发布，版本 0.1.0。生成器与模板已端到端通过 `pnpm verify`；发布说明见 [CHANGELOG.md](CHANGELOG.md)，
路线图见 [ROADMAP.zh.md](ROADMAP.zh.md)。

站点：https://dsh-kit.dev（源码在 `docs/`，英文 + 中文）。仓库：https://github.com/dsh-kit/dsh-kit。

## 你将获得

- TypeScript + React 19（TSX），strict；当前工具链（`tsc`、`oxlint`、`oxfmt`、`vitest`、`tsdown`）；
- `src/host` + `src/client` + `src/shared`，ModuleLoader 包装由 `tsdown.config.ts` 生成，源码不出现；
- 宿主半侧与客户端 slot 注册的测试；
- `pnpm verify` = 格式检查 → lint → 类型 → 测试 → 构建 → 打包；
- `AGENTS.md`、`llms.txt`、locale 元数据、图标、CI、发布清单；
- 一个生成器：TTY 上交互、`--yes` 时非交互。

## 快速开始

```bash
pnpm create dsh-kit my-plugin
cd my-plugin
pnpm install
pnpm verify
```

npm 也可用：`npm create dsh-kit@latest` / `npm run verify`。

然后安装到 profile：

```bash
dsh plugin --profile <profile> add link:$PWD
```

## 目录

```text
dsh-kit/
├── template/            # 生成器复制的模板，占位符是 __UPPER__
├── packages/create-dsh-kit/  # 生成器 + 模板
└── docs/rationale.md    # 为什么做这个
```

## 语言

英文是主要语言，中文是镜像。欢迎补翻译；新增文档请提供英文原版与 `*.zh.md`。

## 许可

MIT
