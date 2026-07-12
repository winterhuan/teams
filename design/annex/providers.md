# 附录 — Provider 多引擎适配

> **隶属：** [`../personal-agent-os.md`](../personal-agent-os.md) §6.4.5 / §6.10  
> **范围：** Provider 注册、契约与多 Member 异引擎均属于 **Project Chat 完整闭环**  
> **原则：** Daemon 管账；Provider 推理；适配器薄；禁止为某一 harness 定制内核  

---

## 1. 在架构中的位置

```text
hearthd
  ├── Provider Registry     # 已注册引擎 + health
  ├── Project / Artifact    # 产物归属（账本侧）
  ├── Thread / Issue / Team # 执行线 + 业务追踪 + 编制
  └── Session
        provider_id ──► Adapter(transport)
                              │
                              ▼
                    Pi / Claude Code / Codex / …
                    （本机进程或 ACP 连接）
```

| 谁 | 做什么 | 不做什么 |
|----|--------|----------|
| Daemon | 解析 provider、建 Session、LoopState、Approval、预算、Timeline | 不实现完整 ReAct 语义 |
| Adapter | 把统一契约落到具体 CLI/ACP；tool 名映射 `action_id` | 不绕过 Approval |
| Provider 进程 | LLM + 原生 tools | 不知道 Issue FSM / Claim 生命周期 |

---

## 2. 注册文件 schema

路径：`~/.hearth/providers/<id>.toml`（或 `.yaml`；一种即可，Project Chat 完整闭环钉 **toml**）。

```toml
# ~/.hearth/providers/pi.toml
id = "pi"
display_name = "Pi"
enabled = true

# 适配方式（按优先级实现；见 §3）
transport = "acp"              # acp | cli_json | cli_text | thin_drive
command = "pi"
args = ["--acp"]               # 示意；以真实 CLI 为准
# endpoint = "stdio"           # acp 时

# 能力声明（Daemon 用于路由与降级，非营销字段）
[capabilities]
native_multi_turn = true       # 无 user 插话也能连跑 tool turn
structured_events = true       # 能推 turn/tool 事件
cost_events = false            # 是否上报 token/费用
cancel = true
pre_tool_gate = true           # 是否能在 tool 副作用前同步请求 Daemon 授权

# 原生 tool → Hearth action_id（可只写差异项；未映射默认 L0）
[tool_map]
"bash" = "shell.run"
"read_file" = "fs.read"
"write_file" = "fs.write"
"edit_file" = "fs.edit"
```

```toml
# ~/.hearth/providers/claude.toml（示意）
id = "claude"
display_name = "Claude Code"
enabled = true
transport = "cli_json"
command = "claude"
args = ["-p", "--output-format", "json"]   # 示意

[capabilities]
native_multi_turn = true
structured_events = true
cost_events = true
cancel = true
```

```toml
# ~/.hearth/providers/codex.toml（示意）
id = "codex"
display_name = "Codex"
enabled = true
transport = "cli_json"
command = "codex"

[capabilities]
native_multi_turn = true
structured_events = false
cost_events = false
cancel = true
```

**注册命令：**

```text
hearth provider add <id> --command … [--transport acp|cli_json|…]
hearth provider ls
hearth provider show <id>
hearth provider health [<id>]
hearth provider disable|enable <id>
```

`provider add` 写入 registry；**不**自动改 Member 绑定。

---

## 3. 传输层优先级（实现顺序）

| 优先级 | transport | 说明 |
|--------|-----------|------|
| 1 | `acp` | Agent Client Protocol / 等价 RPC；首选 |
| 2 | `cli_json` | headless + 结构化 stdout（jsonl/json） |
| 3 | `cli_text` | 可解析的纯文本协议 |
| 4 | `thin_drive` | 仅单次 prompt API：Daemon 按 checkpoint 再喂 user |
| 避免 | PTY 刮取 | 仅实验/最后手段；不得作为完整闭环默认路径 |

**thin_drive 语义：** 仍是一条 Session、同一 `provider_id`；每次外驱 = 内环一 turn 的近似；LoopState.turn 由 Daemon 递增。

---

## 4. 统一适配器契约（规范）

```text
// session_spec（Daemon → Adapter.start）
{
  session_id,                 // Daemon 已分配
  thread_id, issue_id?, team_id, member_id,
  cwd,
  goal / brief,               // 用户目标或步 brief
  soul_path?,                 // Member SOUL 注入
  tools_allow / tools_deny,   // 控制面策略；Adapter 须强制或映射
  loop: { max_turns, budget, policy },
  working_checkpoint?,        // 重试/续跑
  extra?: { model?, env? }    // 引擎私有，不进域模型
}

Adapter:
  start(session_spec) -> { ok, native_handle? }
  send(session_id, message)   // user / nudge / 审批后续
  events(session_id) -> stream<ProviderEvent>
  cancel(session_id)
  health() -> { ok, detail?, version? }
```

### 4.1 ProviderEvent（最小）

| type | 含义 | 驱动 |
|------|------|------|
| `turn.started` / `turn.ended` | 轮次 | LoopState.turn、Timeline `loop.turn` |
| `tool.started` / `tool.ended` | 工具调用 | last_tool；须在执行前过 Daemon autonomy 门或等价强制门 |
| `checkpoint` | 工作记忆一行/短文 | working_checkpoint |
| `assistant.delta` / `assistant.message` | 可见输出 | journal / UI |
| `cost` | tokens / usd | 成本账（可选） |
| `exit` | 结束 | `exit_reason` + T1 |
| `error` | 不可恢复错误 | 常映射 `exit_reason=error` |

