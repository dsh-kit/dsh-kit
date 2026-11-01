# __PKG__

__DESC_ZH__

[English](README.md)

## 要求

Node 24+，pnpm 12（npm 可兜底）。

## 安装

```bash
dsh plugin --profile <profile> add __PKG__
```

桌面 profile 由应用托管：把 `__PKG__` 加进 `dsh.profile.bundles` 与依赖，执行 `pnpm install`，重启 DSH。

## 验证

```bash
dsh --profile <profile> --dump-config | grep -A2 "id: __PLUGIN_ID__"
```

## 开发

```bash
pnpm install
pnpm verify   # 格式 → lint → 类型 → 测试 → 构建 → 打包
```
npm 也可用：`npm install && npm run verify`。

- `src/host/`：宿主半侧（Node）；
- `src/client/`：浏览器半侧，ModuleLoader 包装由 `tsdown.config.ts` 生成；
- `lib/`：构建产物，提交进仓库（`link:` 安装不会构建）；
- `tests/`：宿主与客户端测试；
- `AGENTS.md` / `llms.txt`：给 agent 的上下文；
- `PUBLISHING.md`：发布清单。

## 许可

MIT
