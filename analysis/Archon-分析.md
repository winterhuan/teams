# Archon 项目深度分析

> 分析对象：`references/Archon`  
> 许可证：MIT  
> 关联：AI 编码 **工作流引擎**（YAML DAG）

---

## 1. 定位

**Archon = 让 AI 编码确定、可重复的 workflow 引擎。**

类比：Dockerfile 之于基础设施，GitHub Actions 之于 CI/CD，Archon 之于 **AI 开发流程**。

- 流程编码为 `.archon/workflows/*.yaml`（DAG nodes）
- **确定性节点**（bash/test/git）+ **AI 节点**（plan/implement/review）
- 每 run 独立 **git worktree** 隔离
- 人工 **approval gate**（`interactive: true`）
- 入口：CLI、Web UI、Slack、Telegram、GitHub

---

## 2. 工作流模型

```yaml
nodes:
  - id: plan
    prompt: "…"
  - id: implement
    depends_on: [plan]
    loop:
      prompt: "…"
      until: ALL_TASKS_COMPLETE
      fresh_context: true
  - id: run-tests
    depends_on: [implement]
    bash: "bun run validate"    # 无 AI
  - id: approve
    depends_on: [review]
    loop:
      interactive: true       # 等人
      until: APPROVED
```

| 能力 | 说明 |
|------|------|
| **DAG** | `depends_on`、循环节点、条件 |
| **Loop** | AI 迭代直到 `until` 条件 |
| **Isolation** | worktree per run |
| **Observability** | `workflow_runs`、events、Dashboard |
| **Portable** | workflow 跟 repo 提交 |

---

## 3. 技术栈

- Bun + TypeScript
- SQLite / PostgreSQL
- 包：`core`、`workflows`（engine）、`adapters`（Claude/Codex SDK）、`isolation`
- Schema：Zod，`dagNodeSchema`、`workflowRunSchema`…

---

## 4. 可借鉴点与边界

| Archon 强项 | 可吸收 |
|-------------|--------|
| **Workflow 作为一等公民** | `WorkflowRun` 模式，与 Free Thread 并列 |
| **步骤级重试/审批** | OpenTeams 同类能力；比纯 @ 聊天可控 |
| **确定性 + AI 混合** | Policy 平面可执行 bash gate |
| **worktree 隔离** | Workspace 绑定 git isolation |
| **跟 repo 走的 YAML** | 比 Clowder SOP 更偏工程交付 |

| 差异 |
|------|
| Archon 主路径是 **单 Agent 按 DAG 跑**，不是多 Agent 群聊 |
| 多 Agent 协作需自己在 node 里 spawn 或外接平台 |

**选型提示**：常见组合是 **双模式**（轻量 Thread/@ + 重量 Workflow DAG，见 OpenTeams）；Archon 是 Workflow 模式的参考实现，可 **兼容 Archon YAML 子集** 或自研轻量 DAG，不必从零造引擎。

---

## 5. 关键路径

| 路径 | 用途 |
|------|------|
| `README.md` | 定位、示例 workflow |
| `migrations/008_workflow_runs.sql` | run 状态 |
| `packages/workflows/src/schemas/` | DAG schema |
| `CLAUDE.md` | 架构约束 |

---

*关联：[symphony-分析.md](./symphony-分析.md)（同为工单/工作流调度）*