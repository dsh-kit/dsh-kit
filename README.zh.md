# dsh-kit

面向 DeepSeek Harness 插件的可维护基线。

`dsh-kit` 生成一个已经具备结构、构建、类型检查、测试、可复现产物和 agent 上下文的 DSH 插件。一条命令开始，
之后按工程化的方式维护。

**状态：** 预发布 0.1.1 · [更新日志](CHANGELOG.md) · [路线图](ROADMAP.zh.md) · [English](README.md)

## 快速开始

需要 Node 24+（推荐 Node 26 LTS）和 pnpm 12；npm 也可用。

```bash
pnpm create dsh-kit my-plugin
cd my-plugin
pnpm install
pnpm verify
```

然后安装到 DSH profile：

```bash
dsh plugin --profile <profile> add link:$PWD
```

## 你将获得

- TypeScript + React 19（TSX），strict；
- `src/host`、`src/client`、`src/shared`，ModuleLoader 包装由构建生成；
- 宿主半侧与客户端 slot 注册的测试；
- `pnpm verify`：格式、lint、类型检查、测试、构建、打包；
- `AGENTS.md`、`llms.txt`、locale 元数据、图标、CI 与发布清单。

## 用 dsh-kit 构建

- [dsh-quicknote](https://github.com/dsh-kit/dsh-quicknote)：输入框随手记、笔记页面、四个 Agent 工具。
  这套模板的端到端参考实现。

## 文档

- [快速开始](docs/zh/guide/quick-start.md)
- [教程：从零做一个真实插件](docs/zh/guide/tutorial.md)
- [为什么选择 dsh-kit](docs/zh/guide/why.md)
- [参与贡献](CONTRIBUTING.md) · [发布](PUBLISHING.md)
- 站点：<https://dsh-kit.dev> · 仓库：<https://github.com/dsh-kit/dsh-kit>

## 许可

MIT
