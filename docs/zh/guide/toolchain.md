# 工具链

模板刻意保持精简。当前使用：

- **TypeScript 7**，用 `tsc --noEmit` 做类型检查；
- **tsdown** 产出 ESM 宿主半侧和 CJS 客户端产物，并包进 `window.__ModuleLoader__`；
- **React 19**，客户端半侧由 DSH 在运行时提供，不打包进产物；
- **vitest** + jsdom，覆盖两套测试；
- **oxlint** / **oxfmt** 负责 lint 与格式化；
- **pnpm 12**、Node 24+（npm 也可用）。

理由很实际：一份锁文件、检查速度快、零运行时依赖，构建产物不需要转译器也能读。

## 原生客户端 chunk

`scripts/native-client-build.mjs` 负责原生 lazy-CJS 包装。默认的 `tsdown.config.ts` 只构建 `client.js`，不要求额外 chunk。需要按需加载可选视图时，显式声明：

```ts
...nativeClientBuilds({
  id: pkg.name,
  entry: 'src/client/index.tsx',
  chunks: { 'client.details.js': 'src/client/details.tsx' }
})
```

每个入口分别构建为自包含的浏览器产物。helper 用 `{ id, factory }` 注册包入口，用 `{ id, chunk, factory }` 注册 sibling chunk；源码不实现 Loader。
chunk 名称遵循 `client.<name>.js`；`client.js` 和仅供 Host 使用的 `client.node.*` 名称保留。

在事件处理函数中，通过 DSH 原生的异步 require 请求可选 sibling：

```ts
declare const require: { async(path: string): Promise<unknown> }

export async function openDetails() {
  return require.async('./client.details.js')
}
```

普通内部 `import()` 保留在当前 bundle 内，只有显式的原生请求才会加载 sibling。
DSH web platform 表中的 specifier 保持为精确的外部请求，包括 React、ReactDOM、Cordis 和共享 UI/store 模块。其他依赖内联，包括 `react/jsx-dev-runtime` 这类不在平台表中的包子路径。额外模块请求同时填写 helper 的 `external` 选项和匹配的 manifest `dsh.client.inject` 或 `external` 声明；把 import 标为 external 不代表运行时已经提供它。

其他 bundler 可以复用同一 helper 的 `nativeClientWrapper({ id, chunk? })` 与 `DSH_CLIENT_EXTERNALS`。
helper 没有构建工具的运行时 import；调用方还须保证各 bundle 自包含，并管理自己的资源、CSS 和产物检查。
`pnpm verify:template` 用真实编译产物验证可选 sibling 和内部 dynamic import，覆盖 factory 执行时机及
Host 模块共享。

修改入口或 chunk 后，重新构建插件并重启 DSH；此 helper 尚不支持仅替换 chunk 的 HMR。

选型过程留在 PR 和发布说明里，不放在这一页。下载量和被放弃的方案很快会过时；这里只描述模板今天在用什么。

---

日常命令见 [AGENTS.md](https://github.com/dsh-kit/dsh-kit/blob/main/AGENTS.md)。还没有生成项目的话，从[快速开始](/zh/guide/quick-start)开始。
