# 附录 — 队内协作协议

> **隶属：** [`../personal-agent-os.md`](../personal-agent-os.md) §6.8–§6.9 / §9  
> **阶段：** Thread / WorkflowRun 属于 **Project Chat 完整闭环**；Handoff **M4**  
> **术语：** Thread=自由协作，WorkflowRun=受控执行；Team 提供人员与能力，**不是模式**。`loop_policy` 仍作用于 Session / AI Step。  
> **边界决策：** [ADR 0003](../../docs/adr/0003-workflow-run-independent-from-thread.md)

---

## 1. 总原则

队内不是「共开一个无限 context 的群聊」，而是：

**Daemon 作邮局与裁判；每个 Member 独立 Provider Session；经 Thread 消息 / 步骤产物 / 结构化字段交互。**

| # | 原则 | 含义 |
|---|------|------|
| 1 | **Session 隔离** | 每个 Member **每次执行**对应自己的 Session；默认不共享完整 transcript |
| 2 | **Daemon 中转** | 互发只经 Thread 消息 / Step 状态，禁止模型直连调另一 Member API |
| 3 | **Lead 编排** | 派活、空单认领、失败上收；Principal 只在门控与 escalate 时介入 |
| 4 | **权限随 Member** | 工具策略在 Session 启动时固化；交互不能抬权 |
| 5 | **工件优于散文** | 交接优先路径与结构化字段，其次摘要，最后长文 chat |
| 6 | **预算裁剪** | 注入下一棒做 Context Triage；禁止默认甩全量历史 |

### 1.1 「禁止共用 Provider 会话」易误解说明

与主轴 §6.4.5 一致。**禁的是共用 Session（工位/对话历史），不是共用 Provider 注册 id（引擎型号）。**

| 允许 ✅ | 禁止 ❌ |
|---------|---------|
| 两个 Member 的 `provider` 字段都写 `claude` | 一个底层 CLI/ACP 连接上交替注入两个 SOUL |
| 两个 Session 各有 `member_id`，并行或串行 | 单 Session 里 prompt「现在你是 verifier」换角色 |
| 交接只带 StepResult / 路径 / 短摘要 | 把 builder 全量 tool trace 无裁剪塞进 verifier |

```text
型号（Provider id）  ──可共享──►  claude / pi / codex
会话（Session）      ──不可共享──►  一人一工位一 transcript
```

心智：**Daemon 是邮局；每人一间房；信（结构化字段）进门，不整屋搬家。**

```text
Principal / Lead
       │
       ▼
 Project + Team/Postings
       │
  ┌────┴──────────────┐
  │                   │
Thread              WorkflowRun
自由协作             受控 Step DAG
1..N Session         AI/CMD/Approval
  │                   │
  └── 可选来源/Discussion ──┘
```

---

## 2. 交互载体

| 载体 | 绑定 | 用途 | 阶段 |
|------|------|------|------|
| **Thread** | `team_id` + 可选 `issue_id` | 轻协作留言、@、互审 | 范围内 |
| **WorkflowRun / Step** | `project_id` + `workflow_version`；可选 `source_thread_id` / `discussion_thread_id` / `issue_id` | 受控执行与硬交棒 | 范围内 |
| **Session** | `team_id` + `member_id`；归属 `thread` **或** `workflow_step`（二选一） | 真实推理与工具 | 范围内 |
| **产出路径 / Artifact** | **Project**（`produced_by` 回指 Thread/Session 溯源） | diff、日志、PR、可预览版本 | 范围内 / 画廊 |
| **Approval** | team/issue/thread/session/workflow_run/step | 人批挂起 | 范围内 |

---

## 3. 两种执行表面与未来并行策略

### Thread · 单人直接执行

```text
Thread → 指定/默认 Member → 单 Session → Closeout
（无 Member↔Member 消息）
```

### Workflow Step 类型（Archon 启发，M0.2.14）

| `Step.kind` | 执行 | 说明 |
|-------------|------|------|
| **ai** | `owner_member` 的 Session | 默认；loop_policy 生效 |
| **command** | Daemon 跑确定性命令（test/lint/git） | **无** LLM；失败走 `on_fail` |
| **approval** | 创建 Approval / 计划 HARD STOP | 人对齐 Pulse/卡内 |

### swarm（M5，ClawTeam 启发）

- 每 worker **独立 worktree/cwd**  
- 消息只经 Daemon  
- **禁止**默认 skip-permissions  
- Lead 汇总另 Session  

