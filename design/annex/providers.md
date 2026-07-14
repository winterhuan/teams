# 附录 — Provider 多引擎适配

> **隶属：** [`../personal-agent-os.md`](../personal-agent-os.md) §6.4.5 / §6.10
> **范围：** Provider 注册、契约与多 Member 异引擎均属于 **Project Chat 完整闭环**
> **原则：** Daemon 管账；Provider 推理；适配器薄；禁止为某一 harness 定制内核

---

## 0. 校准声明（ADR 0006）

本附录原先描述 Hearth **自建**的四层 transport 抽象（`acp | cli_json | cli_text | thin_drive`）与自建 session/queue/cancel。Issue 03 之后，该路线被 **[ADR 0006](../../docs/adr/0006-acpx-runtime-as-provider-transport.md)** 取代：Hearth **复用 `acpx/runtime`** 作为 Provider transport，自身继续拥有 Thread/Issue/Posting/Approval/Artifact 账本真相。

因此，本附录按下述分工阅读：

| 层 | 归属 | 内容 |
|----|------|------|
| **Transport** | `acpx/runtime` | ACP 会话生命周期、子进程、cancel、timeout、规范化事件；见 §3 |
| **账本 / 治理** | Hearth `hearthd` | Provider Registry、解析优先级、health gate、policy、cost、Session/Approval 真相；见 §2、§4–§10 |

§3 原「自建传输优先级」表已废弃，替换为 acpx 分工描述。§2、§4 的 registry schema 与统一事件契约仍然成立，但实现方式改为「消费 acpx 契约 + Hearth 归一化」。术语记录字段（`hearth_provider_id` / `transport` / `model_provider` / `model` / `compatibility_route`）不变。

---

## 1. 在架构中的位置

```text
hearthd
  ├── Provider Registry     # 已注册引擎 + health（账本侧）
  ├── Project / Artifact    # 产物归属（账本侧）
  ├── Thread / Issue / Team # 执行线 + 业务追踪 + 编制
  └── Session
        provider_id ──► acpx/runtime（transport）
                              │  ensureSession / startTurn / cancel / close
                              ▼
                        pi-acp / codex-acp / claude-agent-acp / …
                              │
                              ▼
                    Pi / Claude Code / Codex / …
                    （本机进程或 ACP 连接）
```

| 谁 | 做什么 | 不做什么 |
|----|--------|----------|
| Daemon (`hearthd`) | 解析 provider、建 Session、LoopState、Approval、预算、Timeline、归一化 acpx 事件 | 不实现完整 ReAct 语义、不自建 ACP transport |
| `acpx/runtime` | ACP 会话生命周期、子进程 spawn、cancel、timeout、规范化事件流 | 不知道 Issue FSM / Claim / Approval / Artifact |
| ACP Adapter（`pi-acp` 等） | 把上游 CLI 的私有协议落到 ACP | 不进入 Hearth 领域模型 |
| Provider 进程 | LLM + 原生 tools | 不知道 Issue FSM / Claim 生命周期 |

**关键实现事实（Issue 03）：** `pi-acp` 不委托 ACP filesystem/terminal，Pi 工具在其自身进程内执行且 `cwd` 不是沙箱。Issue 03 期间曾用自建 launcher + 工具 allowlist + 副作用前路径 gate 强制隔离，但**首个闭环已按产品决策放弃这套边界**（见 [ADR 0006](../../docs/adr/0006-acpx-runtime-as-provider-transport.md) §4）：Session 直接用 acpx 内置 `pi` agent，不裁剪工具面、不设路径 gate、不设 cwd 沙箱。因此当前闭环不主张 Provider 子进程被 OS 强隔离；治理门整体留给后续 issue（见 §4.2、§11.1）。

---

## 2. 注册文件 schema

路径：`~/.hearth/providers/<id>.toml`（或 `.yaml`；一种即可，Project Chat 完整闭环钉 **toml**）。

Registry 记录的是 **Hearth Provider 账本身份 + acpx 接入参数 + 能力声明**，不是 transport 实现。`transport` 字段现固定为 `acpx`，具体 ACP adapter 由 acpx agent 名或 command 覆盖决定。

