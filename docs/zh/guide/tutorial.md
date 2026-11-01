# 从零做一个真实插件

端到端参考实现是 [dsh-quicknote](https://github.com/dsh-kit/dsh-quicknote)：用这套模板构建并持续维护的真实插件，
包含输入框捕获、JSON API、四个 Agent 工具和侧栏页面。这一页是这条路径的简版。

## 1. 生成项目

```bash
pnpm create dsh-kit dsh-quicknote
cd dsh-quicknote
pnpm install
```

你会得到宿主半侧、客户端半侧、测试、构建、`AGENTS.md`、`llms.txt`，以及一条验证命令。

## 2. 宿主半侧

把存储和传输分开。`src/host/store.ts` 只负责一个 JSON 文件，原子写入：

```ts
await mkdir(dirname(file), { recursive: true })
await writeFile(tmp, JSON.stringify({ notes }), { mode: 0o600 })
await rename(tmp, file)
```

路由注册在 Host 的 connection 服务上，客户端只看到 JSON：

```ts
ctx.inject(['connection'], (scope) => {
  const registry = scope.get('connection').fetch
  registry.register({ path: '/api/quicknote/notes', methods: ['GET'], requestBody: 'buffered', fetch })
})
```

把同一个 store 暴露成模型可调用的工具：`quicknote_add`、`quicknote_list`、`quicknote_done`、
`quicknote_delete`。

## 3. 客户端半侧

输入框按钮从 conversation 服务读取当前草稿并打开卡片：

```ts
const shell = ctx.get('conversation').input.shell(sessionId)
const draft = shell.state.getSnapshot().draft
```

卡片通过 `fetch('/api/quicknote/notes/create')` 保存。默认**不**清空草稿；只有用户点击明确的
**保存并清空输入框** 才会清空。这是便利和“弄丢用户文字”之间的分界线。

注册四个位置：

```ts
ctx.slots.inject('conversation.input.left', () => ctx.slots.register({ ... }, ComposerButton))
ctx.slots.inject('shell.overlay', () => ctx.slots.register({ ... }, Overlay))
ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ ... }, Icon))
ctx.slots.inject('main', () => ctx.slots.register({ ... }, Page))
```

## 4. 验证

```bash
pnpm verify
dsh plugin --profile <profile> add link:$PWD
```

然后在 DSH 里：点输入框的 **记一下**，保存，打开侧栏页面，标记完成或删除。真实仓库里也有覆盖存储与
客户端注册的测试。

## 5. 模板故意留给你的部分

- 产品 UI 与文案；
- 笔记是本地还是同步；
- API 形状和额外工具；
- 发布：参考参考插件的 [PUBLISHING.md](https://github.com/dsh-kit/dsh-quicknote/blob/main/PUBLISHING.md)。

模板负责的是结构、构建、类型、测试和“不弄丢文字”的捕获流程；产品由你决定。