### Thread · 自由协作
```text
1. 创建 Thread（常随 Issue，也可随手无 Issue）
2. Principal 或 Lead 发 brief（@member）
3. Member 回 chat/review + 产出引用
4. Lead @另一 Member 互审或收尾
5. 干活的 Soul 用 tracker 工具推进 Issue（常止于 in_review）→ Thread Closeout
```

### WorkflowRun · 受控执行

```text
1. 从 Runs、Issue、Automation 或 Thread 创建 Run；固定 WorkflowDefinition 版本
2. 解析 Project Team/Postings，把角色要求固化为 assignment snapshot
3. [L0] Principal 批计划（若 floor 要求）
4. Daemon 按 DAG：ready 步 → owner_member Session → StepResult → 解锁下游
5. 并行步受 team.concurrency；终步通过 → Run Closeout / Issue 更新建议
6. 若有关联 Discussion Thread，只回写结构化事件；Thread Closeout 与 Run 完成互不替代
```

### swarm（M5）

```text
1. Lead 划分子任务与文件所有权
2. N 个 Builder Session + 独立 worktree
3. 进度经 Thread 或 step inbox 汇总
4. 汇总/合并 → 验证步
```

---

## 3.1 Team 与 Workflow 如何启用、切换

### 它们不是互斥模式

| 概念 | 回答的问题 | 如何启用 |
|------|------------|----------|
| **Team / Posting** | 谁可参与、拥有什么 skill / Provider / 权限 | 在 Project 设置中派驻；是 Thread 与 WorkflowRun 的共同资源池 |
| **自由协作** | 这次工作是否先通过对话、@、接手推进 | 新建/打开 Thread；默认入口，不要求预先选择 solo 或 team |
| **WorkflowRun** | 是否需要固定步骤、依赖、审批、重试与审计 | 从 Runs / Issue / Automation 直接创建，或从 Thread 点“创建 Run” |

### 启用条件

1. **自由协作可用：** Project 至少有一个可执行 Posting；一人参与就是直接执行，@第二人后自然成为多人协作，不写 `solo|thread` 模式切换。
2. **创建 Run 可用：** 存在已发布 WorkflowDefinition，或 Lead 能从当前目标生成 Plan Preview；Project 能解析所需角色、Workspace、Provider、skills 与权限。
3. **开始 Run 可用：** Definition 版本、输入、Team、角色绑定与 Workspace 已固定；若策略要求，计划门 Approval 已通过。缺项时按钮 disabled 并逐项说明原因。
4. **Team 只配置供给：** Team 页面不出现“启用 Workflow”总开关。某个 WorkflowDefinition 可以声明角色要求，但不能内嵌全局 Soul 身份。

### 切换语义

| 用户动作 | 实际领域动作 |
|----------|--------------|
| Thread 中“创建 Run” | 新建 WorkflowRun；写 `source_thread_id`，可选择同一 Thread 作为 `discussion_thread_id`；Thread 本身不变 |
| Run 中“Discussion” | 打开已有旁路 Thread，或创建一条新 Thread 并写入 `discussion_thread_id`；Run 不降级为 Chat |
| Run 中需要输入 | Run / Step 暂停并产生 Approval/NeedInput；事件回声到 Discussion 与 Inbox |
| 不再使用 Workflow | Pause / Cancel Run；不是“切回 Team 模式” |
| Run 前更换 Team | 重新解析角色绑定，更新 Plan Preview |
| Run 后更换 Team | 已执行步骤不可改；更换整体 Team 必须 fork/re-plan，新指派未执行 Step 要写审计事件 |

### UI 入口

- **Chat composer：** 保留 `@成员 / 接手`；旁边提供动作 `创建 Run`，不是 `Team / Workflow` toggle。
- **Issue 详情：** `开始协作` 创建/打开 Thread；`运行 Workflow` 直接进入 Plan Preview，两者可同时存在。
- **Runs section：** 可直接新建无 Thread 的 Run；默认 Steps，复杂执行切 Graph；Inspector 提供 Result / Discussion / Logs。
- **Project Team：** 管 Posting、role、autonomy、skills 与权限；只显示“哪些 Workflow 可满足 / 缺什么角色”，不控制当前页面模式。

### 对象合同

```text
WorkflowDefinition {
  id, project_id, name
  version, status: draft | published | archived
  input_schema
  role_requirements[]        # role_key + skills/capabilities + separation rules
  steps[]                    # kind + depends_on + role_key? + policy
}

WorkflowRun {
  id, project_id
  definition_id, definition_version
  issue_id?
  source_thread_id?
  discussion_thread_id?
  team_id
  assignment_snapshot[]      # role_key → posting_id/member_id/provider_id/permission snapshot
  status: planned | awaiting_approval | running | blocked | completed | failed | cancelled
  current_step_ids[]
  created_at, started_at?, completed_at?
}

StepAttempt {
  run_id, step_id, attempt
  owner_posting_id?          # AI；CMD/Approval 可空
  session_id?                # 仅 AI
  workspace_id?
  status, input_snapshot, result?, error?, started_at?, completed_at?
}
```

