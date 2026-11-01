# 参与贡献

## 语言

英文是主要语言。每份文档都有中文镜像（`*.zh.md` 或 `/zh/` 页面），翻译是同等重要的贡献。

## 提交 PR 之前

```bash
pnpm install
pnpm check            # 测试、preflight、文档与一致性检查
pnpm verify:template  # 生成 → 安装 → 验证，一条命令
pnpm docs:build       # 仅改文档时
```

`pnpm verify:template` 在临时目录生成并自动清理；加 `--keep` 可保留检查。

模板必须在全新检出上生成一个能通过 `pnpm verify` 的项目；改模板就要在同一个 PR 里改测试。

## 我们关注什么

- 先有失败的测试或可复现的步骤，再提交修复；
- 模板不引入新的运行时依赖；
- 不调用未公开的 DSH API；
- 文档改动要么双语齐全，要么注明中文镜像待补。

## 发布

生成器发布为 `create-dsh-kit`；插件归属 `dsh-kit` 组织。发布使用 npm provenance，tag 必须与
`package.json` 一致。

---

构建与工具决策：[工具链](/zh/guide/toolchain)。
