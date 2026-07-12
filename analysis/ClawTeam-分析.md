# ClawTeam 项目深度分析

> 分析对象：[`HKUDS/ClawTeam`](https://github.com/HKUDS/ClawTeam)  
> 包版本：`0.3.0`（`pyproject.toml` / `__init__.py`；GitHub Release 最新标签为 `v0.2.0`）  
> 组织：HKUDS（香港大学数据科学相关开源组织）  
> 许可证：**MIT**  
> 仓库状态：约 **5.4k★ / 743 forks**，创建于 2026-03-17，活跃更新至 2026-05；35 open issues  
> 分析日期：2026-07-10

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**ClawTeam 是面向「任意 CLI 编码 Agent」的框架无关协调层——用一条 CLI + 文件系统状态，让 Leader 自己 spawn 子 Agent、分任务、收 inbox、合 worktree，形成可观察的 Agent Swarm。**

口号：**Solo 🤖 → Swarm 🦞🤖🤖🤖**；**One Command → Full Automation**；人类给目标，Agent Team 编排其余。

### 1.2 核心哲学

| 原则 | 含义 |
|------|------|
| **Agent 是用户，不是被编排对象** | 主要调用方是 Claude Code / Codex 等本身——通过 shell 跑 `clawteam …`，而非人类写 YAML 编排图 |
| **零重基础设施** | 默认无 Redis/DB/云；状态在 `~/.clawteam/` 的 JSON；原子 `tmp + rename` 写 |
| **进程级隔离 = git worktree + tmux** | 每 worker 独立分支与窗口，真实 diff / 可合并，而非容器玩具沙箱 |
| **协议即 CLI** | 协调协议 = 一组可脚本化命令 + 注入 prompt；无专属 SDK 锁死 |
| **兼容优先** | 适配 Claude / Codex / OpenClaw / nanobot / Gemini / Kimi / OpenCode / Pi 等原生 CLI 差异 |

### 1.3 它解决什么问题

| 痛点 | ClawTeam 做法 |
|------|----------------|
| 多 Agent 要人手拆任务、拷上下文、盯进度 | Leader 用 `spawn` / `task` / `inbox` 自组织 |
| 多框架各写一套编排（LangGraph 图、Crew 角色 YAML…） | **不替换 Agent**，只在其外壳加协调 |
| 并行改同一仓库冲突 | 默认 **git worktree**，分支 `clawteam/{team}/{agent}` |
| 跨 Agent 消息无标准 | 每 Agent 收件箱 + broadcast + 类型化 `MessageType` |
| 非默认模型/网关难配 | **preset → profile → spawn --profile** 运行时对象链 |

### 1.4 与同类的定位差

README 对比表（概念层）：

| 维度 | ClawTeam | 典型 multi-agent 框架 |
|------|----------|------------------------|
| 谁用它 | **AI Agent 自己** | 人类写 orchestration 代码 |
| 安装 | `pip install` + 给 Leader 一句 prompt | Docker / 云 API / 重配置 |
| 基础设施 | 文件系统 + tmux | Redis、队列、DB |
| Agent 支持 | **任意能跑 shell 的 CLI** | 框架绑定 |
| 隔离 | **真实 git worktree** | 容器 / 虚拟环境 |
| 智能所在 | Swarm 经 CLI 自组织 | 硬编码编排逻辑 |

与本 `analysis/` 中项目对照：

| 项目 | 层次 | 与 ClawTeam 关系 |
|------|------|------------------|
| **Pi / Deep Agents** | L1 单 Agent harness | ClawTeam 可 spawn 它们作 worker；自身不实现 agent loop |
| **Paseo / Omnigent** | L3 控制面 / Meta-Harness | 更偏宿主与多 provider 环境；ClawTeam 偏 **同机 swarm 协调** |
| **Clowder AI** | L4 协作平台（身份/SOP/Mission） | Clowder 平台语义更重；ClawTeam 更薄、CLI/文件优先 |
| **Symphony** | L4 工单调度（Linear） | 外部工单驱动；ClawTeam 是 Agent 内生任务板 |
| **Agent Design Patterns** | L0 设计词汇 | ClawTeam 实现上落在 Hierarchical Delegation + Fan-out + Task dependency + Plan gate 等格子 |

---

## 2. 整体架构

### 2.1 运行时鸟瞰

```txt
  Human: "Optimize this LLM" / "Build full-stack app"
         │
         ▼
  ┌──────────────┐   clawteam spawn    ┌──────────────────┐
  │ 🦞 Leader    │ ──────────────────► │ 🤖 Worker        │
  │ Claude/Codex │                     │ worktree + tmux  │
  │ spawn/task/  │ ──────────────────► │ …                │
  │ inbox/board  │                     └────────┬─────────┘
  └──────┬───────┘                              │
         │                                      │ task list / update
         │                                      │ inbox send / receive
         ▼                                      ▼
              ┌─────────────────────────────────────┐
              │         ~/.clawteam/                │
              │  teams/  tasks/  inboxes/ workspaces│
              │  harness/ profiles/ presets/ …      │
              └─────────────────────────────────────┘
```

### 2.2 包结构（`clawteam/`）

```txt
clawteam/
├── cli/commands.py      # Typer 入口：几乎全部用户/Agent 表面
├── config.py            # 持久配置 + AgentProfile 模型
├── identity.py          # Agent 身份（env / 用户命名空间）
├── paths.py / fileutil  # 路径与原子写
│
├── team/                # 协调内核
│   ├── manager.py       # 团队 CRUD、成员、join 协议
│   ├── tasks.py         # 任务板、依赖、自动 unblock、wait
│   ├── mailbox.py       # 消息 API → Transport
│   ├── models.py        # TeamConfig / TaskItem / TeamMessage…
│   ├── plan.py          # 计划提交/审批
│   ├── lifecycle.py     # shutdown / idle
│   ├── leader_watcher   # 轮询/心跳唤醒 leader
│   ├── snapshot.py      # 快照与恢复
│   ├── costs.py         # token/费用上报
│   └── router / routing_policy / redis_wakeup …
│
├── spawn/               # 进程与 Agent 适配
│   ├── tmux_backend / subprocess_backend / wsh_backend
│   ├── adapters.py      # Claude/Codex/Gemini/Kimi/nanobot/OpenClaw/Pi…
│   ├── prompt.py        # 身份+任务+协调协议注入
│   ├── profiles / presets
│   └── session_locators/ # 各 CLI 会话定位
│
├── workspace/           # git worktree、冲突、上下文注入
├── transport/           # FileTransport / P2PTransport(ZMQ)
├── store/               # TaskStore 抽象（File 实现）
├── board/               # 终端看板、SSE Web UI、gource
├── harness/             # 可选：阶段机 plan→execute→verify
├── mcp/                 # FastMCP 工具封装（team/task/mailbox…）
├── events/              # 事件总线（阶段迁移等）
├── plugins/             # 插件基类 + ralph_loop 等
└── templates/           # TOML 团队原型
```

外围：

- `skills/clawteam/` — 安装到 Claude/Codex/… 的 Skill（触发词 + 工作流）
- `scripts/install_clawteam.sh` — 用户 venv + PATH + 多客户端 skill 安装
- `tests/` — 约 40 个测试模块（CI：Ubuntu/macOS × Py 3.10–3.12 + ruff）
- `website/` / `docs/` — 落地页与 transport 架构文档

### 2.3 数据面（默认 `~/.clawteam/`）

| 路径概念 | 内容 |
|----------|------|
| `teams/` | 团队 `config.json`、成员、计划等 |
| 任务存储 | 共享任务板（状态机 + 依赖边） |
| `inboxes/{agent}/msg-*.json` | 点对点消息（file transport） |
| `peers/` | P2P 地址发现 |
| workspaces | worktree 元数据 |
| `harness/{team}/{id}/state.json` | 阶段编排状态 |
| profiles / presets | 运行时与供应商模板 |

配置优先级：**环境变量 > 配置文件 > 默认**。  
兼容别名：`OH_*` 仍接受，文档已迁到 `CLAWTEAM_*`。

关键配置项：

| 键 | Env | 默认 |
|----|-----|------|
| `data_dir` | `CLAWTEAM_DATA_DIR` | `~/.clawteam` |
| `transport` | `CLAWTEAM_TRANSPORT` | `file` |
| `workspace` | `CLAWTEAM_WORKSPACE` | `auto` |
| `default_backend` | `CLAWTEAM_DEFAULT_BACKEND` | `tmux` |
| `skip_permissions` | `CLAWTEAM_SKIP_PERMISSIONS` | `true` |
| `user` | `CLAWTEAM_USER` | 多用户命名空间 |

### 2.4 依赖面

| 类别 | 包 |
|------|-----|
| 必选 | `typer`, `pydantic` v2, `rich`, `questionary`, `mcp`, `tomli`（<3.11） |
| 可选 | `pyzmq`（`[p2p]`）, `redis`（`[redis]`，路线图/唤醒） |
| 开发 | `pytest`, `ruff` |

**刻意不依赖** LangGraph / LangChain / 重型 agent 框架——它站在「已有 CLI Agent」之上。

---

## 3. 核心子系统拆解

### 3.1 Team + Task：共享看板与依赖

**团队：** `spawn-team` 创建 leader；`request-join` / `approve-join` / `reject-join` 支持握手入队；也支持 `add-member` 直加。成员可带 `user` 字段做多人类协作命名空间。

**任务状态：**

```txt
pending → in_progress → completed
              ↑
           blocked  （创建时 --blocked-by 自动 blocked）
```

- `blocked_by` / `blocks` 双向边；**完成时自动 unblock 依赖方**
- `priority`: low / medium / high / urgent
- `task wait`：轮询直到全部完成或超时（leader 编排的阻塞点）
- 锁字段 `locked_by` / `locked_at`（并发认领语义）

这是 swarm 的「项目经理」：不在 LLM 上下文里用散文记任务，而在共享 JSON 状态机上协作。

### 3.2 Mailbox + Transport：消息平面

上层 `MailboxManager` 负责构建 `TeamMessage`（Pydantic）并委托 Transport：

```txt
CLI/Agent → MailboxManager → Transport ABC
                              ├── FileTransport  (默认)
                              └── P2PTransport   (ZMQ PUSH/PULL + File 离线兜底)
```

**消息类型（节选）：** message、join_*、plan_*、shutdown_*、idle、broadcast。

**语义要点：**

- `receive` **消费**消息；`peek` 只读
- File：每消息一文件，sorted glob，原子写
- P2P：在线直连低延迟；peer 不在线或 PID 死 → **落盘兜底**，上线后仍可取
- 与「共享状态（团队配置/任务）」正交：消息可走 ZMQ，状态仍走 FS / SSHFS

跨机：**NFS/SSHFS + `CLAWTEAM_DATA_DIR`** 是当前生产推荐；Redis Transport 在 ROADMAP 为 v0.4+。

### 3.3 Spawn：后端 × 适配器 × Profile

**后端：**

| Backend | 用途 |
|---------|------|
| `tmux`（默认） | 交互式 UI，可 `board attach` 平铺观察 |
| `subprocess` | 一次性/非交互脚本 |
| `wsh` | 额外 RPC 后端（进阶） |

**适配器（`NativeCliAdapter`）** 处理各 CLI 的「脏细节」：

| CLI | skip-permissions / 自动放行 | Prompt 注入方式 |
|-----|----------------------------|-----------------|
| Claude | `--dangerously-skip-permissions`（root 下省略） | 交互：post-launch；否则 `-p` |
| Codex | `--dangerously-bypass-approvals-and-sandbox` | 交互 post-launch / 非交互参数 |
| Gemini / Kimi / Qwen / OpenCode | `--yolo` | `-p` / `-i` / Kimi `-w` |
| nanobot | Docker 挂载与 env 注入 | `-m` |
| OpenClaw | 归一化为 agent 入口 + `--local` / session | `--message` |
| Pi | 极简 | `-p` 或位置参数 |

另有：命令校验、keepalive、session capture/locator、runtime notification——保证「spawn 出去还能找回来」。

**Profile / Preset 链：**

```txt
preset（供应商模板，如 moonshot-cn / minimax）
   └─ generate-profile → profile（最终运行时对象）
         └─ spawn --profile X / launch
```

`profile wizard`（questionary TUI）、`profile doctor claude`（修 `~/.claude.json` onboarding）、`profile test` 冒烟——把「换 API 中转」从 prompt 里拔出来变成可复用配置。

### 3.4 协调 Prompt 注入（Swarm 协议的「说明书」）

每个 spawn 的 worker 收到 `build_agent_prompt(...)`，结构：

1. **Identity** — name / id / type / team / leader / user  
2. **Workspace** — 路径、是否隔离 worktree、分支名  
3. **Task** — 用户/leader 派发的任务正文  
4. **Context** — 可选：队友近期变更、文件重叠警告（`workspace.context.inject_context`）  
5. **Coordination Protocol** — 强制 CLI 用法：task list/update、inbox、commit 约定、cost report  
6. **Worker Loop Protocol** — **禁止做完第一个 task 就退出**；idle 通知 + 持续轮询

要点：协调知识**也**通过 Skill 文档安装到 Claude/Codex；prompt 与 Skill 双轨降低「忘了用 clawteam」的概率。

### 3.5 Workspace：隔离与合流

- 默认 `workspace=auto`：在 git 仓内建 worktree  
- 分支命名：`clawteam/{team}/{agent}`  
- `workspace checkpoint / merge / cleanup`  
- `context conflicts / log / inject`：合并前冲突感知与交接上下文  

这是相对「纯 prompt 多 agent」的硬工程优势：**并行写代码而不共享脏工作区**。

### 3.6 Board：观测面

| 命令 | 作用 |
|------|------|
| `board show` | 终端 kanban |
| `board live` | 自动刷新 |
| `board attach` | **tmux 平铺**所有 agent 窗 |
| `board serve` | **Web UI + SSE** 实时看板 |
| `board gource` | 仓库活动可视化（可 `--log-only` 无头） |

人类角色被定义为 **watch + 按需介入**，而不是每步派工。

### 3.7 Plan / Lifecycle / Snapshot / Cost

| 子系统 | 作用 |
|--------|------|
| **Plan** | Worker 提交计划 → Leader approve/reject + feedback |
| **Lifecycle** | request-shutdown / approve / reject；`idle` 通知 |
| **Snapshot** | 团队配置+任务+事件+会话+费用整包快照与 restore |
| **Cost** | worker 上报 input/output tokens 与 cents，便于预算感 |
| **LeaderWatcher** | 轮询/心跳甚至 Redis 模式唤醒卡住的 leader |

### 3.8 Harness：可选「阶段机」编排

在「纯 swarm 自组织」之上，仓库还实现了一层 **Harness**：

默认阶段：

```txt
discuss → plan → execute → verify → ship
```

- `PhaseGate`：`ArtifactRequiredGate`（如 plan 需 `spec.md`）、`AllTasksCompleteGate`、`HumanApprovalGate`  
- 角色映射：planner / executor / evaluator（`DEFAULT_ROLES`）  
- 策略接口：`SpawnStrategy` / `RespawnStrategy` / `HealthStrategy` / `AssignmentStrategy` / `ExitNotifier`  
- 状态持久化在 `~/.clawteam/harness/.../state.json`  
- 模板 `harness-default.toml` 可一键对齐该流水线  

**读法：** CLI swarm 是主干；Harness 是更「有门闩的 plan-then-execute」产品化路径，仍文件驱动。

### 3.9 MCP 与 Plugins

- **`clawteam-mcp`**：FastMCP 注册 team/task/mailbox/board/plan/workspace/cost 工具——给「只说 MCP 不跑 shell」的宿主用。  
- **Plugins**：`PluginManager` + `ralph_loop_plugin` 等，扩展循环/行为而不 fork 核心。

### 3.10 Templates：领域 swarm 原型

内置 TOML（变量 `{goal}` `{team_name}` `{agent_name}`）：

| 模板 | 角色素描 |
|------|----------|
| `hedge-fund` | portfolio-manager + 5 分析师 + risk-manager（强制等齐信号） |
| `software-dev` | tech-lead + backend/frontend/qa/devops |
| `code-review` | 评审协作 |
| `research-paper` | 论文/研究向 |
| `strategy-room` | 战略讨论 |
| `harness-default` | 对接 harness 阶段 |

`clawteam launch <template> --team … --goal "…"` = 一次生成团队 + 任务 + 带协调指令的角色 prompt。

---

## 4. 典型工作流（从用例抽象）

### 4.1 Agent 自驱动（推荐）

1. 安装 skill 到 `~/.claude/skills/clawteam` 或 Codex skills  
2. 人类：*「用 clawteam 把这个全栈应用拆给多个 agent」*  
3. Leader 自动：`spawn-team` → `task create`（含依赖）→ `spawn` workers → `board`/`inbox`/`task wait` → merge  

### 4.2 人工驾驶

```bash
clawteam team spawn-team my-team -d "…" -n leader
clawteam spawn --team my-team --agent-name alice --task "…"
clawteam spawn --team my-team --agent-name bob   --task "…"
clawteam board attach my-team
```

### 4.3 AutoResearch 叙事（官方旗舰案例）

- 输入：*8 卡优化 train.py*  
- Leader：每 GPU 一方向 spawn（可混 Claude + Codex）  
- 周期读 `results.tsv`、交叉授粉最优配置、杀闲置、从 best commit 建新 worktree  
- 结果量级宣称：2430+ 实验，val_bpb 1.044→0.977（约 6.4%），~30 GPU-hours  
- 上游灵感：[@karpathy/autoresearch](https://github.com/karpathy/autoresearch)；结果仓：`novix-science/autoresearch`

**注意：** 这是 **swarm 编排能力 + 领域脚本/实验协议** 的组合拳；ClawTeam 本身不内置训练循环。

### 4.4 Hedge Fund 模板

七角色分析链路：并行分析师 → risk-manager 汇聚 → portfolio-manager 决策；prompt 内写死 **polling wait**（`sleep 45 && board show`），用 CLI 状态机对抗 LLM 过早收官。

---

## 5. Agent 兼容矩阵（README + 代码）

| Agent | 状态 | 备注 |
|-------|------|------|
| Claude Code | ✅ Full | 默认 command；onboarding doctor |
| Codex | ✅ Full | 交互/非交互分支处理细 |
| OpenClaw | ✅ Full | 入口归一化 |
| nanobot（HKUDS 姐妹） | ✅ Full | Docker 路径支持 |
| Kimi CLI | ✅ Full | `-w` workspace |
| Gemini CLI | ✅ Full | |
| OpenCode / Qwen / Pi | 代码级适配 | 文档表不完全列出 |
| Cursor | 🔮 Experimental | 偏 subprocess |
| 自定义脚本 | ✅ | 满足 PATH + cwd + 初始任务 + 可常驻 |

**兼容契约（加新 Agent）：** PATH 可跑、能进 worktree、接受初始任务、交互则能在 tmux 存活。

---

## 6. 路线图与版本现实

| 版本叙事 | 内容 | 代码/文档现实 |
|----------|------|----------------|
| v0.1.x | 核心 CLI、team/task/inbox、board、模板 | 已发布 |
| v0.2.0 | 稳定化：spawn/workspace、profiles、snapshots… | **GitHub Latest Release**（2026-03-23） |
| v0.3.0 | pyproject 当前版本号；File+P2P、Web UI、多用户、模板 | 主干代码已具；ROADMAP 文档版本号有前后不一致 |
| v0.4 | Redis Transport 跨机消息 | Planned |
| v0.5 | 共享状态层（Redis 或统一后端） | Planned |
| v0.6+ | Marketplace / 自适应调度 / 生产 auth | Exploring |

ROADMAP 正文早期写「v0.2 仅单机文件」，文末又写「v0.3 已完成 Web UI/多用户」——**以源码与 pyproject `0.3.0` 为准**，文档存在漂移。

`Development Status :: 3 - Alpha`（classifier）与 5k+ stars 并存：社区热、工程成熟度仍自我标 Alpha。

---

## 7. 设计模式映射（对照 Agent Design Patterns 矩阵）

| ClawTeam 机制 | 近似坐标 / 模式 |
|---------------|-----------------|
| Leader spawn workers + 合成 | **Hierarchical Delegation**（Collaboration × Hierarchy） |
| 多 worker 并行 worktree | **Fan-Out/Gather**（Collaboration × Parallel） |
| task blocked-by 链 | **Plan-and-Execute** 的依赖 DAG 切片（Action × Orchestrate） |
| plan submit/approve | **Approval Gate**（Governance × Route） |
| skip-permissions / 工具放行 | 治理上偏「开发默认放行」——生产需自加 **Guardrail Sandwich** |
| inbox + lifecycle idle | 协作信道 + 生命周期协议 |
| Failure 不落日记 | 缺 **Failure Journals** 级跨任务记忆（有 snapshot，非失败分类召回） |
| Harness 阶段门闩 | Generator 前的 **门控流水线**（更接近 composition 方法论） |

适合作为「在真实 CLI Agent 上落地协作模式」的参考实现，而不是完整 7×6 模式库。

---

## 8. 优势、局限与风险

### 8.1 优势

1. **正确的抽象层级**：不重造 agent loop，只做团队 OS（任务、消息、进程、worktree、看板）。  
2. **Agent-native 接口**：`--json` + 注入协议 + Skill，适配「模型会 shell」的时代。  
3. **真实并行工程模型**：git worktree 比共享目录 prompt 靠谱得多。  
4. **多 CLI 适配投入深**：Claude/Codex 交互启动、permissions 旗标、session 定位等踩坑都写进代码。  
5. **可插拔 Transport + 文件兜底**：P2P 不牺牲离线语义。  
6. **模板与 Profile 降低冷启动**：领域团队与供应商配置可复用。  
7. **测试面较宽**：约 40 个测试文件，CI 跨 OS/Python。  
8. **MCP 双入口**：shell 与工具协议并存。

### 8.2 局限

1. **协调智能仍在 LLM 侧**：错误 spawn、过早 finalize、inbox 漏读，系统只提供工具，不保证最优策略。  
2. **文件状态机的扩展边界**：高 QPS、强一致、跨地域仍要 Redis/共享存储（路线图未完全落地）。  
3. **安全默认偏开发**：`skip_permissions=true`、自动 `--dangerously-*` —— 不适合无沙箱生产资金/生产凭据场景。  
4. **观测 ≠ 可证明正确**：board 好看，但不替代评测、契约测试、财务对账。  
5. **Hedge fund 等模板是演示角色扮演**：非合规投研系统。  
6. **文档/版本号漂移**：README 里程碑、ROADMAP、pyproject、Release 标签不完全对齐。  
7. **Windows**：有 `test_windows_compat`，但默认叙事强依赖 tmux/git worktree（Unix 友好）。  
8. **Harness/插件**相对 CLI 主路径文档更少，心智模型「swarm vs harness」需自行统一。

### 8.3 使用风险

| 风险 | 缓解 |
|------|------|
| Worker 烧 token 空转 | cost report + budget 字段；人工 board；超时 kill |
| 错误合并 worktree | `context conflicts` + 人工 merge 策略 |
| 共享 `data_dir` 权限 | 多用户 `CLAWTEAM_USER`；生产需 OS 级隔离 |
| Prompt 注入协调被忽略 | Skill + 强化 leader 监督；`task wait` |
| 把研究 demo 当生产交易 | 模板仅作架构示意 |

---

## 9. 安装与快速验证

```bash
pip install clawteam
# 或
git clone https://github.com/HKUDS/ClawTeam.git && cd ClawTeam && pip install -e ".[dev,p2p]"

# 前置
tmux -V
claude --version   # 或 codex / nanobot …

# 冒烟
clawteam --help
clawteam team spawn-team demo -d "smoke" -n leader
clawteam task create demo "hello" -o leader
clawteam board show demo
clawteam config health
```

推荐 Agent 路径：安装 skill 后直接让 leader「用 clawteam 拆分任务」。

---

## 10. 与本仓库实践的结合建议

若你在 `teams` monorepo 语境下评估 ClawTeam：

1. **L2/L3 协作缺口**：已有 Pi/Paseo/Omnigent 时，ClawTeam 可补「**同仓多 CLI 并行 + worktree**」这一刀，而不是再造控制面。  
2. **对照 Clowder**：要平台身份/SOP/Mission → Clowder；要轻量 swarm CLI → ClawTeam。二者可并存：Clowder 管人设与任务语义，ClawTeam 管进程与 worktree（需自行桥接，非官方一体）。  
3. **模式审计**：用 Hierarchical Delegation / Fan-out / Approval 三件套检查你的 leader prompt 是否完整（拆解、隔离产物、门闩）。  
4. **安全加固**：生产路径强制 `skip_permissions=false` + 外层沙箱 + Guardrail。  
5. **跟踪 Redis 跨机与 auth 路线图** 再决定是否作为分布式团队总线。

---

## 11. 总结

**ClawTeam = 给 CLI Coding Agents 用的「团队操作系统」：**

- **内核**：文件化 team / task / inbox / worktree  
- **壳**：tmux 进程与多 Agent 适配器  
- **眼**：board / Web UI / gource  
- **手**：spawn / launch templates / profiles  
- **可选脊椎**：Harness 阶段门闩 + MCP + plugins  

它的差异化不在「又一个 multi-agent 框架」，而在 **让已有最强单兵 Agent 用同一套 shell 协议组成 swarm**，并把隔离建立在 **真实 git 分支** 上。  
5k+ stars 证明叙事与 demo（尤其 AutoResearch）极具传播力；落地时要把 **LLM 协调质量、权限默认、跨机状态** 当作一等风险，而不是假设「装上就会全自动」。

---

## 12. 关键链接

| 资源 | URL |
|------|-----|
| GitHub | https://github.com/HKUDS/ClawTeam |
| Release v0.2.0 | https://github.com/HKUDS/ClawTeam/releases/tag/v0.2.0 |
| ROADMAP | https://github.com/HKUDS/ClawTeam/blob/main/ROADMAP.md |
| Transport 架构 | https://github.com/HKUDS/ClawTeam/blob/main/docs/transport-architecture.md |
| 中文 README | https://github.com/HKUDS/ClawTeam/blob/main/README_CN.md |
| karpathy autoresearch | https://github.com/karpathy/autoresearch |
| 姐妹项目 CLI-Anything | https://github.com/HKUDS/CLI-Anything |
| 姐妹项目 nanobot | https://github.com/HKUDS/nanobot |

---

*本分析基于 README（EN）、`pyproject.toml`、`ROADMAP.md`、`docs/transport-architecture.md`、全量文件树、以及 `team/models`、`spawn/adapters`、`spawn/prompt`、`harness/*`、`templates/*`、`mcp/server`、`skills/clawteam`、CI 与 release 说明；未逐行审阅全部 CLI 与全部测试断言。*
