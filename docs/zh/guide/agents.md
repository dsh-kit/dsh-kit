# 面向 Agent

`dsh-kit` 不只给人读，也为 coding agent 设计。

## 从这里开始

1. 读一页式 setup prompt：<https://dsh-kit.dev/agent-setup/prompt.md>
2. 安装 skill：

   ```bash
   npx -y skills add dsh-kit/dsh-kit --skill dsh-kit --yes --global
   ```

3. 读机器可读索引：<https://dsh-kit.dev/llms.txt>
4. 在本仓库工作时，先读 `AGENTS.md`。

## 哪些能被自动发现

| 入口 | 发现方式 |
| --- | --- |
| `AGENTS.md` | 多数 coding agent 打开仓库时自动读取 |
| `skills/dsh-kit` | 执行 `skills add` 之后；克隆仓库本身不会自动加载 |
| `llms.txt` | agent 支持该约定或被指向 URL 时读取 |
| `agent-setup/prompt.md` | 人或 agent 可以直接打开的单一 URL |
| 教程 | README、文档导航和 `llms.txt` 都会指向 |

## 边界

- 本地生成、验证可以自由执行；
- 发布 npm、推 release tag、修改公开部署前必须先确认；
- 不要把 token、私有路径或客户数据写进仓库或生成文档；
- 不要使用未公开的 DSH API。
