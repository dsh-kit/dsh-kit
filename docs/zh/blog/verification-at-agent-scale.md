---
title: 'Agent 规模下的验证架构：DSH 的测试体系到底约束了什么'
description: 'DeepSeek Harness 如何用分层证据、真实组合和可审计快照，让 Agent 写的代码仍然可信。'
date: 2026-11-01
---

# Agent 规模下的验证架构：DSH 的测试体系到底约束了什么

当大量代码由 Agent 编写时，绿色测试变得容易产出，却更难信任。DSH 的测试体系就是对这个问题的一种回答：每一层回答不同的问题。

Agent 很擅长产出看起来合理的实现，也很擅长产出看起来合理的测试。于是出现一种新的失败模式：

```text
测试是绿的
实现看起来合理
产品仍然是错的
```

本文把它当作一种工程治理设计来分析，材料来自仓库公开的测试政策、测试基础设施和真实测试。

## 问题：绿色测试能证明什么

单元测试可以证明函数返回预期值，但不能证明：

- 插件被真实 Loader 挂载；
- 包从构建产物解析；
- Client 真的注册了 slot；
- 模型收到了正确工具；
- Session 在重启后还在。

如果每一层都被 mock，测试可以自洽，却对发布产品什么也没证明。这就是“单测绿色、产品坏了”的缝隙。

DSH 的测试政策直接点了这个问题：**验证世界，而不是验证 Agent 的自述**。断言应该重新读文件、重新跑命令、从外部检查副作用，而不是相信 Agent 对自己工作的总结。

## 每一层都是一份证据契约

DSH 在 [docs/testing.md](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/testing.md) 里定义了测试层级。更准确的读法是把它看成一张“能证明什么”的表：

| 层级 | 能建立什么 | 不能建立什么 |
| --- | --- | --- |
| Unit（`pnpm run test`） | 逻辑、边界、事件顺序、注册清理 | 产品能启动、能发布 |
| 每文件 100% 覆盖 | 每行源码都跑过；常暴露死代码 | 行为正确 |
| Real-API e2e（`pnpm run test:e2e`） | 真实 provider 与真实 Agent 工作 | 无 key CI 的覆盖 |
| Owner-local expected | 组装后的 CLI/进程输出 | 模型随机性 |
| Session snapshot | 组装后的 会话记录 与持久化结果 | 真实 provider 行为 |
| Web browser snapshot | 真实渲染、slot 与 ARIA | 模型答案 |
| Benchmarks | 延迟、堆、扩展性预算 | 正确性 |

每一行回答不同问题。架构的价值，在于不让某一层假装回答另一层的问题。

## 真实组合

`packages/test-support` 是这套理念的具体体现。它提供的是挂载真实产品的测试基础设施：

- `loader-smoke`：在隔离临时目录里启动真实 bin 和 `cordis.yml`，捕获输出、执行 deadline、负责清理；支持 source 和构建后的 `lib/` 两种模式。
- `client-runtime`：在 jsdom 中挂载真实 slot registry、renderer 和 client graph；`createClientTest` 启动真实 web profile roster，`reload`/`unload` 操作真实 Loader entry。
- `agent-loop-testkit`：挂载真实 AgentLoop，只 mock 模型边界。
- `remote-mock`、`llm-回放`、`llm-mock-server`：隔离昂贵或非确定边界，而不是隔离产品逻辑。

政策写得很明确：优先真实实现，只 mock 边界。手写 `ctx.plugin(...)` 测试可以通过，产品路径却可能没被覆盖。产品可见插件应该启动真实组合，断言模型可见请求、持久化状态或用户可见输出。

## 一个真实例子：插件管理器的测试

`packages/boot/plugin-manager/tests/manager.spec.ts` 是一个好案例。它没有 mock manager，而是：

1. 创建临时 DSH home 和 profile；
2. 启动真实的 profile Include 和 Loader；
3. 加载真实插件管理器，必要时加载真实 HMR；
4. 用包管理器真实安装、删除 bundle；
5. 断言可观察结果。

其中一个测试安装当前平台不支持的 bundle，然后验证：

