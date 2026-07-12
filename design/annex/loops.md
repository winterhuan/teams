# 附录 — 自主执行环

> **隶属：** [`../personal-agent-os.md`](../personal-agent-os.md) §6.10 / §10  
> **参考：** `analysis/genericagent-分析.md`  
> **原则：** 内环在 Provider Session；外环在 Daemon；不绑死某一 harness  
> **契约真相：** `LoopState`、**T1–T4** 以主轴为准；**多引擎 / 适配器** 见主轴 §6.4.5 + [`providers.md`](./providers.md)  

---

## 1. 双层环（正交）

```text
┌─ 外环 Outer（Hearth Daemon / 队编排）─────────────────────┐
│  Issue 业务状态 · Claim 调度 · Thread/@ · WorkflowRun       │
│  Step 交棒 · Approval · 队并发槽 · Medic                     │
└──────────────────────────┬────────────────────────────────┘
                           │ 调度一个 Session
                           ▼
┌─ 内环 Inner（Provider / Member Session）──────────────────┐
│  while turn < max_turns and budget and !halt:              │
│    LLM → tools → 结果 →（可选）update working_checkpoint   │
│  直到：done / need_input / 预算耗尽 / 外环 pause             │
└───────────────────────────────────────────────────────────┘
```

| 环 | 职责 | 非职责 |
|----|------|--------|
| **外环** | 多 Member、多队、门控、Work 真相 | 不实现具体 code_run 语义 |
| **内环** | 单 Member 自主多 turn | 不决定「下一个 Member 是谁」 |

与「仅聊天一问一答」的区别：Inner 默认允许多 turn 连续 tool，直到出口；L1–L2 内 Principal 不必每 tool 点继续。

---

## 2. LoopState 与可观察契约

`LoopState` = **`Session.loop` 必填值对象**（非聚合根）。字段定义见主轴 §6.10。

无论底层是 GenericAgent、Pi、Claude Code 还是 Codex，Hearth 要求可观察：

| 能力 | 含义 |
|------|------|
| **连续 turn** | 无 user 插话也继续 |
| **working_checkpoint** | 短约束板，防长任务丢目标 |
| **显式出口** | done / need_input / 预算 / halt / error |
| **可中断** | pause / halt / nudge |
| **进度可流** | turn 事件推 Timeline |
| **出口原子** | Session/Thread 收尾与必要的 Issue/Approval 投影同事务（主轴 T1） |
| **steering ≠ follow-up** | nudge=环内注入；follow-up=出口后再喂（Pi；主轴 §6.10） |
| **记忆冻结** | 本 Session 不热改已注入 memory/skills 快照（Hermes；主轴 §6.11） |

若 Provider 只能单次 prompt：适配层 **薄外驱**（Daemon 根据 checkpoint 再喂下一 user）——次优，语义仍是 Inner。

**pause / halt / 审批挂起：** 状态钉死见主轴 §6.10。

- 人 **pause** → `loop.status=paused`，Issue 业务状态不变  
- **Approval（T2）** → `loop.status=paused` + `pending_approval_id`，Issue 浮现为 **blocked**  
- **need_input** → `loop.status=blocked`，Issue 浮现为 **blocked**

---

## 3. loop_policy

```text
Thread/Session 或 Step:
  loop_policy = reactive | autonomous | goal
  max_turns, max_cost_usd, deadline?
```

| mode | 典型 |
|------|------|
| **reactive** | Thread 互审、澄清（max_turns 更小） |
| **autonomous** | Workflow AI Step；Thread 内单人修 bug |
| **goal** | 「花 2 小时补绿测试」；研究扫一轮 |

**治理：** 长 autonomous / goal 仍受 L0 动作门控；`required > allowed` → 主轴 T2（Approval + blocked），不是偷跑。

### 与执行表面

| 执行表面 | Inner | 外环 |
|----------|-------|------|
| Thread 单人 | 长 autonomous/goal | 几乎无 Member 切换 |
| Thread 多人 | 每次 @ → 短 reactive | 消息调度 |
| WorkflowRun | 每个 AI Step 一次 autonomous | Step DAG |
| swarm 策略（M5） | 多 Inner 并行 | Run/Lead 汇总 |

**禁止：** 一个 Inner 假扮多个 Member。

---

## 4. 技能沉淀

Inner 结束 Closeout 可提案 `skill_draft` → **approve** 档写入队/全局 skills（与记忆三档一致）。  
UI：Pulse 待决策「是否固化为 skill？」（M4–M5）

---

## 5. Loop HUD（必显）

与 Pulse Live 对齐：

1. turn i/N  
2. budget 剩余  
3. working_checkpoint 一行  
4. Pause / Nudge / Halt  
5. 最近 tool 摘要（折叠全文）  
6. exit_reason  

没有 Loop HUD 的「全自动」= 黑盒烧钱，违反 harness 管账。

---

## 6. 配置默认

```toml
[loop]
default_mode = "autonomous"
max_turns = 40
thread_max_turns = 8
max_cost_usd_per_thread = 5
max_attempts_per_thread = 3
checkpoint_max_chars = 2000
nudge_message = "继续；更新 checkpoint；卡住就 need_input"

[loop.goal]
require_deadline = true

[autonomy]
default = 2
```

---

## 7. 决策摘要

| 决策 | 内容 |
|------|------|
| 内环在哪 | Provider Session；Hearth 定义 LoopState **值对象** |
| 外环在哪 | Daemon Claim/Thread/WorkflowRun 调度；Team 提供执行者；Issue 业务态由 Soul 工具推进 |
| 是否绑死 GA | 否；契约对齐即可 |
| 与审批 | 环内 L0 / required>allowed → T2 + Pulse 待决策 |
| 出口 | T1 原子写 Session/Attempt + owner Closeout + Timeline；业务 Issue 仅由 tracker 显式更新 |
| Loop template | **不是**聚合根；见队模板 + WorkflowDefinition + cron |
