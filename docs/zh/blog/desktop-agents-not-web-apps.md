---
title: '桌面 Agent 不是 Web 套壳'
description: '一个真实的插件生命周期案例、四层模型，以及桌面 Agent 需要的控制面契约。'
date: 2026-11-01
---

# 桌面 Agent 不是 Web 套壳

> **桌面 Agent 生命周期 · 第 1 / 2 篇**  
> 下一篇：[插件生命周期的失败模式](/zh/blog/plugin-lifecycle-failure-modes)。

桌面 Agent 看起来像“Web 应用 + 原生外壳”。但外壳之下，它通常共享同一套 Agent 循环、工具、会话存储，甚至同一套 UI。

共享是真的，但它主要覆盖运行时。真正困难的设计，从运行时之外的进程、profile 和客户端状态开始。

本文来自围绕 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）建设插件生态的过程。DSH 仍处于 pre-stable，下面的内容是带时间标记的案例观察。重点不是评判某个实现，而是让一类桌面 Agent 问题更容易被讨论。

## 案例：插件从 profile 消失了，但没有从窗口消失

一个插件通过本地目录安装进 DSH 桌面 profile，后来从内置插件页删除。删除本身确实发生了：

- profile 依赖已经删除；
- 插件的 patch 条目已经删除；
- 包管理器报告 `pnpm remove` 成功；
- 运行中的窗口仍然显示插件的侧栏入口和输入框按钮；
- 重启应用后，插件消失。

这些事实单独看都不奇怪。profile 是一组文件，运行中的应用是一组已经加载的模块。删除依赖改变的是文件，不会自动替换已经在内存中运行的代码。

真正值得讨论的是界面：确认文案说功能会消失；实现确实做了事；运行中的应用还没有跟上。

这就是本文的主题：不是某个插件，而是决定“安装、卸载、配置变更何时可见”的生命周期契约。

先给结论：

- 共享 Agent 运行时，不等于共享生命周期；
- 同一个插件可以分别在 profile、Host、Client 中处于不同状态；
- 界面需要说明到底哪一层发生了变化。

## 共享的运行时，独立的控制面

桌面 Agent 通常复用：

- Agent 与 Session 运行时；
- 工具执行与模型接入；
- 插件运行时与 manifest；
- Web 客户端 UI 与 slot；
- 本地存储、设置与认证；
- 决定启动时加载什么的 profile / bundle 模型。

DSH 很明确：`desktop` profile 和 `web` profile 一样，都是 bundle 栈。同一个插件包可以出现在两边。桌面端不是 Agent 的第二套实现。

没有共享的是**控制面**：谁有权安装、卸载、重载或重启，以及这些操作如何被观察。

桌面进程拥有：

- Host 进程的生命周期；
- profile 锁；
- 应用菜单与窗口生命周期；
- 更新、崩溃恢复与重新拉起；
- Electron 主进程与 Host 之间的边界。

这里的 Host，指的是运行插件服务端逻辑、组合 profile 的宿主进程。它不是 Electron 窗口，也不是浏览器页面。

## 两套模型在哪里分开

DSH 把 `desktop` 这个 profile 名保留给应用。用 CLI 操作同一个 profile 会被拒绝：

```text
error: profile "desktop" is managed exclusively by the Electron application
```

这不是“少了一个命令”，而是一个取舍。如果应用运行时 CLI 同时写 profile，三份视图可能不同步：

- 磁盘上的文件；
- Host 进程已经加载的插件；
- Client 页面已经挂载的模块。

DSH 桌面应用里也有 **Restart App and Host** 和 **Reload Page** 菜单。在这篇笔记检查的 DSH `0.2.1-rc.5`
构建里，它们位于 development 标记之后。这是某个时间点的快照，不是 DSH 的永久属性；未来版本可能以不同方式开放。真正要讨论的是：桌面外壳需要一套独立于 CLI 的、明确的操作入口。

## 插件的四层生命周期

![四层生命周期：Profile 已保存、Host 已加载、Client 已挂载、App 已重启](/assets/blog/desktop-agent-lifecycle.zh.svg)


每一层有自己的生效方式：

| 层 | 什么会改变它 | 对用户意味着什么 |
| --- | --- | --- |
| Profile | 依赖和 patch 写入 | 下次启动会包含这个插件 |
| Host | Host loader 重新组合 | 工具和服务端路由在当前进程存在 |
| Client | 渲染进程重新加载模块图 | 当前页面有 UI 入口和 slot |
| App | Electron 重启 | 整个桌面外壳被替换 |

一个“卸载”按钮把这四层全部藏起来了。

