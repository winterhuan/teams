# 改写规则：去 WorkItem，Thread 承载执行 / Issue 松耦合追踪

> 本文是把设计文档从旧「WorkItem 单一真相」模型改到新「Thread + Issue 双线」模型的**统一改写规则**。所有改文档的 agent 必须先读本文，严格照此映射，保证跨文件一致。权威来源：`CONTEXT.md` + `docs/adr/0001` + `docs/adr/0002` + 原型 `design/prototype/project-chat/data.js`。

## 0. 一句话

WorkItem 概念**删除**。它的职责一分为二 + 一条正交调度线：

| 旧 WorkItem 职责 | 新归属 |
|---|---|
| 执行 / 对话账本、Session 接力链、Artifact 溯源、Closeout | **Thread**（一等耐久对象） |
| Board 业务状态 FSM、负责人、验收清单(Acceptance)、硬门挂靠 | **Issue**（松耦合追踪卡） |
| Claim 认领 / 重试 / 释放（防重复派发） | **Claim 生命周期**（Daemon 内存调度，⊥ 业务状态） |

## 1. 对象模型（新）

- **Thread**：一等耐久对象，是执行与协作的载体。持有 `sessions[]`（接力链），`session_id = thread_id-turn_id`。有可选 `issue_id`（可无，随手 thread）。Artifact 的 `produced_by` 回指 Thread/Session。Closeout 挂 Thread。
- **Issue**：Board 追踪卡。承载业务 `status` / 负责人 / `acceptance[]` / 硬门。与 Thread 松耦合：默认关联一条主 Thread，接力协作由该 Thread 内的多 Session chain 承载，因此通常无需为同一 Issue 再开 Thread；模型层不写死唯一约束，确有独立执行线时可关联额外 Thread。一条 Thread 也可无 Issue。**不再有 `Issue = WorkItem` 的等式。**
- **Session**：不变；但父对象从 WorkItem 改为 **Thread**。
- **Claim 生命周期**：Unclaimed → Claimed → Running → RetryQueued → Released（+ Blocked 扩展）。纯内存、重启从 Issue/Thread 真相重建。**不是** Board 列，**独立于** Issue 业务状态（Symphony §4.1「内部 Claim 状态 ≠ Linear 状态」）。

## 2. 状态双层（关键，改 FSM 时严守）

- **Issue.status = Linear 式业务状态**：`triage / backlog / todo / in_progress / in_review / done / cancelled / failed`（+ M 后期 `planned`/`merging`）。
- **业务转移由谁做**（ADR 002 / 决策 A）：
  - `todo → in_progress → in_review → done`、`→ cancelled`：**在 Thread 里干活的 soul 用 tracker 工具推进**。Daemon **绝不**硬编码业务转移。成功常停在 `in_review`（≈ Symphony Human Review），不必到 `done`。
  - `→ blocked`（硬门待批 / need_input）、`→ failed`（自动重试耗尽）：属 **Daemon 的硬门 + Claim 调度** territory 的浮现，非 soul 业务动作。
- **Thread 不背第二套业务 status**：Thread 是执行容器；它对外的"在跑/阻塞/待复核/收尾"是接力链 Session 状态 + Claim 态的投影，不是平行业务 FSM。业务真相只有 Issue 一处。

## 3. 里程碑

M1 / M2 / M3 合并为一个正式开发阶段：**Project Chat 完整闭环**。Thread、接力链、无 Issue 随手对话、多 Session 接力、Workspace 对象、pipeline、多队、完整 Review 与多 medium Artifact 都属于该阶段，不再保留前三阶段的开发边界。**Handoff（跨队）= M4、swarm = M5 仍延后。** 删除所有「Thread 是 M3 / WorkItem 至多一个活跃 Session 是 M1 限制 / Workspace M3 升格」这类排期限定语；当前设计统一标为「Project Chat 完整闭环」。

## 4. 逐类替换规则

| 原文出现 | 改为 |
|---|---|
| `WorkItem`（作执行账本 / 一次性任务 / Session 父） | `Thread` |
| `WorkItem`（作 Board 卡 / 状态 / 验收 / 负责人 / 硬门） | `Issue` |
| `Issue（=WorkItem）`、`WorkItem = 一条线程` | 删掉等式；Issue 与 Thread 是两个对象，松耦合 |
| `Session 挂 WorkItem`、`WorkItem 至多一个活跃 Session` | `Session 挂 Thread`；一条 Thread 有接力链多 Session |
| `workitem_id`（Artifact 溯源） | `thread_id` / `session_id`（`produced_by` 回指 Thread/Session） |
| `9 根 / 9 聚合根` | 对象集改述：Project / Team / Member(Soul) / Provider / **Thread** / Session / **Issue** / Artifact / Approval / Posting(Project 所有关系实体，非独立聚合根)。**不再强调「冻结 9 根」这个数字锁**（里程碑已合并，锁已解除）；若要列举就列新集合。 |
| `Thread ... M3`、`ThreadMessage M3` | Thread 是一等对象，在范围内 |
| `Workspace ... M3 升格` | Workspace 对象在范围内（仍可说界面 section 是投影，但不要标 M3） |
| `WorkComment / issue comment 挂 WorkItem` | issue comment 挂 **Issue**（口语「小本本」） |
| `Acceptance = WorkItem 附属` | Acceptance = **Issue** 附属 |
| `Closeout = WorkItem 附属` | Closeout = **Thread** 附属（执行收尾记录） |
| `Bundle → 新 Goal WorkItem` | Bundle → 新 Goal **Issue** |
| `Claim 态`相关 | 保留，明确标注「⊥ Issue 业务状态、Daemon 内存、非 Board 列」 |

## 5. 历史章节处理（不要瞎改）

- `conversation-turn.md`（M0.4.0 历史）、`ui.md` 里 `<details>` 折叠的 M0.4.0 §1–§11、主轴版本表里 M0.2–M0.4 的历史行：**这些是存档，不重写**。只在其顶部加一行 superseded 提示：「本节为历史模型，其中 WorkItem/Issue 等式与 Session 归属已被 M0.5.0 去 WorkItem 转向取代，见 CONTEXT.md + ADR 0001/0002」。
- 只重写**当前立场**章节（标 M0.5.0 / 当前 IA / 域内核 的部分）。

## 6. 术语（对齐 CONTEXT.md，勿回退）

负责人（非球权/持球）· 接手/交回（非传球）· 跨模型复核（非跨模型互审）· 接力链 · Claim 生命周期。

## 7. 验收（改完自检）

- [ ] 全仓 grep `WorkItem` 只应出现在：历史章节（带 superseded banner）、版本表历史行、ADR 里的「去除 WorkItem」叙述。当前立场章节零残留。
- [ ] 无「Session 挂 WorkItem / WorkItem 至多一个活跃 Session」。
- [ ] 无把 Thread / 无 issue 对话 / Workspace 对象标为「M3 / later」的当前立场句。
- [ ] FSM 章节区分「业务转移(soul 工具) vs blocked/failed(Daemon 硬门/调度) vs Claim 态(内存,非列)」三者。
- [ ] Issue↔Thread 描述为松耦合：默认一 Issue 一条主 Thread、通常靠 Session chain 接力，但不写死唯一限制；Thread 可无 Issue；无 `Issue=WorkItem` 等式。
