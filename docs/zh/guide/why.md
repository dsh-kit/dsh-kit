# 为什么选 dsh-kit

## 缺口

DSH 的起步很轻：最小的插件只需要一个 manifest 和一个函数。这对实验是优点，对需要长期维护的软件却是负担。

官方文档把 bundle 契约讲得很清楚，却没有可运行的模板；社区脚手架停在“能加载”。结果是一大批一次性仓库：
插件能用一次，长期维护的成本却很高——没有测试、没有构建、没有发布自动化，也没有留给下一位贡献者或 agent 的上下文。

## 参照

DSH 生态里的头部插件 [`omdsh-dev/DSH-better-sidebar`](https://github.com/omdsh-dev/DSH-better-sidebar) 已经证明工程化是可行的：

- 238 个源文件、231 个测试；
- TypeScript + tsdown + vitest + ESLint；
- Playwright 挂载检查：把打包产物装进全新的 profile，启动真实的 `dsh web` 并断言；
- OIDC 发布与 provenance、Windows 对照检查、下游类型检查；
- `AGENTS.md` 硬约束、`docs/plans/` 设计记录。

成本主要是一次性的脚手架投入；收益是之后每次改动都默认经过验证。dsh-kit 把这部分一次性工作固化下来，
让新插件从同一条起跑线开始。

## dsh-kit 不做什么

- 不替业务决定产品与界面；
- 不依赖未公开的 DSH API；
- 不隐藏构建过程：`lib/` 是生成的，`src/` 不需要转译器就能读。

---

下一步：[工具链](/zh/guide/toolchain) 说明当前使用的构建与测试工具；[快速开始](/zh/guide/quick-start) 直接创建一个项目。