```toml
# ~/.hearth/providers/pi.toml
id = "pi"
display_name = "Pi"
enabled = true

# 接入方式：统一走 acpx/runtime（见 ADR 0006）
transport = "acpx"
acpx_agent = "pi"                # 用 acpx 内置 pi-acp adapter，首个闭环不覆盖命令、不 pin

# 能力声明（Daemon 用于路由与降级，非营销字段）
[capabilities]
native_multi_turn = true       # 无 user 插话也能连跑 tool turn
structured_events = true       # acpx 推 text/tool/usage/terminal 事件
cost_events = false            # 是否上报 token/费用（acpx status.breakdown）
cancel = true                  # acpx turn.cancel + AbortSignal
pre_tool_gate = false          # 首个闭环不设副作用前门（初期不设边界，见 ADR 0006 §4）

# 原生 tool → Hearth action_id（可只写差异项；未映射默认 L0）
[tool_map]
"bash" = "shell.run"
"read" = "fs.read"
"write" = "fs.write"
"edit" = "fs.edit"

# Pi model provider / model route（不是第二个 Hearth Provider）
[route]
model_provider = "agnes-ai"
model = "agnes-2.0-flash"
```

```toml
# ~/.hearth/providers/codex.toml（Issue 05）
id = "codex"
display_name = "Codex"
enabled = true
transport = "acpx"
acpx_agent = "codex"          # acpx 内置 codex-acp

[capabilities]
native_multi_turn = true
structured_events = true
cost_events = false
cancel = true

# 两条真实 route：Codex native，或经 Agnes bridge
# compatibility_route 仅在走 Responses-to-Chat bridge 时记录
```

**注册命令：**

```text
hearth provider add <id> --acpx-agent <name> [--command …]
hearth provider ls
hearth provider show <id>
hearth provider health [<id>]
hearth provider disable|enable <id>
```

`provider add` 写入 registry；**不**自动改 Member 绑定。

---

## 3. Transport：acpx/runtime 分工（取代原自建四层）

> 原「传输优先级表（`acp | cli_json | cli_text | thin_drive`）」已由 ADR 0006 废弃。Hearth 不再自建 transport 抽象；下表是 Hearth 与 acpx 的实际分工。

| 关注点 | 由谁负责 | 实现细节 |
|--------|----------|----------|
| 会话生命周期 | `acpx/runtime` | `ensureSession({ sessionKey, agent, mode: "persistent", cwd, sessionOptions })` |
| Session key | Hearth | `sessionKey = hearth-session:<session_id>`；Hearth Session 与 acpx record 一一对应 |
| 恢复记录 | Hearth `AcpSessionStore` | `AcpSessionRecord` 存独立 `<hearth.db>.acpx.db`（WAL），与核心账本分库 |
| resume pointer | Hearth | `sessions.provider_session_ref = handle.acpxRecordId` |
| 一轮执行 | `acpx/runtime` | `startTurn({ handle, text, mode: "prompt", requestId, timeoutMs, signal })` |
| 事件流 | `acpx/runtime` → Hearth | 消费 `turn.events`（`text_delta` / `status` / `tool_call`）+ `turn.result`（`completed` / `cancelled` / `failed`），归一化为 Hearth `session.*` |
| 取消 | Hearth → acpx | `AbortController.abort()` + `turn.cancel({ reason })` |
| 关机 | Hearth → acpx | `runtime.close({ handle, reason })` |
| 权限 | acpx（初期） | acpx `permissionMode: "approve-all"` + `nonInteractivePermissions: "deny"`；首个闭环**不设** Hearth 侧工具面裁剪或路径 gate（初期不设边界，见 ADR 0006 §4）。治理门留给后续 issue |

**acpx 终态取用规范（0.12 契约）：** `startTurn(...).events` **不**发终态事件；完成/取消/失败一律读 `turn.result`。Hearth 归一化时不得把 `result` 混入事件流误判。

**PTY 刮屏：** 仍然禁止作为默认路径。acpx 本身走结构化 ACP JSON-RPC，不刮 PTY。

---

## 4. 统一 Hearth Session 事件契约（规范）

Hearth 消费 acpx 事件后，对上（journal / read model / UI）暴露稳定的归一化事件。acpx 契约字段（`AcpRuntimeEvent` / `AcpRuntimeTurnResult`）不直接进领域模型。

