# 快速开始

## 环境要求

Node 24+，pnpm 12（npm 也可用）。

## 生成

::: code-group

```bash [pnpm]
pnpm create dsh-kit my-plugin
```

```bash [npm]
npm create dsh-kit@latest my-plugin
```

:::

非交互模式：

::: code-group

```bash [pnpm]
pnpm create dsh-kit my-plugin --author your-handle --title-zh "我的插件" --title-en "My Plugin"
```

```bash [npm]
npm create dsh-kit@latest my-plugin -- --author your-handle --title-zh "我的插件" --title-en "My Plugin"
```

:::

## 验证

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

`pnpm verify` 依次执行：`oxfmt --check` → `oxlint` → `tsc --noEmit` → `vitest run` → `tsdown` →
`npm pack` → `scripts/check.mjs`（包名、patch row、常量与构建产物的 bundle id 必须一致）。

## 安装到 DSH

```bash
dsh plugin --profile web add link:$PWD
dsh --profile web --dump-config | grep -A2 "id: my-plugin"
```

`link:` 用于本地开发安装；已发布的插件直接用包名安装。

桌面端请使用应用内插件页；`desktop` profile 由应用管理，不能用 `dsh plugin` 修改。

## 目录

```text
src/host/        # 宿主半侧：服务、工具、路由
src/client/      # 浏览器半侧：slot、组件
src/shared/      # 两端共用的常量
tests/           # 每个半侧一套测试
lib/             # 构建产物，提交进仓库
AGENTS.md        # agent 规则
llms.txt         # 机器索引
```

工具链说明见[工具链](/zh/guide/toolchain)；提 PR 前请看[参与贡献](/zh/guide/contributing)。

---

为什么模板长这样：[为什么选 dsh-kit](/zh/guide/why)。维护者细节：[工具链](/zh/guide/toolchain)。