不变量：Run 永远固定 Definition 版本与 assignment snapshot；Retry 新建 StepAttempt，不覆盖旧结果；Definition 发布版本不可变；Thread/Issue 关联均可空且不反向控制 Run FSM。

---

## 4. Lead 职责边界

| 做 | 不做 |
|----|------|
| 拆 Acceptance / 计划 / 派 `owner_member` | 默认代替 builder 写完全部业务代码 |
| 综合多步结果、写 Closeout 建议 | 绕过 verifier 自称验收通过 |
| 处理 `escalate_lead` | 静默抬高 Member 工具权限 |
| 对 Principal 报告 blocker | 跨队直接改另一队 Session（须 Handoff） |

Lead 可以是真实 Member（强模型），也可以是薄编排（规则 + 小模型路由）。

---

## 5. 注入与可见性

| 数据 | Principal | Lead | 执行 Member | 其他队员 |
|------|-----------|------|-------------|----------|
| Issue / Acceptance | ✓ | ✓ | ✓（相关） | 队内只读 |
| 自己的 Session transcript | ✓ | 可审计 | ✓ | ✗ |
| 他人完整 transcript | 可审计 | 默认可审计 | ✗ | ✗ |
| Thread 消息 | ✓ | ✓ | 参与者 ✓ | 可配 |
| StepResult | ✓ | ✓ | 下游步 ✓ | 只读摘要 |
| 队 memory 热层 | ✓ | ✓ | ✓ | ✓ |

---

## 6. 反模式（禁止）

1. 多 Member **共用一个 Session**（同一 transcript / 同一 Provider 连接）交替说话  
   - **不是**禁止两人配置同一个 `provider: claude`  
   - **是**禁止「一个会话里换面具」；见 §1.1  
2. 把 A 的 **全量 tool trace** 无裁剪塞进 B 的 prompt  
3. Thread 里 @all 当广播风暴  
4. Verifier 借用 builder 写权限  
5. 用跨队 Handoff 冒充队内步骤（或 Thread 当跨队通道）  
6. 无 StepResult 只靠「口头做完了」推进 WorkflowRun  
7. 一个 Inner 环（单 Session）中途换 SOUL / 角色名 **假扮** 另一 Member  

---

## 7. Thread 模式深入

> Thread = **队内异步协作总线**：有结构的留言板 + @ 唤醒，不是多人共用一个 LLM context。

### 7.1 何时用

| 用自由协作 Thread | 用 WorkflowRun | Thread 内单人即可 |
|-------------------|-----------------|------------------|
| 规格未定、来回澄清 | Acceptance 已硬、步骤可列 | 一人能做完 |
| 快修 / 互审 | 可追溯交棒与单步重试 | 纯问答 |
| 人与多 Member 同场 | 实现≠验证硬门控 | 无需单独选模式 |

**可组合：** WorkflowRun 可选关联旁路 Thread；Thread 可创建 WorkflowRun，但不会被转换或改写成另一种模式。

### 7.2 对象模型

```text
Thread {
  id, team_id, issue_id?, title?,
  visibility: team | participants | principal
  participants: member_id[]
  responsible_member_id?: member_id
  responsibility_policy: advisory | enforced  # 默认 advisory
  message_seq
  closeout_path?
  archived_at?
}
```

| 规则 | 说明 |
|------|------|
| `issue_id` | 可选（随手 Thread 可无 Issue）；队广场仅 Lead/Principal 开 |
| idle 执行投影 | 超 idle_ttl 无消息且无 in-flight → 不占并发槽；由 Session/Claim 派生，不写 Thread FSM |
| Closeout / archived_at | **与** Issue 业务状态解耦；不等于 Issue done |

### 7.3 消息

```text
ThreadMessage {
  id, thread_id, ts
  from: principal | member_id | system
  to: member_id[] | "lead" | "all_active"
  kind: chat | brief | review | status | artifact_ref | escalate | handoff_ping | system
  body: string
  fields?: { segment_status?: done|blocked|need_input, issues?: string[], handover_to?: member_id }
  artifacts?: [...]
  reply_to?: message_id
}
```

| kind | 默认唤醒 `to` |
|------|----------------|
| chat | 有 `to` 才唤醒 |
| brief / review / escalate / handoff_ping | 是 |
| status / system | 否（可通知 lead） |

