# Hearth

Hearth 是本地优先的个人 Agent 操作系统。当前产品实现从 Project 创建 tracer bullet 开始；领域语言见 [`CONTEXT.md`](./CONTEXT.md)，当前闭环 PRD 见 [`.scratch/project-chat-closed-loop/PRD.md`](./.scratch/project-chat-closed-loop/PRD.md)。

## 开发基线

- Node.js 22.20
- pnpm 10.28
- strict TypeScript
- SQLite（Node 22 `node:sqlite`，封装在 storage adapter 中）
- 不需要、不会安装或启动 Docker

```bash
nvm use
pnpm install --frozen-lockfile --ignore-scripts
pnpm typecheck
pnpm test
```

## 最小 Daemon seam

Web、CLI 与测试必须沿同一 seam 工作：

```text
public Daemon application command
  -> SQLite 中同事务提交的聚合、Timeline event 与投影
  -> Project grid/detail read models
```

手工运行（每条命令都是一个独立进程，因此同时验证重启读取）：

```bash
DB="$(mktemp -d)/hearth.db"
COMMAND='{"type":"project.create","idempotencyKey":"demo-project-01","actor":{"type":"principal","id":"principal-local"},"reason":"Create demo project","project":{"name":"Demo Project"}}'

pnpm hearthd --db "$DB" --json "$COMMAND" create-project
pnpm hearthd --db "$DB" --json "$COMMAND" create-project
pnpm hearthd --db "$DB" project-grid
pnpm hearthd --db "$DB" --project-id '<projectId>' project-detail
pnpm hearthd --db "$DB" --project-id '<projectId>' project-timeline
```

stdout 是机器可读 JSON。相同 actor、command type 与 idempotency key 的同一意图返回原有 ID 并标记 `replayed: true`；不同意图返回 `IDEMPOTENCY_CONFLICT`。

## 安全边界

当前控制包括 Daemon 单写者、SQLite 事务、最小 Provider 子进程环境、Workspace/path policy 与副作用前 gate。它们不等价于容器隔离；项目不会把拥有任意本机执行权限的第三方进程描述为已被 OS 强隔离。