- bundle 被标记为 `unsupported-platform`；
- 启用返回 `application: "failed"`；
- `package.json` 逐字未变；
- `cordis.patch.yml` 逐字未变；
- 被管理的 service 从未被提供。

这比检查状态码强得多：它证明失败没有污染 profile。

`package-reload.spec.ts` 更进一步：安装 bundle、替换文件，观察真实 Loader/HMR 的 调用轨迹，断言插件 start/stop 与 包发布 的顺序。它还覆盖 `ResolutionRestartRequired` 路径——正确结果是“需要重启”；“reload 成功”反而是错的。

这就是治理价值：测试编码了“命令成功”和“状态有效”之间的区别。

## 快照是评审材料

DSH 用录制的 session snapshot 覆盖模型、协议和用户可见变更。重点是让变更可评审：

- 录制 规范会话；
- 在 CI 中无 key 回放；
- diff 会话记录、协议或 UI；
- 在 PR 中审阅 diff。

政策很严格：模型行为、协议或用户可见输出发生变更，必须在同一个 PR 里新增或更新无 key snapshot。包测试、mock 和文字论证不能替代组装后的 会话记录。

这就是 Agent 写的变更变得可审计的方式：评审者读 diff，而不是相信总结。

## 覆盖率是死代码探测器

DSH 对 `packages/*/*/src` 执行每文件 100% 覆盖率门禁。这个数字容易被误读。政策自己说得很清楚：行覆盖是必要条件，不是充分条件；它证明行跑过，不证明功能正确。

更有趣的是反向作用：未覆盖的行往往是应该删除的代码，而不是需要补测试的代码。在 Agent 密集的仓库里，覆盖率成为对“以防万一”分支和不可达代码的反向压力。

## 不稳定测试的治理也是证据的一部分

不稳定测试（flaky test）是指同一份代码、同一环境、同一命令下，结果会偶发变化的测试。单独通过、整体失败的测试给不出可靠证据。DSH 把资源所有权写进测试契约：

- 在测试里创建资源；
- 在 `afterEach` 释放，包括失败和超时；
- 不通过另一个 测试文件共享 测试夹具；
- 自己持有端口、临时目录和子进程；
- 只在自己运行时通过的测试是测试缺陷，不是“运行器不稳定”。

这些不华丽，但正是它们让其余信号可信。

## Agent 密集团队可以借鉴什么

不是每个产品都需要 DSH 的完整矩阵。可迁移的思路是：

1. **为每一层写清它能证明什么**，并写清它不能证明什么。
2. **让证据匹配改动表面**：registry 改动要 组合测试；协议改动要 snapshot；打包改动要 构建产物冒烟测试。
3. **优先真实组合**：mock 昂贵边界，不 mock 产品。
4. **验证世界**：重新读文件、重跑命令、从外部断言副作用。
5. **让变更可评审**：snapshot 和 receipt 把不可见行为变成 diff。
6. **投资清理**：不稳定测试摧毁信任的速度比缺少测试更快。
7. **保留真实入口路径**：测构建产物，而不只是 源码层 import。

## 边界

这套架构很昂贵。snapshot 会带来评审负担；真实组合比单测慢；每文件覆盖率如果缺乏判断，会诱导浅测试；Agent 也可能学会“迎合测试”而不满足契约。

DSH 还没有解决验证问题。它把验证当作一个**有明确证据标准的设计系统**，而不是一堆绿色勾选。

## 结尾

在 Agent 规模下，可信证据是稀缺资源。

只证明“我们写的代码跑过了”的测试套件，仍可能漏掉产品。有用的套件要证明产品承诺的世界：插件被挂载、状态持久化、UI 真实、产物可发布、失败留下可恢复的痕迹。

这才是值得借鉴的工程治理经验。

## 参考资料

- [DSH 测试政策](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/testing.md)
- [DSH test-support 测试基础设施](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/test-support)
- [插件管理器测试](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/boot/plugin-manager/tests)
- [Loader smoke](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/test-support/loader-smoke)
- [Client test runtime](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/test-support/client-runtime)
