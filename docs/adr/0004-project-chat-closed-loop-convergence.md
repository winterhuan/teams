# Project Chat 完整闭环收敛

M0.5.0 的顶层 IA 已冻结为 Project 中心、chat-first，但 ADR 0003 之后，主轴和附录仍残留 Thread `orchestration=pipeline`、Session 只归 Thread、Daemon 自动改 Issue 业务状态、Runs 无稳定入口等旧合同。本 ADR 收敛这些分叉，并作为 Project Chat 完整闭环实现与 PRD 的优先依据。

## 1. 执行面与 Session 归属

- Thread 只承载自由协作、消息和接力链，不保存 `orchestration` 模式。
- WorkflowRun 是独立受控执行对象，固定 WorkflowDefinition 版本和 assignment snapshot。
- Session 的 owner 是判别联合，且必须二选一：
  - `thread_turn { thread_id, turn_id }`
  - `workflow_attempt { run_id, step_id, attempt_id }`
- Thread 中“创建 Run”只新建 WorkflowRun 并保存来源/Discussion 关联，不转换 Thread。
- Team 只提供 Soul、Posting、skills 和权限，不是运行模式。

## 2. 身份与派驻

- 实现合同统一使用全局 `Member` 表示产品语言中的 Soul，保存稳定 persona、voice 和默认 Provider。
- `TeamMembership(team_id, member_id, team_role?)` 表示 Soul 属于 Team。
- `Posting(project_id, member_id, source_team_id, role, autonomy, skills, permissions, memory_slice, provider_override?)` 表示项目派驻。
- 同一 `(project_id, member_id)` 只能有一条有效 Posting；若 Soul 经多支 Team 被选中，创建派驻时必须选择一个 `source_team_id`，不得静默合并权限。

## 3. Issue 状态与执行诊断

- 首个闭环冻结 Issue 业务状态为：`triage | backlog | todo | in_progress | blocked | in_review | done | cancelled`。
- Board 默认显示 Triage、Todo（含 backlog 筛选）、In Progress、Blocked、In Review、Done；Cancelled 归档显示。
- Issue.status 只由 Principal 或 Soul 通过 tracker 命令显式修改。Daemon 不因 Provider 不可用、Approval 等待、Session/Run 失败而自动改 Issue.status。
- Claim、Session、WorkflowRun、Approval 的阻塞或失败通过执行状态、`attention_reason`、Board 角标和 Inbox 浮现。需要把业务工作标为 blocked 时，由 Soul/Principal 显式执行 tracker 命令。
- `failed` 不是 Issue 业务状态；它属于 Session、Attempt、Run 或 Claim 诊断。

## 4. Project IA

Project 内稳定入口为七个 section：

1. Chat（默认）
2. Board
3. Runs
4. Artifacts
5. Workspace
6. Team
7. 项目设置

Runs 可在没有 Thread 时创建 WorkflowRun；Chat 只显示关联 Run 摘要和跳转。Run 默认显示 Steps，Graph 是同一 Run 的诊断镜头。

不设置 `Team | Workflow` 全局模式开关。Team/Posting 是 Thread 与 WorkflowRun 的共同资源池：Chat 中 `@成员/接手` 继续自由协作，`创建 Run` 新建独立 WorkflowRun；Issue 同时提供 `开始协作` 与 `运行 Workflow`；Run 的 `Discussion` 只打开/创建旁路 Thread，不改变 Run 生命周期。Workflow 是否可启动是派生 readiness：Definition 版本、输入、Team、角色绑定、Workspace、Provider、skills 与权限全部满足才可 `Start Run`，不保存第二套 `workflow_enabled` 布尔值。

Run 开始前允许更换 Team 并重新解析角色；开始后固定 assignment snapshot。整体换队必须 fork/re-plan，未执行 Step 改派需要审计事件，已执行 Step 不可重写。

桌面端右侧 inspector 壳可折叠。当前 Thread 无 Artifact 时默认折叠；用户手动打开 Files、Artifacts 或 Workspace 后按 Project 记住偏好，避免首个产物出现时布局突然跳变。

## 5. Claim 可靠性

- Claim 是 Daemon 调度态，与 Issue.status 正交，不成为 Board 列。
- 原子认领键为 `(issue_id, execution_generation)`；同一 generation 同时最多一个 active Claim。
- Daemon 在启动 Provider 前先持久化 Session/Attempt 记录与幂等启动键，再进入 Running。
- Claim 可在内存中运行，但所有状态变化写入 Timeline journal；Daemon 重启时根据未终结 Session/Attempt、心跳和 Issue 当前状态重建。
- 超时 Claim 先核验底层进程/适配器，再恢复、重试或释放；不得仅因 lease 过期重复启动。
- eligible 默认要求：Issue 为 todo、未取消/完成、存在可执行 Posting、无同 generation active Claim、依赖与并发槽满足。优先级后按创建时间公平排序。

## 6. Workspace 生命周期

- Workspace owner 是 `thread` 或 `workflow_attempt`，二选一；Project Workspace 只表示直接使用 `Project.root_path` 的登记对象。
- 首个闭环支持 `project | worktree | scratch`；`vault`、`remote` 后置。
- 生命周期：`preparing → ready → in_use → awaiting_merge → archived | error`。
- 获取 Workspace 时必须检查路径策略、仓库脏状态和锁。直接 Project Workspace 同时只允许一个写者；并发写必须使用独立 worktree。
- Workflow AI Attempt 默认独立 worktree；重试默认新 Attempt、新 Workspace，除非显式从 checkpoint 恢复。
- 合并采用 prepare/verify/apply 三段事务；冲突进入 `awaiting_merge` 并产生 Inbox 事件，不自动覆盖。
- ArtifactVersion 必须保存可持续读取的内容指针或快照 hash；Workspace 归档不能使已发布版本失效。

## 7. Artifact 身份与 Review 证据

- 新建 Artifact 必须显式创建，或使用稳定 `publish_key` 幂等创建。
- 追加版本必须提供 `artifact_id` 或命中同 Project 的稳定 `publish_key`；标题、路径或 hash 只可提示候选，不得单独自动归并。
- ArtifactVersion 溯源支持 Thread Session 或 Workflow Attempt，并可记录 `workspace_id`、`commit_hash`。
- Acceptance/Review 引用固定 `artifact_version_id`，不引用会漂移的 current 指针。
- `unseen` 驱动 Project 角标和 Inbox 的“新版本就绪”事件；不存在独立 Home 新产物流。

## 8. 测试 seam

首选且尽量唯一的高层 seam 是：

`Daemon 应用命令 → 持久事件/聚合状态 → Project 读模型`

领域集成测试通过公开命令驱动 Project、Issue、Thread、Run、Session、Claim、Workspace、Artifact 和 Approval，并断言 Chat、Board、Runs、Artifacts、Workspace、Inbox 投影。只测试外部行为、事务、不变量与恢复，不断言内部函数调用。UI 仅对 Project→Chat、Issue 自动拉取、Run Gate、Artifact Review 四条关键路径做浏览器冒烟。

## 9. 取舍

该收敛增加了 Session owner、Workspace 事务与 identity relation 的模型复杂度，但消除了 Thread/Run 生命周期混淆、Issue 状态被运行故障覆盖、同一 Soul 多处复制、同名 Artifact 误合并以及 Workspace 结果不可恢复等实现风险。M4 Handoff 与 M5 swarm 不受本 ADR 扩入当前范围。