```text
// launch spec（Hearth application → AcpxAdapter.start）
{
  sessionId, threadId, turnId,     // Hearth 已分配
  prompt,
  cwd,                             // 工作目录（初期不设 scratch 沙箱，见 ADR 0006 §4）
  hearthProviderId: "pi",          // 账本身份
  modelProvider, model,            // Pi route：agnes-ai / agnes-2.0-flash
}
// options: { timeoutMs? } —— 初期不传，交给 acpx / Pi 默认（tools 白名单已移除）

AcpxAdapter:
  start(spec, onEvent, options?) -> RunningProviderProcess { completed, cancel() }
```

### 4.1 归一化 Hearth Session 事件（最小）

| Hearth 事件 | 来源（acpx） | 驱动 |
|-------------|--------------|------|
| `session.provider_bound` | `ensureSession` handle | 持久化 `provider_session_ref` / backend / agent session id |
| `session.running` | 会话就绪 | HUD 状态、Timeline |
| `assistant.delta` | `text_delta`（`stream != thought`） | Chat 流式文本、journal |
| `tool.started` / `tool.delta` / `tool.ended` | `tool_call`（按 `status` 分派） | 工具审计（当前仅记录，不构成授权） |
| `cost.sample` | `status.breakdown` / `status.cost` | 成本账（可选） |
| `session.completed` | `result.status = completed` | `stopReason` + usage roll-up |
| `session.cancelled` | `result.status = cancelled` 或本地 cancel | 终态；晚到的 failure 不得覆盖 |
| `session.failed` | `result.status = failed` | `reason=timeout`（detailCode/message 判定）或 `provider_error` |

**拦截模型（初期不设边界，见 ADR 0006 §4）：**

- **首个闭环不设 tool 前门。** acpx `permissionMode` 固定 `approve-all`，Pi 工具直接执行；Hearth 不裁剪工具面、不拦路径、不设 cwd 沙箱。
- 事后 `tool.*` 事件用于审计与状态同步，是当前 Agent 工具活动的唯一可观察记录，但**不构成**授权。
- 治理门（同步 `authorize(action_id, path?)`、等价强制机制、L0 → Approval）是后续 issue 的目标（Posting → Issue 11，Approval → Issue 27），当前不实现。
- 未来实现治理门时，强制点不应依赖单一 Provider 特性（如 Pi 专属 launcher），而应放在 acpx client fs 委托或统一 policy gate。

---

## 5. tool → action_id

1. 查 `providers/<id>.toml` 的 `[tool_map]`（键为 acpx `tool_call.title` / 上游 tool 名）
2. 再查内置默认表（按 provider 家族，annex 可扩展）
3. 仍无 → **`action_id = unknown.tool`，level = L0**

路径类工具：解析目标路径后叠加主轴 §6.7「越 work_roots → L0」。

---

## 6. 解析与覆盖（与主轴一致）

```text
resolved_provider =
  CLI/API --provider
  ?? Thread.provider_override
  ?? Posting.provider_override
  ?? Member.provider
  ?? config.provider.default
  ?? 唯一 enabled Provider
  ?? error: 无可用 Provider
```

Session **启动后** `provider_id` **不可变**。换引擎 = 新 Session（计 attempt 或人显式 restart）。acpx handle 与 `provider_session_ref` 同样在 Session 生命周期内固定。

**健康：** Session owner（Thread turn 或 Workflow attempt）持久化后、Session `start` 前执行 health（可复用 acpx `doctor()` / `probeAvailability()` 作为探测信号，账本侧记录结果）；失败则：

1. 若配置 `provider.fallback = ["codex","pi"]`，且本次既无显式 `--provider`、也无 Thread/Posting override → 试下一个
2. 否则不创建 Session；Claim 释放或进入 RetryQueued，并进入 Inbox；关联 Issue 业务状态不自动变化

---

## 7. 多引擎执行组合

| 模式 | 阶段 | 说明 |
|------|------|------|
| 单 Member 单引擎 | Project Chat 完整闭环 | 默认 |
| 同队多 Member 异引擎 | Project Chat 完整闭环 | builder≠verifier 可绑不同 provider_id（各开各的 acpx session） |
| WorkflowRun 每步不同引擎 | Project Chat 完整闭环 | Step.owner_member → Posting/Member.provider |
| Run 内并行多引擎 | M5 swarm | 多 Session 各 provider；汇总步另一引擎 |
| 一 Session 内热切换引擎 | **禁止** | |

**反模式（易误解）：**