**`fields.segment_status=done`：** 仅表示发送者被 @ 的那截职责完成，**不是** Issue done。

### 7.4 @ 与唤醒

```text
消息入队 (append-only, seq++)
  → validate
  → 写入 store
  → 对每个 to：
       有 in-flight 且 allow_interrupt? → 注入或入 inbox
       否则 → 创建/复用 Session，loop_policy=reactive
```

| 规则 | 默认 |
|------|------|
| 同 Member 同队 | 同时最多 1 个 thread-turn |
| 无 `to` 的 chat | **永不**自动唤醒 |
| @ 风暴 | 10s 内同 Member 被 @ >N → digest 合并 |
| `all_active` | 仅 participants（关联 Issue 时 ∩ Issue 参与者） |

**Member inbox：** `priority: escalate > brief > review > handoff_ping > chat`；drain 时可合并同 Thread。

### 7.5 被唤醒时上下文拼装（顺序固定）

```text
[system] Member SOUL + 工具策略 + 队约定摘要 + Thread 元数据
[user]
  Issue 目标 / Acceptance（可截断）
  触发消息全文
  Thread 窗口：最近 W 条或 token 预算（优先 @你 / brief / review / escalate）
  Artifacts 路径+summary（不贴超大正文）
  Rules: 必须 post 回 Thread；完成本段时 segment_status=done，并按需 handover_to 负责人或 @lead
```

可配：`max_messages=30`, `max_tokens=8k`, `pin_first_brief=true`。

### 7.6 回帖契约

```text
post_thread_message({ thread_id, to?, kind, body, fields?, artifacts?, reply_to? })
```

- 被 brief @ 后须有进展或 blocked/need_input，禁止只回「收到」  
- 产出文件须挂 artifacts  
- 空回合可 nudge（可配）

### 7.7 负责人、接手与交回

| `responsibility_policy` | 行为 |
|-------------------------|------|
| **advisory（默认）** | 显示当前负责人；其他 Soul 可评论/复核，完成自己的片段后用 `handover_to` 接手或交回 |
| **enforced** | 只有当前负责人可声明本执行片段收尾；其他 Soul 只能 review / need_input，由负责人显式交接 |

### 7.8 Thread ↔ Issue

| Issue 业务状态 | Thread / Session 典型投影 |
|----------------|---------------------------|
| triage / todo（澄清中） | 无 Session 或短澄清 Session |
| in_progress（+ thread 模式） | Claim Running，多 Member 接力 |
| in_review | @verifier 或等待 Principal 验收 |
| done | Thread 可已有 Closeout；不要求同步归档 |

Thread Closeout 由负责人/Lead 写，归档由 Lead/Principal 操作；Issue 业务状态由在 Thread 里干活的 Soul 用 tracker 工具推进（Acceptance 满足时可到 done，常止于 in_review）。

### 7.9 从 Thread 创建 WorkflowRun（原子性）

```text
Lead / Principal: 「创建 Run」
  单事务内：
    1. 从 Thread 提取 Acceptance/步骤草稿（可先人工确认）
    2. 选择 WorkflowDefinition 版本或生成待确认的 Plan Preview
    3. 创建 WorkflowRun（status=planned，source_thread_id=当前 Thread）
    4. 若用户勾选“作为 Discussion”，设置 discussion_thread_id=当前 Thread
    5. Issue 业务状态保持原值；Run 计划态与 Issue Board 状态正交
  任一步失败 → 回滚，Thread 保持原状
```

**旁路 Thread：** 关联只由 WorkflowRun 保存；不要求 Thread 反向持有 run id，也不替代 StepResult 交棒。

### 7.10 配置（队级可覆盖）

```toml
[thread]
require_issue = false
context_max_messages = 30
context_max_tokens = 8000
pin_first_brief = true
idle_ttl = "2h"
responsibility_policy = "advisory"
max_inflight_per_member = 1
mention_debounce_ms = 10000
mention_debounce_max = 3
allow_interrupt = false
empty_turn_nudge = true
```

### 7.11 Thread 反模式

1. 沦为无负责人、无收敛的全队日志坟场  
2. @ 全员当喇叭  
3. 互 @ 死循环无进展 → 强制 @lead（深度阈值可配）  
4. 用 Thread Closeout / 归档代替 Issue 业务状态推进（业务真相只在 Issue 一处，由 Soul 用工具推进）  
5. 合并多 Member 到一 Session  
6. review 只写 LGTM 无 issues/Acceptance 对照  
7. 默认 allow_interrupt=true 打断长 tool  