插件可以从 profile 删除，但 Client module 仍挂在页面上；可以在 Host 停用，却留下一个过时的按钮；可以写到磁盘，却没有出现在当前页面。这些不是画图时虚构的边角情况，而是四层各自更新的正常结果。

## 为什么桌面端改变问题

在 Web 上，边界更简单：页面刷新通常会重新获取 Client 模块图，服务端进程只有一个生命周期。

桌面 Agent 增加了三个复杂性：

1. **所有权**：Electron 应用拥有 profile 和应用生命周期。CLI 不能在不协调的情况下安全地修改同一组文件。
2. **两个运行时**：Host 进程和渲染进程是分开的。代码可以从一边卸载，却留在另一边。
3. **原生恢复层**：重启应用不是另一个 HTTP 请求。它要关闭 Host、落盘会话、重新拉起外壳并重连 UI。

这些不是拒绝桌面 Agent 的理由，而是把桌面外壳当作插件架构的一等公民、而不是“浏览器套一个菜单栏”的理由。

## 设计空间不是“重启 vs HMR”

很容易把问题简化成“用 HMR”或“直接重启”。两者都是合理设计，只是优化目标不同。

| 方案 | 优势 | 代价 |
| --- | --- | --- |
| 重启优先 | 可预测、路径单一、容易推理 | 打断会话、反馈慢、对插件作者成本高 |
| HMR 优先 | 反馈快、打断少 | 要协调更多状态；Client module 未必能干净卸载 |
| 只允许托管 profile | 所有权清晰、UI 可以强制执行不变量 | CLI 和自动化需要另一套入口 |
| CLI 优先 | 可组合、可脚本化 | 与运行中的应用冲突；锁和状态所有权难处理 |

[VS Code](https://code.visualstudio.com/api/advanced-topics/extension-host) 是一个有用的参考：它有 extension host、明确的 **Reload Window** 命令和成熟的扩展生命周期。它没有让问题消失，而是让状态变得明确，并给用户一个可预测的恢复动作。桌面 Agent 可以借鉴这种清晰度，而不必复制它的实现。

## 一份最小的生命周期契约

具体动作会因产品而异，但契约至少要回答四个问题：

1. 改变了什么？
2. 当前处于哪一层？
3. 用户需要做什么？
4. 如何撤销或恢复？

一个最小的命令面就够开始：

```text
install
remove
enable
disable
reload-client
restart-app
```

每个命令返回它到达的层，而不是只有 `ok`：

```text
saved
host-applied
client-reload-required
app-restart-required
failed
```

UI 应该直接表达这些状态。只有状态真的要求时，才提示“重启 DSH”。如果结果是 `applied`，但 Client 还挂着旧模块，从用户视角看就不算 `ok`。

## 测试矩阵

生命周期改动至少应覆盖产品形态和状态：

```text
web profile
CLI profile
desktop profile
```

```text
install / remove / enable / disable
page reload / app restart
idle / running task
fresh profile / existing profile
```

关键断言不只是“命令退出码是 0”，而是：

- 下一次页面加载时插件是否消失？
- Host 里的工具是否注销？
- 运行中的会话是否保留？
- 用户能否不编辑文件就恢复？
- 确认文案是否和实际到达的层一致？

## 开放问题

这是生态可以形成共同约定的地方：

- 插件 manifest 是否应该声明最低生命周期要求，例如 `client-reload` 或 `app-restart`？
- 包管理器应该暴露 profile 状态 API，还是由每个外壳自己拥有？
- Client 插件能否提供 unload hook，而不让每个插件都自己处理 teardown？
- 桌面外壳如何证明插件真的消失了，而不只是从列表里移除？

这些问题比一个统一答案更有价值。不同产品会做不同取舍，但应该把取舍写清楚。

## 对插件生态的意义

插件生态不只是一个包格式和一个 loader，它还是一组关于“改动何时可见”的承诺。

这些承诺必须横跨：

- 包管理器与 profile；
- Host 进程；
- Client 运行时；
- 桌面外壳；
- 以及告诉人们该用哪个入口的文档。

共享核心让桌面 Agent 成为可能；控制面让它变得可预测。

## 参考资料

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
- [DSH Discussion #9658：desktop profile 选择](https://github.com/deepseek-ai/deepseek-harness/discussions/9658)
- [VS Code extension host](https://code.visualstudio.com/api/advanced-topics/extension-host)
- [Electron process model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Vite HMR](https://vite.dev/guide/api-hmr)
- [Cargo profiles](https://doc.rust-lang.org/cargo/reference/profiles.html)

## 范围说明

这些观察来自 macOS 上的 DSH `0.2.1-rc.5`。DSH 仍处于 pre-stable，API 和菜单会变化。重点不是把某个实现当成永久结论，而是为桌面 Agent 及其插件生态提炼一套可复用的设计语言。
