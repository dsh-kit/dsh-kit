# 工具链

模板刻意保持精简。当前使用：

- **TypeScript 7**，用 `tsc --noEmit` 做类型检查；
- **tsdown** 产出 ESM 宿主半侧和 CJS 客户端产物，并包进 `window.__ModuleLoader__`；
- **React 19**，客户端半侧由 DSH 在运行时提供，不打包进产物；
- **vitest** + jsdom，覆盖两套测试；
- **oxlint** / **oxfmt** 负责 lint 与格式化；
- **pnpm 12**、Node 24+（npm 也可用）。

理由很实际：一份锁文件、检查速度快、零运行时依赖，构建产物不需要转译器也能读。

选型过程留在 PR 和发布说明里，不放在这一页。下载量和被放弃的方案很快会过时；这里只描述模板今天在用什么。

---

日常命令见 [AGENTS.md](https://github.com/dsh-kit/dsh-kit/blob/main/AGENTS.md)。还没有生成项目的话，从[快速开始](/zh/guide/quick-start)开始。