**拦截模型：**

- 若 transport 支持 **tool 前同步门**：Adapter 在执行前问 Daemon `authorize(action_id, path?)` → allow | approval | deny。  
- 若 transport 不支持同步门（`capabilities.pre_tool_gate=false`），必须由执行前的等价机制强制治理，例如受控工具 wrapper、代理或只暴露无需审批动作的 sandbox/allowlist。  
- 若同步门和等价强制机制均不可用，Adapter **不得向该 Session 暴露可能映射为 L0 的工具**；无法裁剪工具面时拒绝启动，并让关联 Issue 浮现为 `blocked`（`reason=governance_unenforceable`），释放 Claim。  
- 事后 `tool.*` 事件只用于审计和状态同步，**不得**作为 L0 授权；任何 L0 动作都必须在副作用发生前已有对应的 `Approval.status=granted`，初次授权检查不得对 L0 自动返回 `allow`。

---

## 5. tool → action_id

1. 查 `providers/<id>.toml` 的 `[tool_map]`  
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

Session **启动后** `provider_id` **不可变**。换引擎 = 新 Session（计 attempt 或人显式 restart）。

**健康：** Session owner（Thread turn 或 Workflow attempt）持久化后、Session `start` 前执行 `health()`；失败则：

1. 若配置 `provider.fallback = ["codex","pi"]`，且本次既无显式 `--provider`、也无 Thread/Posting override → 试下一个  
2. 否则不创建 Session；Claim 释放或进入 RetryQueued，并进入 Inbox；关联 Issue 业务状态不自动变化

---

## 7. 多引擎执行组合

| 模式 | 阶段 | 说明 |
|------|------|------|
| 单 Member 单引擎 | Project Chat 完整闭环 | 默认 |
| 同队多 Member 异引擎 | Project Chat 完整闭环 | builder≠verifier 可绑不同 provider_id |
| WorkflowRun 每步不同引擎 | Project Chat 完整闭环 | Step.owner_member → Posting/Member.provider |
| Run 内并行多引擎 | M5 swarm | 多 Session 各 provider；汇总步另一引擎 |
| 一 Session 内热切换引擎 | **禁止** | |

**反模式（易误解）：**

- ❌ 多 Member **共用一个 Session / 同一 transcript** 交替说话，或 Inner 中途换 SOUL 假扮另一 Member  
- ✅ 多 Member **使用同一 `provider` 注册 id**（如都用 `claude`），但 **各开各的 Session**  

详见主轴 §6.4.5「易误解说明」与 [`collab.md`](./collab.md) §1.1。

---

## 8. 成本

| 来源 | 处理 |
|------|------|
| `ProviderEvent.cost` | 累加到 Thread / Issue(若有) / Team / provider_id |
| 无 cost 事件 | 记 `unknown`；可用 turn 数作弱代理（UI 标明估算） |
| 账单 | `hearth cost --provider pi --team app-dev` |

---

## 9. 存储布局

```text
~/.hearth/
  providers/
    pi.toml
    claude.toml
    codex.toml
  config.toml          # [provider] default / fallback / on_unhealthy
  sessions/<id>.json   # 含 provider_id 快照
```

---

## 10. Provider 验收

- [ ] 至少注册 **1** 个 Provider；`health` 可用  
- [ ] `hearth run` 解析到 Member.provider 或 default  
- [ ] `--provider` 覆盖 Member 默认并写入 Session  
- [ ] LoopState turn/checkpoint/exit 可观察（任一 transport）  
- [ ] tool 映射后 L0 动作在副作用发生前走 T2 Approval；无同步门时由等价强制门拦截，否则工具不可用  
- [ ] 不健康时不创建 Session；Claim 释放/重试，关联 Issue 默认 blocked 并出现在 Inbox；无静默改绑（无 fallback 时）  
- [ ] （可选）第二个 Provider 注册并能 `--provider` 切换跑通  

---

## 11. 与开源的关系

| 参考 | 用什么 |
|------|--------|
| Paseo | Provider 注册与生命周期思路 |
| Pi / acpx | 薄 harness、ACP、conformance 思想 |
| Omnigent | capabilities 矩阵；**单一 policy evaluate**（主轴 §6.7 / §8.6） |
| Clowder | 多 CLI 并存、跨 model 互审纪律 |
| Codeg | ACP 连接与委托旁路（账本仍在 Hearth） |
| LifeOS | **不**采用「寄生单一 harness hooks 为唯一心脏」 |

### 11.1 Policy 单点（M0.2.14）

```text
Adapter 路径上：
  tool 即将产生副作用
    → Daemon.evaluate(action_id, session, path, turn_mode, …)
    → allow | approval_required | deny
  禁止：Adapter 内本地 YOLO / skip-permissions 默认放行
```

与 `capabilities.pre_tool_gate`：能同步问 Daemon 则用同步门；否则等价强制门或禁用 tool。

### 11.2 Conformance 最小清单

与 §10 验收同一集合；后段可自动化为 suite（**非**聚合根）。全量竞品定位见 [`analysis-synthesis.md`](./analysis-synthesis.md)。