### 7.12 验收（Thread）

- [ ] 创建带 Issue 或随手（无 Issue）的 Thread 均可；队广场仅 Lead/Principal 开  
- [ ] @member → 独立 Session turn；看不到他人 raw transcript  
- [ ] 无 to 不触发模型  
- [ ] post 后 seq 递增可见  
- [ ] 负责人接手/交回符合 `responsibility_policy`  
- [ ] 上下文窗口与 pin brief  
- [ ] 互 @ 死循环可上收 Lead  
- [ ] Thread Closeout/归档与 Issue 业务状态独立可测  
- [ ] promote 失败可回滚  

---

## 8. Workflow Step 交接（摘要）

**下一步 Session user 载荷顺序：**

1. 队/Member SOUL 与工具策略  
2. Issue 目标 + Acceptance（相关子集）  
3. 本步 brief  
4. 依赖步 StepResult.summary + fields + artifacts  
5. 可选 Thread 近 K 条（已裁剪）  
6. **禁止**依赖步完整 transcript（除非 Lead 显式 attach）  

| `on_fail` | 行为 |
|-----------|------|
| retry | 同 Member 新 turn + issues |
| escalate_lead | Lead 改派/改 brief/改计划 |
| escalate_principal | Approval / 人审 |

---

## 9. 队内 vs 跨队

| | 队内 | 跨队 |
|--|------|------|
| 通道 | Thread / Step | **Handoff only**（M4） |
| 记忆 | 共享队 memory | 不共享；只带 Handoff 包 |
| 编排 | 队 Lead | 接收队 Lead accept |
| Session | 可并行多 Member | **禁止**合并两队 Session |

---

## 10. Handoff（M4 全文）

主轴不变量：跨队仅经 Handoff（或人新建单）；禁共享 Session；accept 原子。字段与事务如下。

```text
Handoff {
  id, from_team, to_team, source_thread_id
  summary, acceptance_remaining[], artifact_refs[], scars[]
  status: offered | accepted | rejected | failed
  fail_reason?: string    # 仅 status=failed
}
```

**状态钉死：**

| status | 含义 |
|--------|------|
| `offered` | 已提出，待接收队处理 |
| `accepted` | accept 事务成功（终态） |
| `rejected` | 接收方拒绝（终态） |
| `failed` | **accept 事务失败并已整笔回滚**（终态） |

**禁止** accept 失败后仍停在 `offered` 并只记旁路日志。重试 = **新建** Handoff（新 id，`offered`），可引用原 `fail_reason`。

**原子性（accept）：**

1. **prepare（无域状态变更）：** 校验 Handoff、目标队与 Artifact；需要拷贝/检出的内容先进入临时区。  
2. prepare 成功后，**commit** 在单事务（或文件锁临界区）内：  
   - 创建或更新 **目标队** Issue（`handoff_id` 已填）  
   - 提交已准备 Artifact 引用/原子移动  
   - Handoff → `accepted`  
   - **源** Issue → `done` 或 `cancelled`（配置 `handoff_close_source`，默认 `done`）  
3. prepare 或 commit 失败：先回滚 accept 事务与临时文件，再以**独立失败记录事务**把 Handoff 从 `offered` → `failed` 并写 `fail_reason`；源 Issue 不变，不留下目标 Issue。失败记录事务不得伪装成 accept 事务的一部分。  
4. 上下文以 Handoff 包为准；**禁止**合并两队 Session transcript。  
5. 接收队 Lead 是编排者；可选全局 ops 仅做路由提示。

M4 前：无 Handoff 对象；跨队 = Principal 指定新 `team_id` 新建 Issue/Thread 并人工粘贴摘要。

---

## 11. 目标 Issue 业务 FSM 扩展（范围内）

基础转移表见主轴 §6.5.2（Board 状态合同）。下列边与主轴目标机一致。术语已对齐（`triage`/`todo`/`in_progress`/`in_review`）；`clarifying` 不设独立态，澄清走 **issue comment**（挂 Issue；主轴 §6.5.2 映射）：

| 从 | 到 | 触发 |
|----|----|------|
| `triage` / `todo` | `in_progress` | Soul 用 tracker 表示业务已开工；WorkflowRun 可仍处于 planned/approval，不要求同态 |
| `in_review` | `in_progress` | **verifier Member** 打回 issues（非仅 Principal） |
| `failed` | `planned` | 重开并改计划 |

多角色模板示例：WorkflowDefinition 声明 `lead` / `builder` / `verifier` 角色要求，Run 启动时解析为具体 Posting；`builder` 与 `verifier` 不得同一 id，verifier 无业务写权。
