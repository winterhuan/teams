# Gold-Band 深度分析

> 研究对象：[`diodeme/Gold-Band`](https://github.com/diodeme/Gold-Band)  
> 研究日期：2026-07-12  
> 来源约束：仅使用上游 README、文档、源码、commit / release 记录与 GitHub API；重要事实尽量链接到固定 commit permalink。  
> 分析视角：Hearth M0.5（Project 中心、chat-first）的竞品/架构参考。

| 项目 | 值 |
|---|---|
| 分析版本 | `main@ae5af4d`（2026-07-10） |
| 最新 Release | `v0.8.0`（2026-07-10） |
| 许可证 | AGPL-3.0-only |
| 技术栈 | Rust 2024 · Tauri 2 · React 19 · TypeScript · SQLite · ACP 0.11.1 |
| 上游状态 | 2026-03-30 创建；分析时 25 stars / 3 forks / 1 open issue |
| 一手材料 | [README](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/README.md) · [产品概览](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/product/overview.md) · [`src/**`](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/src) · [`src-tauri/**`](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/src-tauri) · [GitHub API](https://api.github.com/repos/diodeme/Gold-Band) · [Releases](https://github.com/diodeme/Gold-Band/releases) |

## 摘要

**Gold Band 是一个本地优先的 AI Coding 工作流 runtime 与桌面客户端：它通过 ACP 调起本地 Agent，把一次长程需求拆成 `task → run → round → node → attempt`，由确定性 runtime 掌管状态迁移、失败回环、人工介入、产物合约和恢复，而把具体推理与工具执行交给 Claude Code、Codex 等 Agent。**

它对 Hearth 最有价值的不是“多 Agent 聊天”，而是三组更底层的 runtime 契约：

1. **控制面与执行面分离**：Agent 只能提交结构化 proposal / result，runtime 负责校验、实体化和 canonical state。
2. **完成不等于 Agent 自报 completed**：终局由状态、Artifact 和 verifier / acceptance 联合决定。
3. **把长程执行当作可恢复账本**：独立保存 run / round / node / attempt、ACP 事件、附件、产物与错误。

同时，Gold Band 的产品语义与 Hearth 存在明显边界：它是 **workflow / step-first 的 coding harness**，而不是以 Project、Posting、Thread 和耐久 Artifact 为中心的个人 Agent OS。上游 `README` 已将“会话模式”列为主路径，但较早的产品概览仍明说“step-first，而不是 chat-first”。这不能粗暴地当作当前产品定位，更准确的判断是：**v0.8 正在用 chat-like UI 承载 workflow runtime，但 canonical domain 仍是 step-first。**

---

## 1. 研究方法与证据标记

- **【源码事实】**：可直接从固定 commit 下的代码、测试或配置确认。
- **【文档事实】**：上游 README / 设计文档明示声明，但可能滞后于实现。
- **【推断】**：基于代码结构与产品行为的分析，不是上游明言。
- 文档与源码冲突时，以 `main@ae5af4d` 源码与测试为主，并显式记录文档漂移。

---

## 2. 项目定位与坐标

### 2.1 Gold Band 是什么

【文档事实】上游把 Gold Band 定义为“本地优先的 AI Coding 工作流桌面客户端”，通过 Agent Client Protocol（ACP）调起本地 Agent，把长程任务变成可编排、可观测、可验证、可恢复的运行过程。

来源：[README](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/README.md)

更精确地说，它同时包含四层：

| 层 | 作用 |
|---|---|
| **Desktop / Web UI** | 会话首页、工作流画布、运行详情、上下文与 Agent 管理 |
| **Application orchestration** | 创建 task/run、推进 node、恢复/停止、通知与 ViewModel |
| **Deterministic runtime** | 状态机、edge、round、attempt、Artifact contract、恢复边界 |
| **Provider/ACP execution** | 调起 Claude Code、Codex 等 Agent，统一 session/update、permission 与结果 |

### 2.2 它解决的问题

Gold Band 认为长程 Agent 工作的主要失败点不是模型不会写代码，而是：

- 主会话忘记原始编排或跳过验证
- 执行者与裁判是同一个 Agent
- profile、rules、skills、MCP 和修复提示分散
- 没有 run/round/node/attempt，失败无法精确定位和恢复
- Agent 自报 `completed` 被误当作业务完成

它的回答是：

> **控制面确定化，执行面交给 Agent；完成判断基于状态、产物和验证，而不是只听 Agent 自述。**

### 2.3 是 / 不是

| Gold Band 是 | Gold Band 不是 |
|---|---|
| 本地 workflow runtime + 桌面壳 | 单纯聊天 UI |
| ACP-first 多 Agent harness | 自研 LLM / ReAct 内核 |
| 长程任务执行账本 | 通用项目管理 SaaS |
| 显式 workflow + 动态 AI-DYNAMIC | 只靠 system prompt 的“自动编排” |
| Artifact contract 与 acceptance runtime | 仅保存 transcript 的会话浏览器 |
| 文件账本为权威、SQLite 为索引 | 数据库中心的多租户平台 |

### 2.4 与相邻项目的坐标

```text
Nezha       Project × Task × Terminal/Git 的轻量 Agent IDE
Codeg       多 Provider 会话聚合、ACP 委托、Automation 工作台
Paseo       Daemon、Provider、Timeline、Agent 生命周期控制面
Symphony    Issue 拉取、workspace 隔离、无人值守 coding worker
Gold Band   Workflow runtime、Artifact contract、验证回环、AI 动态调度
Hearth      Project 中心的个人 Agent OS，域账本 + Team/Posting + Artifact
```

**【推断】Gold Band 最像 Hearth 的“执行内核研究样本”，而不是完整产品参考。** 它对 runtime、Loop、Acceptance 和 Provider 边界的细化程度，明显高于它对 Project、Team、长期 Artifact 和个人知识面的建模。

---

## 3. 整体架构

### 3.1 代码结构

| 路径 | 职责 |
|---|---|
| `src/domain` | status/outcome/session 等稳定领域枚举 |
| `src/dsl` | workflow DSL、节点/边、schema 与静态校验 |
| `src/runtime` | task/run/round/node/attempt 状态文件与运行规则 |
| `src/control` | 根据 outcome 选择 edge、打开新 round、预算限制 |
| `src/app` | orchestrator、node executor、profile、状态访问、通知 |
| `src/dynamic` | AI-DYNAMIC proposal、fan-out、merge、acceptance、worktree |
| `src/provider` | runtime-facing Provider contract、prompt bundle、doctor |
| `src/acp` | ACP adapter、session event、permission、elicitation、连接复用 |
| `src/artifacts` | 控制 Artifact 的提取、JSON span、解析与展示标注 |
| `src/storage` | 文件写入、timeline、SQLite FTS 派生索引 |
| `src/observability` | run events、raw frames、diagnostics、retention |
| `src/skill` / `src/mcp` | 多 Agent Skill 与 MCP 管理 |
| `src/console` / `src/cli` | 同一 runtime 的终端交互壳 |
| `src-tauri` | Desktop command、状态、通知、channel/updater |
| `web` | React 19 会话/工作流/上下文/Agent 管理 UI |

来源：[源码树](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/src)、[Desktop](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/src-tauri)、[Web](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/web)

### 3.2 运行拓扑

```text
React/Tauri Desktop ── commands/events ──► Gold Band App
                                              │
                         ┌────────────────────┼──────────────────┐
                         ▼                    ▼                  ▼
                   Runtime/Control       Provider Adapter    Storage
                         │                    │                  │
                   Workflow graph           ACP              Files
                   AI-DYNAMIC graph     Claude/Codex/...    SQLite FTS
                         │                    │
                         └──── canonical result/artifact ───────┘
```

### 3.3 核心架构原则

从 README、设计文档和代码可以提炼出八条：

1. **runtime 拥有控制流，Agent 只执行或提 proposal**
2. **status 与 outcome 分离**
3. **业务 failure 与运行异常分离**
4. **文件状态是 canonical，SQLite/前端都是投影**
5. **Artifact 由 contract 命名和校验，不猜模型文件名**
6. **Provider 差异隔离在 adapter/ACP 边界**
7. **AI 动态路由必须 schema + 语义校验后才能 materialize**
8. **观测材料不能反向成为控制真相**

来源：[Runtime overview](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/runtime/overview.md)、[Provider overview](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/provider/overview.md)

---

## 4. 核心域模型

### 4.1 对象层级

```text
workspace
  └─ task
      └─ run
          └─ round
              └─ node
                  └─ attempt
                      ├─ ACP session/timeline/raw
                      ├─ artifacts
                      ├─ attachments
                      └─ worker-ref
```

| 对象 | 含义 | 生命周期 |
|---|---|---|
| **workspace** | 本地项目目录，Provider 的执行根 | 长期 |
| **task** | 一次需求/目标 | 长期保存，可多次 run |
| **run** | 对 task 发起的一次执行 | 一次完整执行 |
| **round** | run 内的一轮工作流；accept failure 可开新 round | run 内循环 |
| **node** | workflow 的一次 Agent 或复合执行单元 | round 内图节点 |
| **attempt** | 节点的一次尝试 | retry/回环产生新 attempt |
| **artifact** | 有输出契约的规范化节点产物 | attempt 所有 |
| **attachment** | 用户/Agent 自由文件 | 输入或过程材料 |
| **worker-ref** | Provider 原生 session 的可继续/打开引用 | attempt 附属 |

### 4.2 Status / Outcome 双轴

【源码事实】`src/domain/mod.rs` 明确把生命周期和终局结果拆开：

```text
RunStatus: running | paused | completed
RunOutcome: success | failure | killed

NodeOutcome: success | failure | invalid | killed
```

约束：

- `status != completed` 时 outcome 必须为空
- `paused` 不是 outcome
- `failure` 是业务目标未达成
- `invalid` 是输出不满足最小 contract
- provider/auth/quota/IO/transport 异常不能写成业务 failure

来源：[domain/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/domain/mod.rs)、[Runtime control](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/runtime/control.md)

### 4.3 PauseReason

```text
process-interrupted
runtime-abnormal
error-blocked
waiting-for-user-input
permission-requested
```

这五类暂停代表完全不同的继续资格：

| 原因 | 能否直接 continue | 说明 |
|---|---|---|
| `process-interrupted` | 是 | 用户停止或进程中断，断点保留 |
| `runtime-abnormal` | 是 | IO/资源/ACP transport 等外部异常 |
| `waiting-for-user-input` | 需人输入/人工判定 | manual check 或 elicitation |
| `permission-requested` | 需决策 | ACP permission 闸门 |
| `error-blocked` | 否，需明确恢复计划 | DSL/invariant/proposal/Artifact 前提破坏 |

### 4.4 Task 不是 Conversation

【文档事实】Runtime 设计明确写道“顶层对象不是 conversation，而是 task”。会话只是 attempt 的 Provider 执行投影。

这避免了把聊天 transcript 升成业务账本：

- 一个 task 可有多次 run
- 一个 run 可有多 round
- 每个 node/attempt 可产生独立 ACP session
- session continue 不代表 Artifact 目录复用

### 4.5 Gold Band Artifact 的边界

Gold Band 的 Artifact 是 **节点控制与验收产物**，典型如：

- `review-result`
- `test-result`
- `accept-result`
- `dynamic-node-completion`

Artifact 可以声明 JSON schema 与 `success_condition`，runtime 从模型输出中提取结构化 JSON，校验后用于控制流。

【推断】它更接近 Hearth 的 **Closeout/Acceptance evidence + ArtifactVersion 产生记录**，而不是 Hearth Project 所有的耐久 Artifact。删除 task/run 后，Gold Band Artifact 没有独立于执行账本的产品身份。

来源：[artifacts/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/artifacts/mod.rs)

---

## 5. WORKFLOW 模式：确定性控制面

### 5.1 Workflow DSL

```json
{
  "version": "0.1",
  "id": "default-dev",
  "entry": "plan",
  "control": { "max_attempts": 3, "max_rounds": 2 },
  "nodes": [],
  "edges": []
}
```

节点当前主要有：

- `worker`
- `ai-dynamic`

保留节点：

- `$entry`
- `$end`
- `$new-round`

来源：[dsl/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/dsl/mod.rs)

### 5.2 默认开发流

```text
plan(manual check)
  → dev
  → review
      failure → dev
      success → test
  → test
      failure → dev
      success → accept
  → accept
      failure → $new-round
      success → cleanup
  → $end
```

这个流程的关键不是节点名称，而是：

- 实现、审查、测试、验收被拆为独立 Agent attempt
- failure edge 明确回到修复节点
- acceptance failure 开新 round，而不是无限复用当前上下文
- manual check 让人能追问，但只有点击成功/失败才推进 edge

### 5.3 Edge 决策

| 当前 NodeOutcome | runtime 行为 |
|---|---|
| success | 找 success edge；无 edge 隐式 run success |
| failure | 找 failure edge；无 edge隐式 run failure |
| invalid | 不走业务 edge；同 attempt 隐藏 repair，最多 3 次 |
| killed | run killed |
| None | run paused，保留当前 attempt |

### 5.4 Attempt 预算

`control.max_attempts` 只统计 failure 触发、且回到真实 worker 的修复跳转：

- 正常 success 前进不消耗
- schema invalid 的隐藏 repair 不消耗
- `test failure → dev` 消耗一次
- 修复后 `dev success → test` 不再额外消耗

这是比“最多跑 N 轮”更精确的 loop 预算语义。

### 5.5 New Round

`$new-round` 代表验收失败后的新一轮，不是 node retry：

- 使用同一 frozen workflow snapshot
- 可从 `$entry` 或指定 node 开始
- 入口节点看到稳定前缀 Artifact 与上轮触发原因
- 不把上一轮完整上下文无界塞进新一轮
- `max_rounds` 限制可开启的新 round 数

### 5.6 Manual Check

manual check 时：

- run/round/node 都 paused
- `manual_check_pending` 持久化到 node.json
- ACP 输入区仍可追问
- 普通追问不会推进 workflow
- 只有用户点击“成功/失败”才写 outcome 并走 edge
- 重启应用后按钮和输入能力可恢复

这是一种干净的“对话不等于控制命令”设计。

---

## 6. AI-DYNAMIC：受约束的动态编排

### 6.1 核心思想

AUTO 模式的外层 workflow 是：

```text
AI-DYNAMIC → $end
```

AI-DYNAMIC 是复合节点。Agent 不能直接修改 runtime 状态，只能输出 `dynamic-node-completion` proposal；runtime 负责：

1. JSON schema 校验
2. provider/model/profile/workflow/预算语义校验
3. 将 proposal 保存为 accepted/rejected 状态
4. materialize 为真实内部节点/边/group
5. 调度 ready 节点

来源：[AI-DYNAMIC 设计](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/dsl/nodes/ai-dynamic.md)、[dynamic.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/dynamic.rs)

### 6.2 Proposal 能力

V1 支持：

- `next.type=end`
- `next.type=single`
- `next.type=fanout`

内部节点类型包括：

- worker
- workflow invocation
- merge
- acceptance

### 6.3 Fan-out 与 Worktree

对于可写并行分支：

- 每支可创建独立 git worktree
- 分支完成后由 merge node 汇总
- acceptance node 验证合并结果
- 非 git workspace 会在建 worktree 前明确阻塞
- retry 会避免 branch collision

### 6.4 动态图的层级隔离

```text
outer attempt/
  dynamic/
    dynamic-run.json
    graph.json
    events.jsonl
    nodes/
    groups/
    proposals/
```

外层 round graph 只看到一个 `ai-dynamic` 复合节点；内部 graph 不污染外层 trace。内部 pause 会让外层复合节点 pause，continue 时由 runtime 委托到精确 inner locator。

### 6.5 Context 边界

Gold Band 对动态节点上下文做了相当细的约束：

- 当前节点 task 与 global goal 分开
- runtime 元信息放 hidden context
- 普通并行 worker 不能读取 sibling attachments
- merge/acceptance 可读取当前 group 分支证据
- nested fan-out 只继承父 group 出口摘要
- continue 必须引用 runtime 提供的可复用 session 列表
- continue 只复用 ACP 记忆，不继承来源节点业务任务

### 6.6 Proposal Repair

非法 proposal 不立即失败：

- schema 错误与业务图错误聚合返回
- 错误包含 `code/message/path/actual/expected/allowedValues/suggestion`
- hidden repair prompt 让同一 worker 修复
- 最多 3 次
- 耗尽后外层进入 `paused/error-blocked`

### 6.7 对 AI 自主性的态度

**【推断】Gold Band 的 AUTO 不是“让 Agent 当 Boss”，而是“让 Agent提图，runtime 当图数据库和裁判”。**

这比常见的“模型输出下一步，然后程序直接执行”安全得多：动态性在执行面，权威仍在控制面。

---

## 7. Provider 与 ACP

### 7.1 ACP-first

Gold Band 新运行路径优先使用 ACP-compatible adapter：

- Claude Code / `claude-agent-acp`
- Codex ACP
- Gemini ACP
- OpenCode 等兼容实现

旧 direct CLI / stream-json 只作为历史日志材料，不形成第二套主会话 UI。

### 7.2 Adapter Ownership Boundary

Provider adapter 分为两个契约：

| 接口 | 所有者 | 作用 |
|---|---|---|
| **A：runtime-facing** | runtime | describe、doctor、runWorker、open/continue |
| **B：implementation-facing** | provider | 消费 prompt bundle，映射 ACP/CLI/SDK |

runtime 不应知道 Provider stdout、transcript 和 resume 参数。

来源：[Provider adapter](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/provider/adapter.md)

### 7.3 Provider 能力

最小分级：

| Level | 能力 |
|---|---|
| L1 | describe / doctor / runWorker / result / worker-ref |
| L2 | continue/open session、能力声明 |
| L3 | ACP session event、tool/thought/plan/permission/terminal 可视化 |

### 7.4 Doctor 与能力缓存

Desktop 后台 doctor 定期刷新 `agent_diagnostics`：

- 是否安装
- command/环境是否可用
- configOptions / model / mode catalog
- supports system prompt / continue 等能力

workflow 启动前验证所有普通 worker、AI-DYNAMIC bootstrap 和 available agents。动态 proposal 不能猜模型值，只能使用 ACP catalog 返回的 `value`。

### 7.5 WorkerInvocation

Provider 输入包括：

- profile/profileContent
- requirement path/text
- adapter workspace / execution workspace / attempt dir
- output contract
- runtime context
- predecessors / new-round trigger
- system/hidden/user prompt sections
- session mode / continue ref
- permission / model
- attachments / cold artifacts
- MCP servers

它是一个很完整的 Provider 统一执行信封。

### 7.6 ACP Timeline 与 Raw Frame

- `acp.timeline.jsonl`：归一化 session/update，用于 UI
- `acp.raw.jsonl`：原始帧，用于排障
- `acp.diagnostics.jsonl`：initialize/RPC/adapter timing
- canonical workflow state 不从 timeline/raw 反推

### 7.7 Permission 与 Elicitation

Gold Band 通过 ACP 接收：

- permission request
- AskUserQuestion / elicitation
- 自定义输入
- response 与 replay

交互决策会持久化，恢复 session 时能继续显示/结算，而不是只存在于前端内存。

---

## 8. Prompt 与上下文管理

### 8.1 Prompt 分层

固定标准：

| Prompt | 内容 |
|---|---|
| system | role、历史、路径、文件规则、能力边界、预算、输出协议、repair |
| user | requirement、goal、当前 task、用户显式追问 |
| hidden | runtime locator、predecessor、附件索引、动态 group/预算/可用资源 |

### 8.2 模板集中管理

所有内置提示词位于：

```text
src/prompts/zh-CN/
src/prompts/en/
```

中英文目录结构必须一致，使用 Minijinja 渲染，不允许长 prompt 散落在代码里。

来源：[prompts](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/src/prompts)、[AGENTS](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/AGENTS.md)

### 8.3 四种 UserPromptRenderMode

```text
RequirementTask
WorkflowResume
RuntimeRepair
UserMessage
```

它防止“continue session 就把完整系统上下文重新注入”这种常见错误：

- workflow new/resume 注入 runtime context
- repair 只发送 repair prompt
- 用户普通追问只发原文

### 8.4 Predecessor Context

节点不是拿整条 transcript，而是拿结构化前序：

- node/attempt/outcome
- output Artifact path + preview
- branch reason
- attachments
- new round trigger

这是一种比“拼接前面所有消息”更可控的上下文传递。

### 8.5 Profile、MCP 与 Skill

Gold Band 支持：

- 用户级 / workspace 级 profile
- 多 Agent MCP 管理
- stdio/SSE managed server
- builtin MCP injection
- `.agents/skills` 到不同 Agent skills 目录的同步/软链
- Skill 多实例、workspace 记忆和过滤

【推断】这些属于“执行上下文资产”，尚未形成 Hearth 那种 Team 基座 + Posting 切片 + 成长记忆模型。

---

## 9. Storage、Artifact 与可观测性

### 9.1 文件账本

默认层级：

```text
~/.gold-band/projects/<project-id>/
  tasks/<task-id>/
    task.json
    authoring/requirement.md
    runs/<run-id>/
      run.json
      workflow.snapshot.json
      rounds/<round-id>/
        round.json
        trace.jsonl
        nodes/<node-id>/attempt-001/
          node.json
          artifacts/
          attachments/
          acp.snapshot.json
          acp.timeline.jsonl
          acp.raw.jsonl
```

### 9.2 Canonical 与派生数据

| 数据 | 权威性 |
|---|---|
| task/run/round/node JSON | canonical state |
| workflow snapshot | 本 run 冻结控制合同 |
| Artifact | canonical output evidence |
| worker-ref | Provider continuation reference |
| ACP timeline | UI 观测投影 |
| raw frame/diagnostics | debug-only |
| SQLite | 可删除重建的搜索索引 |

### 9.3 SQLite FTS

SQLite 索引 task 和 session prompt：

- WAL + busy_timeout
- FTS5
- 文件写成功后才 best-effort 索引
- 失败最多三次，之后 warn 丢弃索引写
- DB 删除不影响恢复/详情
- 首次启动可从文件后台 backfill

来源：[storage/sqlite.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/storage/sqlite.rs)

### 9.4 并发写保护

并行 fan-out 会同时写 timeline/events。Gold Band 在 storage 层按 normalized path 串行化同一路径 append/roll/overwrite：

- 只锁同一文件 IO
- 不串行 worker/worktree/provider
- 防止 JSONL 行交错

这是多 Agent 本地 runtime 非常容易忽视的细节。

### 9.5 Observability

可观察材料包括：

- canonical state
- round trace
- run events
- progress snapshot
- ACP normalized timeline
- raw ACP frames
- dynamic scheduler events
- ACP RPC diagnostics
- token / elapsed / node execution metrics
- prompt/provider command debug log（配置开启）

关键原则：**diagnostics 解释状态，但不决定状态。**

---

## 10. Desktop / Web 产品体验

### 10.1 当前 IA

README 展示的主要表面：

- Workspace 选择
- Conversation Home
- Conversation Run
- Task / Run / Round 详情
- Workflow 管理和画布
- Run Mode 管理
- Context Management
- Agent Management
- Settings

### 10.2 Chat-like UI 与 Step-first 内核

v0.8 新增 conversational home、ACP 流式消息、composer、session sidebar 和附件预览。用户可以像 Agent IDE 一样发起需求和继续追问。

但业务真相仍是：

```text
task → run → round → node → attempt
```

Chat 是 attempt/session 的可视化，不是顶层聚合。

### 10.3 Workflow 画布

使用 React Flow + Dagre 展示：

- outer workflow
- AI-DYNAMIC 内部 graph
- fan-out/merge/acceptance
- 外层后继边连接到真实动态出口节点

### 10.4 Session 观测

UI 可查看：

- assistant/user message
- thought/tool/plan/permission/terminal
- system/hidden prompt
- raw frame
- Artifact / Attachment
- model/mode/permission/token/elapsed
- 不同 node/attempt session 切换

### 10.5 Intervention

- permission 与 AskUserQuestion 卡片
- manual check 成功/失败按钮
- 系统级通知/干预弹窗
- runtime abnormal continue
- error-blocked 诊断入口

### 10.6 产品风险

Gold Band 同时暴露 chat、workflow、round、node、attempt、raw、system prompt 和 diagnostics，容易把实现结构直接推给普通用户。上游也明确把 UI 体验列为持续打磨项。

---

## 11. 工程成熟度

### 11.1 规模

分析版本大约：

- Rust：6.6 万行
- Web TS/TSX：3.6 万行
- Rust `#[test]`：约 172
- Web 测试文件：54
- 合计约 226 个显式测试点/文件入口

### 11.2 强信号

- Windows/macOS/Linux Release + 签名资产
- Release Please 与 channelized updater
- Rust 2024、Tauri 2、React 19
- 大量 runtime/ACP/AI-DYNAMIC/恢复回归测试
- 设计文档、开发计划、源码同步要求明确
- Prompt 双语与结构同步规则
- 错误使用 typed structure，不把对客文案写死在后端
- 外部后台命令统一 helper，Windows 隐藏黑框
- canonical/observability/index 的边界非常清楚

### 11.3 测试覆盖的关键风险

测试文件直接覆盖：

- full MVP flow
- worker happy path / bootstrap
- acceptance loop
- control engine
- DSL validation
- AI-DYNAMIC node/fanout
- provider prompt bundle
- session token / ACP timing
- runtime layout
- Artifact explorer
- UI graph layout/performance
- session lifecycle / stop / continue / permission / elicitation
- skill/MCP 管理

### 11.4 Developer Preview 的真实含义

虽然工程规模不小，README 仍明确标记 Developer Preview，原因包括：

- AUTO/AI-DYNAMIC 仍快速演化
- Cursor/Gemini/OpenCode 兼容性不稳定
- runtime 生命周期仍在加固
- UI 行为变化快
- 暂不承诺生产 SLA

### 11.5 Changelog 信号

v0.8.0 的变更密度极高，集中在：

- ACP streaming/lifecycle/permission
- AI-DYNAMIC routing/worktree/acceptance
- conversation UI
- MCP/Skill
- token metrics
- updater/Windows compatibility

这说明项目活跃，也说明核心协议还未完全稳定。

---

## 12. 与 Hearth M0.5 的对象映射

| Gold Band | Hearth | 判断 |
|---|---|---|
| workspace | Project.root_path + M1 Workspace 投影 | 不等于 Hearth Project 全语义 |
| task | WorkItem / Issue | 高度接近，但 Gold Band 更 workflow-first |
| run | WorkItem 的一次执行 attempt 集合 | 可落入 Session chain/执行账本 |
| round | Loop 外层验收轮次 | 适合作为 LoopState/Run 内部对象 |
| node | pipeline Step / verifier stage | M3 WorkflowRun/Step |
| attempt | Session attempt | 应保留明确编号与恢复边界 |
| worker-ref | Session.provider_session_ref | 可直接吸收 |
| provider | Provider adapter | 高度接近，Gold Band ACP-first 更具体 |
| profile | Role prompt / Skill context | 不等于 Soul/Posting |
| Artifact | Acceptance/Closeout evidence | 不等于 Project 耐久 Artifact |
| attachment | Session/ArtifactVersion 输入输出文件 | 自由材料 |
| ACP session | Session transcript projection | 不等于 Thread |
| workflow snapshot | WorkItem/Run 冻结执行合同 | 强参考 |
| AI-DYNAMIC graph | pipeline/swarm 的运行时内部图 | 不应升为产品主导航 |

### 12.1 与 Hearth 九根的关系

| Hearth 根 | Gold Band 覆盖 |
|---|---|
| Daemon | 部分：runtime/App，但主要嵌在 Desktop/CLI 进程 |
| Team | 无 |
| Member/Soul | 无；只有 provider/profile |
| Provider | 强：ACP adapter、doctor、capability catalog |
| Project | 弱：workspace/path |
| Artifact | 部分：node output contract；缺耐久 Project 产品 |
| Session | 强：attempt + ACP session + worker-ref |
| WorkItem | 强：task/run/control |
| Approval | 部分：ACP permission/manual check/elicitation，尚非统一独立根 |

### 12.2 Posting

Gold Band 没有 Soul × Project Posting：

- profile 是 prompt 上下文
- provider 是执行器
- model/permission 是运行配置
- Skill/MCP 是 workspace/user 资产

这些可以组合成一次 invocation，但没有稳定的项目派驻身份、角色、记忆切片和 autonomy 生命周期。

### 12.3 Thread

Gold Band 的 conversation/session 是 attempt 级 ACP 会话；一个 task/run 可能跨多个 session。它没有一个跨 run、跨 node 的耐久 Thread 聚合。

这反而验证了 Hearth 的阶段边界：

- M1 用 WorkItem/Session 投影 Chat 可行
- 无 Issue Thread 与多人接力仍需独立设计
- 不应把 Provider session 直接当 Thread

### 12.4 Workspace

Gold Band 已实现的 workspace/worktree 比 Hearth M1 更接近 M3：

- workspace 执行目录
- fan-out 独立 worktree
- merge/acceptance
- capability preflight
- 恢复和清理

Hearth 可将它作为 M3 Workspace/WorkflowRun 的最强参考之一。

---

## 13. Hearth 应吸收的机制

### P0：直接进入合同

#### 1. Status / Outcome 分离

Hearth 已有 WorkItem FSM 与 Session LoopState，但应明确写入：

- paused 永远不是 failure
- runtime abnormal 不能驱动业务 failure edge
- invalid contract 与业务 failure 分开

#### 2. Frozen Workflow Snapshot

每次运行冻结：

- workflow
- profile resolution
- provider/model/permission
- output contract
- allowed dynamic workflows/agents

恢复与审计必须使用快照，不读最新 authoring 配置。

#### 3. Artifact Contract + Hidden Repair

对 verifier/acceptance 输出：

- schema
- success condition
- 固定 Artifact 名
- invalid 同 attempt 隐藏修复
- 修复耗尽进入 error-blocked

#### 4. Runtime Error 分类

建议 Hearth 对齐：

```text
process_interrupted
runtime_abnormal
error_blocked
waiting_for_user_input
permission_requested
```

#### 5. Canonical / Projection / Diagnostics 三分

- canonical：WorkItem/Session/Approval/Artifact 状态
- projection：UI timeline/chat
- diagnostics：raw provider frame、timing、debug prompt

### P1：M2/M3 吸收

#### 6. `task → run → round → node → attempt` 的内部编号

不要全升根，但应作为 WorkflowRun/Session 内部结构：

- run_id
- round_id
- node_id
- attempt_id

#### 7. New Round Context Slicing

验收失败新一轮只带：

- 稳定前缀产物
- 触发失败的最后节点原因
- 必要附件摘要

不复制整个上一轮上下文。

#### 8. 动态 Proposal Materialization

Swarm/AI 动态编排必须：

- Agent proposal
- JSON schema
- 业务约束校验
- accepted/rejected ledger
- runtime materialize

#### 9. Fan-out Worktree + Merge/Acceptance

这是 Hearth M3/M5 coding swarm 的直接实现参考。

#### 10. Provider Capability Catalog

Provider doctor 不只返回 available，还应返回：

- model values
- mode values
- system prompt support
- continue/open session
- MCP/permission/elicitation 能力

### P2：产品体验参考

#### 11. Chat 中折叠控制 JSON

控制输出从自然语言中抽取后，UI 折成单行控制条；用户默认看人话，需要时展开 JSON。

#### 12. Manual Check 允许追问但不推进

对 Hearth 的 Review/硬门非常合适。

#### 13. Intervention 与 Resume UI

不同 pause reason 应显示不同 CTA，而不是统一“继续”。

---

## 14. Hearth 不应照搬

| 不照搬 | 原因 |
|---|---|
| Step/workflow 成为顶层产品心智 | Hearth 当前基线是 Project/chat-first |
| 每个产物都归 attempt | Hearth Artifact 是 Project 所有的耐久产品 |
| profile 代替 Soul/Posting | 身份、角色、记忆、autonomy 生命周期不同 |
| Desktop 内嵌 runtime 作为最终权威 | Hearth 需要可 detach 的 Daemon |
| 让用户直接面对 run/round/node/attempt 全层级 | 默认 UI 应渐进披露，诊断时再下钻 |
| AUTO 默认成为所有任务入口 | 简单对话和单 Session 不应被 workflow 复杂化 |
| 把 ACP normalized session 当域事件 | ACP 是 Provider 观测，不是 WorkItem 真相 |
| Artifact 只服务 JSON 控制 | Hearth 还需 novel/image/video/app 等 medium |
| 当前 AGPL 代码直接进入闭源内核 | 可学机制/互操作，需注意许可证边界 |

---

## 15. 风险与局限

### 15.1 产品复杂度

Gold Band 同时服务：

- 快速会话
- 固定 workflow
- AUTO
- workflow authoring
- Agent/MCP/Skill/Profile 管理
- run/round/node/attempt 诊断

对普通用户的学习成本很高。

### 15.2 Runtime 状态空间

组合包括：

- outer workflow
- dynamic internal graph
- child workflow run
- ACP session lifecycle
- permission/elicitation
- stop/continue/retry/new round
- fan-out worktree/merge

状态爆炸风险真实存在，Changelog 中大量 lifecycle bug fix 正是证据。

### 15.3 Provider 兼容

虽然 ACP-first 降低差异，但：

- Agent 的 ACP 实现成熟度不同
- model/mode/config catalog 不一致
- system prompt/continue/session list 能力不齐
- Windows executable 与 npm shim 仍需大量特判

### 15.4 Artifact 解析

从自由文本中提取 JSON 的 repair 机制很实用，但依然脆弱：

- 模型可能输出多个 JSON 候选
- fenced/raw/nested span 复杂
- JSON 合法不代表业务 proposal 合法
- UI 展示 span 与 Rust byte/JS UTF-16 索引需要转换

### 15.5 Desktop 权威

项目已有 app/CLI/runtime 共享库，但产品主路径仍是桌面进程。它对真正的关 UI 继续运行、跨设备控制和常驻 Daemon 的支持弱于 Paseo/Hearth 目标。

### 15.6 许可证

AGPL-3.0-only 对网络服务和衍生作品有强约束。Hearth 应优先：

- 学习协议和设计
- 通过 ACP/CLI 互操作
- 避免直接复制实现进入不兼容许可代码库

---

## 16. 综合评价

### 16.1 最强之处

1. **真正把 long-running Agent 当 runtime 问题处理**
2. **status/outcome/error 三分清楚**
3. **Artifact contract 和 acceptance 进入控制流**
4. **AI-DYNAMIC 保持 runtime 权威**
5. **Provider/ACP 边界细致**
6. **文件账本、索引、观测材料分层成熟**
7. **fan-out/worktree/merge/acceptance 已落实现与测试**
8. **文档对恢复、prompt、并发、错误有规范级说明**

### 16.2 最弱之处

1. Project 只是 workspace/path
2. 没有 Team/Soul/Posting
3. 没有耐久 Thread
4. Artifact 仍是 attempt output，不是长期产品
5. UI 暴露过多 runtime 复杂度
6. Developer Preview 的核心生命周期仍快速变化
7. Daemon/detach 能力不够明确

### 16.3 对 Hearth 的结论

**Gold Band 应被纳入 Hearth 的“Runtime Control / Loop / WorkflowRun / Provider / Acceptance”第一梯队参考，但不应成为产品 IA 或域模型的主参考。**

最合理的装配位置：

```text
Hearth Project/chat-first 产品面
  └─ WorkItem / Session / Approval / Artifact 域账本
      └─ Gold Band 式 deterministic runtime
          ├─ frozen workflow
          ├─ run/round/node/attempt
          ├─ Artifact contract
          ├─ error/pause/recovery
          ├─ ACP Provider adapter
          └─ constrained AI-DYNAMIC
```

### 16.4 一句话收束

**Gold Band 是一个少见的、认真处理“Agent 长程执行为什么会失控”的本地 runtime：它不把更长 prompt 当答案，而是用状态账本、Artifact 合约、独立验证、错误分类、恢复断点和受约束动态调度建立行为下限。Hearth 应吸收它的执行内核思想，同时坚持 Project、Posting、Thread 与耐久 Artifact 的更高层产品模型。**

---

## 17. 关键源码与文档索引

| 主题 | 一手来源 |
|---|---|
| 产品定位 | [README](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/README.md) |
| 项目开发规则 | [AGENTS.md](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/AGENTS.md) |
| Runtime 总览 | [runtime/overview.md](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/runtime/overview.md) |
| Runtime 控制 | [runtime/control.md](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/runtime/control.md) |
| 目录布局 | [runtime/layout.md](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/runtime/layout.md) |
| Domain 枚举 | [domain/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/domain/mod.rs) |
| Workflow DSL | [dsl/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/dsl/mod.rs) |
| Runtime 实现 | [runtime/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/runtime/mod.rs) |
| Control engine | [control/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/control/mod.rs) |
| App orchestrator | [app/orchestrator.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/app/orchestrator.rs) |
| Node executor | [app/node_executor.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/app/node_executor.rs) |
| AI-DYNAMIC | [dynamic.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/dynamic.rs) · [设计文档](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/dsl/nodes/ai-dynamic.md) |
| Provider overview | [provider/overview.md](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/provider/overview.md) |
| Provider adapter | [provider/adapter.md](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/docs/gold-band/%E4%BA%A7%E5%93%81%E8%AE%BE%E8%AE%A1%E6%96%87%E6%A1%A3/provider/adapter.md) |
| Provider contract | [provider/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/provider/mod.rs) |
| ACP adapter | [acp/adapter.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/acp/adapter.rs) |
| Artifact 解析 | [artifacts/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/artifacts/mod.rs) |
| 文件存储 | [storage/mod.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/storage/mod.rs) |
| SQLite FTS | [storage/sqlite.rs](https://github.com/diodeme/Gold-Band/blob/ae5af4d425b25b742617ccb179d0f45de0782367/src/storage/sqlite.rs) |
| Prompt 模板 | [src/prompts](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/src/prompts) |
| Web UI | [web/src](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/web/src) |
| 测试 | [tests](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/tests) · [web/tests](https://github.com/diodeme/Gold-Band/tree/ae5af4d425b25b742617ccb179d0f45de0782367/web/tests) |
| 最新发布 | [v0.8.0](https://github.com/diodeme/Gold-Band/releases/tag/v0.8.0) |