- ❌ 多 Member **共用一个 Session / 同一 transcript** 交替说话，或 Inner 中途换 SOUL 假扮另一 Member
- ✅ 多 Member **使用同一 `provider` 注册 id**（如都用 `pi`），但 **各开各的 acpx session**（不同 `sessionKey`）

详见主轴 §6.4.5「易误解说明」与 [`collab.md`](./collab.md) §1.1。

---

## 8. 成本

| 来源 | 处理 |
|------|------|
| acpx `status.breakdown` / `status.cost` → `cost.sample` | 累加到 Thread / Issue(若有) / Team / provider_id |
| 无 cost 事件 | 记 `unknown`；可用 turn 数作弱代理（UI 标明估算） |
| 账单 | `hearth cost --provider pi --team app-dev` |

acpx `AcpRuntimeUsageBreakdown` 字段全部可选，缺失按 `unknown` 处理，不按 `0`。

---

## 9. 存储布局

```text
~/.hearth/
  providers/
    pi.toml
    codex.toml
  config.toml            # [provider] default / fallback / on_unhealthy
  sessions/<id>.json     # 含 provider_id 快照（账本侧摘要）

<project db>/
  hearth.db              # 核心账本：Session 映射 + 权威状态
  hearth.db.acpx.db      # acpx AcpSessionStore：AcpSessionRecord（恢复用，分库）
```

**分库理由（Issue 03）：** acpx `AcpSessionRecord` 是 transport 私有恢复记录，不是业务真相；存独立库避免污染核心账本，也让 acpx 的 record schema 演进不牵动领域迁移。

---

## 10. Provider 验收

- [ ] 至少注册 **1** 个 Provider；health/doctor 可用
- [ ] `hearth run` 解析到 Member.provider 或 default
- [ ] `--provider` 覆盖 Member 默认并写入 Session
- [ ] LoopState turn/tool/exit 可观察（经 acpx 归一化事件）
- [ ] （后续）tool 映射后 L0 动作在副作用发生前走 T2 Approval；当前闭环不设该门（ADR 0006 §4）
- [ ] 不健康时不创建 Session；Claim 释放/重试，执行 attention 出现在 Board/Inbox；关联 Issue.status 保持不变；无静默改绑（无 fallback 时）
- [ ] Hearth Session 与 acpx record 一一对应；重放同一命令不创建第二条 ACP Session
- [ ] （可选）第二个 Provider（Codex）注册并能 `--provider` 切换跑通

---

## 11. 与开源的关系

| 参考 | 用什么 |
|------|--------|
| **acpx** | **直接复用 `acpx/runtime` 作为 Provider transport**（ACP 会话、进程、cancel、规范化事件）；见 ADR 0006 |
| Paseo | Provider 注册与生命周期思路 |
| Pi | 薄 harness、ACP adapter（经 acpx 内置 `pi` agent 接入） |
| Omnigent | capabilities 矩阵；**单一 policy evaluate**（主轴 §6.7 / §8.6） |
| Clowder | 多 CLI 并存、跨 model 互审纪律 |
| Codeg | ACP 连接与委托旁路（账本仍在 Hearth） |
| LifeOS | **不**采用「寄生单一 harness hooks 为唯一心脏」 |

### 11.1 Policy 单点（后续目标）

Policy 单点是**后续 issue 的目标**（Posting → Issue 11，Approval → Issue 27），当前闭环不实现。目标形态：

```text
Adapter 路径上（未来）：
  tool 即将产生副作用
    → Daemon.evaluate(action_id, session, path, turn_mode, …)
    → allow | approval_required | deny
  禁止：Adapter 内本地 YOLO / skip-permissions 默认放行

当前闭环：不实现该 evaluate。acpx permissionMode=approve-all，
          Pi 工具直接执行，Hearth 不裁剪工具面、不拦路径（见 ADR 0006 §4）。
```

未来实现该 evaluate 时，强制点不应依赖单一 Provider 特性（如 Pi 专属 launcher），而应放在 acpx client fs 委托或统一 policy gate。

### 11.2 Conformance 最小清单

与 §10 验收同一集合；后段可自动化为 suite（**非**聚合根）。Pi 与 Codex 两个真实 adapter 使 Provider seam 成立（ADR 0005 §2）。全量竞品定位见 [`analysis-synthesis.md`](./analysis-synthesis.md)。
