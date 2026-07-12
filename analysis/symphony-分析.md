# Symphony 项目深度分析

> 分析对象：[`openai/symphony`](https://github.com/openai/symphony)  
> 维护方：**OpenAI**  
> 许可证：**Apache-2.0**  
> 状态：**Engineering Preview**（可信环境评测用；官方建议按 `SPEC.md` 自实现加固版）  
> 仓库状态：约 **25.9k★ / 2.6k forks**，创建于 2026-02-26，推送至 2026-06；~8 open issues；**无正式 Release**  
> 规范：根目录 `SPEC.md`（语言无关 Draft v1）  
> 参考实现：`elixir/`（OTP + Phoenix LiveView 可观测性）  
> 博文：https://openai.com/index/open-source-codex-orchestration-symphony/  
> 分析日期：2026-07-10

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**Symphony 把「监督 Coding Agent」升级为「管理待完成的工作」：长期运行的工单调度守护进程从 Linear 拉 issue，为每个 issue 建隔离 workspace，在其中启动 Codex App Server 自主实施，并以 CI / PR / Review / Walkthrough 等为工作证明。**

官方表述：

> *Symphony turns project work into isolated, autonomous implementation runs, allowing teams to manage work instead of supervising coding agents.*

### 1.2 与 Harness Engineering 的关系

Symphony **不是** Agent 的推理内核，也不是通用 multi-agent 框架。它假设代码库已按 [Harness Engineering](https://openai.com/index/harness-engineering/) 对 Agent 友好，然后补「组织层下一步」：

```txt
Harness Engineering（仓库可被 Agent 安全/高效操作）
        ↓
Symphony（从管理 Agent → 管理工单流）
        ↓
Codex App Server（执行层，真实写码）
```

### 1.3 是 / 不是（SPEC 边界）

| Symphony **是** | Symphony **不是** |
|-----------------|-------------------|
| 调度器 / Runner / Tracker **读取器** | 富 Web 多租户控制面（UI 可选） |
| 每工单隔离 workspace 的 daemon | 通用分布式工作流引擎 |
| 策略版本化在仓库 `WORKFLOW.md` | 内置改票/改 PR 的业务规则引擎 |
| 多并发 agent 的可观测运行时 | 强制统一审批/沙箱策略 |

**关键边界：**  
工单状态迁移、评论、贴 PR 链接等 **Tracker 写入** 通常由 **Coding Agent 用工具** 完成，而非 Orchestrator 内硬编码业务逻辑。成功往往意味着进入 **`Human Review` 等交接态**，不必是 `Done`。

### 1.4 两种落地路径

| 路径 | 说明 |
|------|------|
| **Option 1** | 让任意 coding agent 按 `SPEC.md` 用任意语言实现 |
| **Option 2** | 运行实验性 Elixir 参考实现（`elixir/`） |

这种「规范优先、实现可替换」是 Symphony 与多数开源 harness 的本质差异。

---

## 2. 系统架构

### 2.1 端到端数据流

```txt
Linear Project Board
    │  poll (default 30s; 参考实现示例 5s)
    ▼
┌─────────────────────────────────────────┐
│  Orchestrator (单一权威调度状态)          │
│  校验 WORKFLOW · 选候选 · 并发槽 · 重试   │
│  对账 / stall / 终止态清理                │
└──────────────┬──────────────────────────┘
               │ dispatch
               ▼
┌─────────────────────────────────────────┐
│  Workspace Manager                      │
│  root/<sanitized-identifier>/           │
│  hooks: after_create / before_run / …   │
└──────────────┬──────────────────────────┘
               │ launch
               ▼
┌─────────────────────────────────────────┐
│  Agent Runner                           │
│  bash -lc "codex app-server" in cwd     │
│  prompt ← WORKFLOW.md + issue Liquid    │
│  max_turns 内同 thread 续跑              │
└──────────────┬──────────────────────────┘
               │ agent tools (gh, linear_graphql, skills)
               ▼
        PR · CI · Review · land · Human Review / Done
```

### 2.2 组件分层（SPEC §3）

| 层 | 组件 | 职责 |
|----|------|------|
| **Policy** | `WORKFLOW.md` body | 团队 ticket 处理、验收、交接规则（版本化） |
| **Configuration** | Front matter → typed config | 默认值、`$ENV` 间接引用、路径规范化 |
| **Coordination** | Orchestrator | 轮询、资格、并发、重试、对账 |
| **Execution** | Workspace + Agent Runner | FS 生命周期、Codex app-server 协议 |
| **Integration** | Linear adapter | GraphQL 拉取与规范化（本版 `tracker.kind: linear`） |
| **Observability** | Logs + 可选 Status/HTTP | 结构化日志、snapshot、LiveView 看板 |

### 2.3 仓库布局

```txt
openai/symphony/
├── SPEC.md                 # 语言无关规范（主交付物）
├── README.md
├── LICENSE / NOTICE        # Apache-2.0
├── docs/                   # smoke 测试笔记
├── .codex/skills/          # commit / push / pull / land / linear / debug
├── .github/media/          # demo 视频与截图
└── elixir/                 # 参考实现
    ├── lib/symphony_elixir/
    │   ├── orchestrator.ex
    │   ├── agent_runner.ex
    │   ├── workspace.ex
    │   ├── workflow.ex / workflow_store.ex
    │   ├── config.ex / config/schema.ex
    │   ├── tracker.ex + linear/*
    │   ├── codex/app_server.ex / dynamic_tool.ex
    │   ├── prompt_builder.ex
    │   ├── ssh.ex              # 远程 worker
    │   └── status_dashboard.ex
    ├── lib/symphony_elixir_web/  # Phoenix LiveView + /api/v1/*
    ├── WORKFLOW.md             # 示例工作流（含 Rework/Human Review/Merging）
    ├── mix.exs → escript bin/symphony
    └── test/                   # 含 live e2e + Docker SSH workers
```

约 **105** 个 blob；语言以 **Elixir ~96%** 为主（参考实现），规范本身无语言绑定。

---

## 3. WORKFLOW.md：仓库内合同

### 3.1 格式

Markdown + 可选 YAML front matter：

- Front matter → `config`  
- 正文 → **Liquid 兼容** prompt 模板（未知变量/过滤器 **失败**，不静默）  
- 变量：`issue.*`、`attempt`（首次为 null；重试/续跑为整数）  

### 3.2 配置分区（摘要）

| 键 | 作用 | 典型默认 |
|----|------|----------|
| `tracker` | Linear endpoint / API key / project_slug / labels / active·terminal states | active: Todo, In Progress |
| `polling.interval_ms` | 轮询周期 | 30000 |
| `workspace.root` | 工单工作区根 | 系统 temp 下 |
| `hooks.*` | after_create / before_run / after_run / before_remove | 超时 60s |
| `agent.*` | 全局并发、max_turns、重试退避、按状态并发 | 10 / 20 / 5m |
| `codex.*` | app-server 命令、审批/沙箱、turn/read/stall 超时 | 见实现默认 |
| `server.port` | 可选 HTTP 看板（扩展） | 关闭 |

**环境变量不全局覆盖 YAML**；仅当值显式写 `$VAR` 时解析。  
**动态热加载 REQUIRED**：改 `WORKFLOW.md` 不重启服务即可影响后续调度；无效 reload 保留 last-good。

### 3.3 Hooks 语义

| Hook | 时机 | 失败 |
|------|------|------|
| `after_create` | **新建** workspace 一次 | **致命**（创建失败） |
| `before_run` | 每次 agent 尝试前 | **致命**（中止本次） |
| `after_run` | 每次尝试后（成功/失败/超时/取消） | 记日志忽略 |
| `before_remove` | 删除 workspace 前 | 记日志忽略 |

典型 `after_create`：`git clone … .` 填满空目录。

### 3.4 参考实现中的「真实工作流」

`elixir/WORKFLOW.md` 展示生产级策略（非 SPEC 强制）：

- 自定义 Linear 态：`Rework` / `Human Review` / `Merging`  
- 单一 `## Codex Workpad` 评论为进度真相源  
- 状态机：Todo→In Progress→…→Human Review→Merging→Done  
- 依赖 skills：`linear`、`commit`、`push`、`pull`、`land`  
- `codex.approval_policy: never` + `workspace-write` + 网络（示例偏高信任）  
- 明确：**无值守**、禁止「下一步请用户」；仅真阻塞才停  

这把 SPEC 的「策略在 repo」具象化成一套可复制的工程文化。

---

## 4. Orchestrator 状态机（核心）

### 4.1 内部 Claim 状态（≠ Linear 状态）

| 状态 | 含义 |
|------|------|
| Unclaimed | 未跑、无重试 |
| Claimed | 已预留，防重复派发 |
| Running | worker 在跑 |
| RetryQueued | 退避/续跑定时器 |
| Released | 终端/非 active/消失后释放 |
| **Blocked**（Elixir 扩展） | 需人工输入/审批/MCP elicitation；内存 map，重启清空 |

### 4.2 轮询 Tick

1. 对账 running（stall + Linear 状态）  
2. 配置 preflight  
3. 拉 active 候选  
4. 排序：priority↑ → created_at 旧→新 → identifier  
5. 有槽则 dispatch  
6. 通知 dashboard  

### 4.3 派发资格

- 有 id/identifier/title/state  
- active 且非 terminal  
- 通过 assignee 路由 + `required_labels`  
- 不在 running/claimed（及 blocked）  
- 全局 + 按状态并发槽可用  
- **Todo** 时若 blocker 非 terminal → **不派发**  

### 4.4 重试与续跑

| 场景 | 行为 |
|------|------|
| Worker 正常退出 | **1s continuation retry**（issue 仍 active 则再开 session） |
| 异常退出 | 指数退避 `min(10s * 2^(n-1), max_retry_backoff)` |
| Stall | 无事件超过 `stall_timeout_ms` → kill + 重试 |
| Terminal | 停 agent + **清理 workspace** |
| 非 active 非 terminal | 停 agent，**不**清理 workspace |

单 worker 内：`max_turns` 限制同 **thread** 上背靠背 turn；续 turn 只发 continuation，不重复整份 issue prompt。

### 4.5 无 DB 的恢复模型

- 调度状态 **纯内存**  
- 重启后：不恢复 timer/running；靠 **Linear 真相 + 磁盘 workspace 残留** 重新轮询  
- 启动时对 terminal issues **清理 stale workspaces**  

---

## 5. Workspace 与安全不变量

| 不变量 | 内容 |
|--------|------|
| **I1** | Codex 仅在 **per-issue workspace** 作为 cwd 启动 |
| **I2** | workspace path 必须是 `workspace.root` 的子路径 |
| **I3** | 目录名仅 `[A-Za-z0-9._-]`，其余替换为 `_` |

SPEC 不强制 Git 流程；填充策略由 hooks 定义。  
信任模型 **implementation-defined**：可从「高信任 auto-approve」到「严格审批+沙箱」；必须文档化。

---

## 6. Coding Agent 集成（Codex App Server）

### 6.1 启动契约

- 命令：`codex.command`（默认 `codex app-server`）  
- 调用：`bash -lc <command>`，cwd = workspace  
- 协议真相源：**目标 Codex 版本**的 app-server schema（`codex app-server generate-json-schema`）  
- Symphony 负责：workspace 选择、prompt 构造、continuation、可观测提取  

### 6.2 会话

- `session_id = thread_id-turn_id`  
- 同 worker 内复用 thread  
- 事件流：session_started / turn_* / approval / tool / stall…  
- 可选动态工具：**`linear_graphql`**（用 Symphony 配置的 Linear 凭据执行单操作 GraphQL，避免 agent 读盘 token）  

### 6.3 Elixir 参考实现的策略倾向

- 默认偏安全：`workspace-write` 沙箱 + reject 类 approval 对象默认（文档说明）  
- 示例 WORKFLOW 可用 `approval_policy: never`（**高信任**，仅可信环境）  
- **Blocked** 映射：`turn_input_required` / approval / MCP elicitation → 不无限挂起  
- 支持 **SSH workers** 多机派发（e2e 可用 Docker 起 disposable SSH worker）  

---

## 7. Elixir 参考实现要点

### 7.1 技术选型

| 项 | 选择 |
|----|------|
| 运行时 | Elixir 1.19 / OTP 28（mise） |
| 并发 | GenServer Orchestrator + Task.Supervisor |
| HTTP | Phoenix LiveView + Bandit |
| HTTP 客户端 | Req |
| YAML / 模板 | yaml_elixir · Solid（Liquid） |
| 交付 | `mix escript.build` → `./bin/symphony` |

FAQ 说明选 Elixir：OTP 监督长生命周期进程、热更新便于开发。

### 7.2 模块地图

| 模块 | 职责 |
|------|------|
| `Orchestrator` | 轮询、派发、重试、对账、token 汇总、blocked |
| `AgentRunner` | workspace + prompt + 启 Codex + 上报事件 |
| `Workspace` | 路径安全、hooks、远程 cleanup |
| `Workflow` / `WorkflowStore` | 解析与热加载 |
| `Config` | 类型化配置访问 |
| `Tracker` + `Linear.*` | GraphQL 适配 |
| `Codex.AppServer` | stdio 协议客户端 |
| `Codex.DynamicTool` | linear_graphql 等 |
| `PromptBuilder` | Solid 渲染 |
| `SSH` | 远程 worker 传输 |
| `StatusDashboard` / Web | 可观测 UI + JSON API |

### 7.3 可观测 HTTP（可选）

| 端点 | 作用 |
|------|------|
| `GET /` | LiveView 看板 |
| `GET /api/v1/state` | running / retrying / blocked / tokens |
| `GET /api/v1/<issue_id>` | 单 issue 调试详情 |
| `POST /api/v1/refresh` | 触发立即 poll+reconcile |

### 7.4 质量与测试

- `make all`：format、credo、coverage、dialyzer  
- mix.exs 对多核心模块 **coverage ignore**（原型取舍）  
- `make e2e`：真实 Linear 临时项目 + 真实 `codex app-server` + 可选 SSH/Docker workers  

### 7.5 配套 Skills（`.codex/skills`）

`commit` / `push` / `pull` / `land` / `linear` / `debug`——与 WORKFLOW 状态机（尤其 **Merging 必须走 land skill**）咬合。

---

## 8. 与本 monorepo 其他项目对照

| 维度 | **Symphony** | **ClawTeam** | **Clowder** | **GenericAgent** | **OpenHuman** |
|------|--------------|--------------|-------------|------------------|---------------|
| 层次 | L4 工单调度 | L2 CLI swarm | L4 团队平台 | L1 本机自进化 agent | L1–L3 个人 OS |
| 工作源 | **Linear** | 人类/agent CLI | 聊天/Mission Hub | 用户 prompt | 用户/通道 |
| 执行器 | **仅 Codex**（参考实现） | 任意 CLI | 多 CLI | 自有 loop | 自有 harness |
| 隔离 | **每 issue workspace** | git worktree | 线程+策略 | 本机全局 | 用户 workspace |
| 策略存放 | **WORKFLOW.md 版本化** | spawn 协议 | SOP/skills | memory SOP | 产品配置 |
| 规范形态 | **SPEC 可移植** | 产品代码即规范 | 产品代码 | 论文+代码 | 产品代码 |
| 许可 | Apache-2.0 | MIT | MIT | MIT | GPL-3.0 |

**一句话：** Symphony 管「**看板 → 隔离执行 → 交接**」；不替代 Clowder 的人格协作 UI，也不替代 ClawTeam 的多 CLI 编排，更不替代 GA 的本机全能执行。

### 设计模式视角

| Symphony 机制 | 近似模式 |
|---------------|----------|
| 每 issue 独立 run | Plan-and-Execute + 隔离执行 |
| WORKFLOW prompt | Prompt Chaining / Skill Package（策略即文档） |
| Human Review 态 | Approval Gate |
| Workspace sandbox | Blast Radius（有限） |
| Continuation / max_turns | Loop + 退出条件 |
| Tracker 为真相 | Progress Tracking（外部系统） |
| land skill | 受控交付流水线 |

---

## 9. 优势、局限与风险

### 9.1 优势

1. **问题定义干净**：管理工单而非管理 chat 会话。  
2. **SPEC 优先**：语言无关、可替换实现，利于组织内自研加固。  
3. **策略与代码同仓**：`WORKFLOW.md` + skills 可 review、可 diff。  
4. **隔离模型清晰**：路径前缀 + 每 issue 目录，降低串仓风险。  
5. **运营闭环**：对账、stall、退避、terminal 清理、token 会计。  
6. **与 Codex App Server 深度对齐**：官方执行栈，协议跟上游 schema。  
7. **Elixir 参考实现完整**：OTP 监督、SSH 多 worker、LiveView、e2e 脚本。  
8. **Apache-2.0**：企业友好。  

### 9.2 局限

1. **Engineering Preview**：官方写明 prototype / as-is，建议自建加固版。  
2. **Tracker 目前规范只写 Linear**；其他 tracker 需扩展 adapter。  
3. **执行器绑定 Codex 生态**（规范层可换 agent，参考实现写死 Codex）。  
4. **无持久调度库**：重启丢失 retry/running/blocked 细节。  
5. **写入工单靠 agent**：Orchestrator 不保证业务一致性，依赖 prompt 与工具。  
6. **安全默认高度可配**：示例 WORKFLOW 可用 `approval never`——误用风险大。  
7. **Harness Engineering 前置**：烂仓库 + Symphony ≠ 魔法。  
8. **Stars 高、issue 少、无 release tag**：偏「规范+样例」发布形态，而非成熟产品。  

### 9.3 风险

| 风险 | 缓解 |
|------|------|
| Agent 在 workspace 内破坏性命令 | Codex 沙箱 + 审批策略 + 专用 runner 用户 |
| Hooks 任意 shell | 仅信任 repo 配置；审计 WORKFLOW |
| Linear token 权限过大 | 最小 scope；不落日志 |
| 并发改同一代码库冲突 | 每 issue 独立 clone/分支；合并靠 land 流程 |
| 无限烧 token | max_turns、stall、并发上限、看板 token 汇总 |

---

## 10. 快速上手（Elixir）

```bash
# 前置：Harness Engineering 友好仓库 · Linear Personal API Key · codex 已登录
export LINEAR_API_KEY=...

git clone https://github.com/openai/symphony
cd symphony/elixir
mise trust && mise install
mise exec -- mix setup && mise exec -- mix build

# 将 WORKFLOW.md 拷到你的业务仓库并改 project_slug / hooks.clone
# 可选复制 .codex/skills

mise exec -- ./bin/symphony /path/to/your/WORKFLOW.md
# 可观测：./bin/symphony WORKFLOW.md --port 4000
```

Option 1：把 `SPEC.md` 交给任意 coding agent，用你们语言栈重实现。

---

## 11. 何时选用 Symphony

| 场景 | 建议 |
|------|------|
| 团队已用 Linear + Codex，希望看板驱动无人值守实施 | **强匹配** |
| 需要把工程文化写进可版本化 WORKFLOW + skills | **强匹配** |
| 要多模型猫团队聊天协作 | **Clowder** |
| 要多 CLI 并行 worktree swarm | **ClawTeam** |
| 要本机全能自进化助手 | **GenericAgent** |
| 要个人记忆 Wiki 桌面 OS | **OpenHuman** |
| 要生产级多租户 SaaS 控制面 | Symphony 明确非目标；需自建 |

---

## 12. 总结

**Symphony = OpenAI 开源的「工单编排规范 + Elixir 参考实现」：**

- **SPEC** 定义调度、workspace、Codex 集成与信任边界  
- **WORKFLOW.md** 把团队如何做票、如何交接变成仓库真相  
- **Orchestrator** 只做读 tracker + 派活 + 隔离 + 重试 + 可观测  
- **真正写码与改票** 交给 **Codex + skills**，工程师管理看板而非盯终端  

在 2026 agent 栈中，它占据 **L4 工单调度** 的清晰槽位：向上对接项目管理，向下对接 harness 与 coding agent，侧向不与 Clowder/ClawTeam/GA 抢同一职责。采用时务必把它当 **可 fork 的规范与原型**，在可信环境验证后按组织安全基线加固，而不是直接当无维护生产产品。

---

## 13. 关键链接

| 资源 | URL |
|------|-----|
| GitHub | https://github.com/openai/symphony |
| SPEC | https://github.com/openai/symphony/blob/main/SPEC.md |
| Elixir README | https://github.com/openai/symphony/blob/main/elixir/README.md |
| Demo | https://player.vimeo.com/video/1186371009 |
| 官方博文 | https://openai.com/index/open-source-codex-orchestration-symphony/ |
| Harness Engineering | https://openai.com/index/harness-engineering/ |
| Codex App Server | https://developers.openai.com/codex/app-server/ |

---

*本分析基于官方 README、`SPEC.md`（全文结构）、`elixir/README.md`、`elixir/WORKFLOW.md`、`elixir/AGENTS.md`、`mix.exs`、`orchestrator.ex` 核心逻辑与仓库树/元数据；未逐行审计全部测试与 AppServer 协议适配代码。*
