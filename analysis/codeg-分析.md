# Codeg 项目深度分析

> 分析对象：[`xintaofei/codeg`](https://github.com/xintaofei/codeg)  
> 维护方：**xintaofei（feitao）**  
> 许可证：**Apache-2.0**  
> 状态：活跃产品；GitHub Releases 密集（约 **142** 个版本）；分析时点 **v0.20.0**（2026-07-11）  
> 仓库：约 **2.0k★ / 236 forks**，推送至 2026-07-11  
> 语言：**TypeScript ~49% · Rust ~47%**（Tauri 2 桌面 + Axum 服务端 + Next.js 静态前端）  
> 分析日期：2026-07-11  
> 一手材料：README / AGENTS.md / `src-tauri/src/**`（AppState、paths、models、acp/delegation、automation、bin/codeg_mcp）+ GitHub API  

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**Codeg（Code Generation）是「多 Agent 编码工作台」：把 Claude Code / Codex / OpenCode / Pi 等十余种 CLI Agent 的会话聚到同一 Workspace，用 ACP 统一连接，用 MCP 伴生进程做跨引擎委托，并附带 worktree 并行、自动化、消息渠道与 Office/科研工具面。**

官方表述：

> *Collaborative multi-agent AI coding workspace: aggregate sessions from Claude Code, Codex, OpenCode, Pi, etc. Desktop app, self-hosted server, or Docker.*

### 1.2 是 / 不是

| Codeg **是** | Codeg **不是** |
|--------------|----------------|
| 多引擎 **会话聚合 + 实时工作台** | 工单调度守护进程（≠ Symphony） |
| **ACP 连接管理器** + 每引擎 transcript 解析器 | 自研 ReAct / 推理内核 |
| **跨引擎委托**（`delegate_to_agent` via MCP） | 多人类租户 SaaS 控制面 |
| Folder/路径 = 项目工作区轴 + git worktree | 强 WorkItem FSM / 审批账本 OS |
| 桌面（Tauri）+ 自托管 server + Docker | 纯云端托管 Agent（可选赞助方云） |

### 1.3 与 Hearth / Symphony / Paseo 的坐标

```text
Symphony     工单 → 隔离 workspace → 单引擎实现跑
Paseo        控制面 / Provider / Timeline（偏 CLI 编排）
Codeg        会话 / Folder / 多引擎 UI / 委托 / 自动化
Hearth(目标)  Project + WorkItem 账本 + Team + Pulse + Provider
```

**Codeg 强在「工作台与多引擎体验」；弱在「组织层承诺任务账本」。**  
Hearth 强在「Domain 合同」；缺的正是 Codeg 已产品化的 **会话聚合、委托旁路、Folder=cwd 工作区、Automation 隔离模式**。

---

## 2. 系统架构

### 2.1 运行时三件套

| 二进制 | 角色 |
|--------|------|
| **`codeg`** | Tauri 2 桌面（窗口、托盘、updater）；feature `tauri-runtime` |
| **`codeg-server`** | 独立 HTTP + WebSocket（Axum）；无 GUI |
| **`codeg-mcp`** | **per-launch** stdio MCP 伴生：向父 Agent 暴露委托/反馈/提问工具 |

共享 Rust 库 `codeg_lib`；业务 `_core` 函数同时服务 Tauri command 与 Web handler。

### 2.2 端到端分层

```text
Next.js 16 (static export) + React 19
        │  invoke() 或  fetch()+WS
        ▼
  Transport 抽象（桌面 IPC / Web）
        │
   ┌────┴────┐
 codeg    codeg-server
   └────┬────┘
        ▼
 Shared Core
   AppState
   ACP ConnectionManager
   DelegationBroker + TokenRegistry + UDS
   Parsers（每 Agent 一种）
   Chat channels / Terminal / Git / MCP / Office / Automation
   SeaORM + SQLite
        │
   本地 Agent 会话目录 · 仓库 · IM 渠道
```

### 2.3 AppState 核心字段（权威运行时）

来自 `app_state.rs`（一手）：

| 字段 | 含义 |
|------|------|
| `db` | SQLite（SeaORM） |
| `connection_manager` | ACP 连接与 spawn |
| `terminal_manager` | 集成终端 |
| `event_broadcaster` / `emitter` | 前端事件（Tauri 或 WebOnly） |
| `acp_event_bus` | 进程内 typed 事件总线 |
| `chat_channel_manager` | Telegram / 飞书 / iLink |
| `workspace_transfer` | 远程工作区传输 |
| **`delegation_broker`** | 多 Agent 委托 |
| **`delegation_tokens`** | 父连接临时 token |
| **`delegation_socket_path`** | PID 作用域 UDS/命名管道 |
| `feedback_config` / `question_config` / `session_info_config` | MCP 工具热开关 |
| `system_op_lock` / `update_state` | 自更新互斥与状态 |

**设计启发：** 控制面状态把「连接 / 委托 / 终端 / 渠道 / 更新」捏成一图，而不是散落全局单例。

### 2.4 路径与数据目录

`paths.rs` 集中解析：

| 路径 | 规则 |
|------|------|
| 用户配置根 | `$CODEG_HOME` 或 `~/.codeg` |
| 运行数据 | `$CODEG_DATA_DIR` 优先，否则 Tauri `app_data_dir` / server 默认 `~/.local/share/codeg` |
| pets / uploads / logs | 挂在 home 或 data_dir 下 |
| 上传配额 | `CODEG_UPLOAD_MAX_TOTAL_BYTES`（单进程硬顶） |

**显式：单进程部署假设**；水平扩展共享 uploads 需外部协调——合同诚实。

---

## 3. 域模型（从 models / DB 反推）

### 3.1 核心对象对照

| Codeg | 近似含义 | Hearth 对应 |
|-------|----------|-------------|
| **Folder** | 工作区目录（path + git_branch + default_agent + color + kind） | **Project**（root_path）+ 部分 Workspace |
| **Folder.parent_id** | worktree 子 Folder 挂在根 Folder 下 | Workspace(worktree) 升格路径 |
| **Conversation** | 一次会话（可导入 / 可 live ACP） | **Session**（+ 可选 transcript 索引） |
| **Conversation.parent_id / delegation_call_id** | 委托子会话树 | Session 父子 / Thread later |
| **AgentType** | 枚举引擎身份 | **Provider** 注册表 id |
| **Automation** | 保存的 composer 快照 + cron/手动 | cron → WorkItem + loop_policy |
| **AutomationRun** | 一次 fire + status + worktree_folder_id | Session attempt + closeout |
| **OpenedTab** | 工作台标签（CAS version） | UI 态，非域根 |
| **Chat channel** | 远程交互通道 | 后段；CLI/Pulse 先 |

### 3.2 Folder（工作区轴）

```text
FolderDetail {
  id, name, path,
  git_branch?,
  default_agent_type?,
  parent_id?,          # worktree → 根 folder
  kind: normal | chat | …,
  color, sort_order, last_opened_at
}
```

要点：

1. **项目 ≈ 打开过的路径（Folder）**，不是抽象「产品」实体，但 path 是一等。  
2. **worktree 是 Folder 子树**，侧边栏可合并显示。  
3. `chat` 类 Folder 仍参与 cwd 解析，但列表隐藏——**工作区与聊天分组分离**。

### 3.3 Conversation（会话轴）

```text
DbConversationSummary {
  id, folder_id, agent_type, status,
  kind: regular | chat | loop | delegate,
  parent_id?, parent_tool_use_id?, delegation_call_id?,
  child_count,   # 侧边栏展开委托子树
  pinned_at?, model?, git_branch?, external_id?,
  title_locked, message_count, …
}
```

要点：

1. **导入会话** vs **本机 ACP 新会话** 统一进 DB。  
2. **委托**形成 `parent → children` 树；`kind=delegate` 可分组。  
3. **transcript_watermark** 解决 live 流与落盘 turns 的竞态交接（产品级细节）。  
4. **SessionStats**（tokens / duration / context window %）直接服务 HUD。

### 3.4 AgentType（引擎枚举）

```text
ClaudeCode | Codex | OpenCode | Gemini | OpenClaw | Cline
| Hermes | CodeBuddy | KimiCode | Pi | Grok
```

每个类型有 **parser**（`parsers/*.rs`）读本机会话目录；环境变量优先于默认路径（README 表）。

### 3.5 Automation

```text
Automation {
  name, enabled,
  trigger_kind + cron + timezone + next_run_at,
  agent_type, root_folder_id?,
  isolation: IsolationMode,   # WorktreePerRun | SharedInRoot | …
  branch?, config: JSON,      # 整包 composer 快照
  last_run_*, unseen_failures
}
AutomationRun { status, conversation_id?, worktree_folder_id?, stop_reason?, summary?, … }
```

**IsolationMode（engine 一手）：**

| 模式 | 行为 |
|------|------|
| **WorktreePerRun** | 每次 fire `git worktree add`；folder 名含 automation+run id |
| **SharedInRoot** | 直接在 root folder path 跑 |
| （分支解析） | 可 resolve 已有 worktree；脏工作区会拒并提示用 per-run |

**fire_lock**：同一 automation 的手动 / cron / 双重点击串行，防双跑。

---

## 4. 多 Agent 委托（核心发明）

### 4.1 机制

```text
父 LLM  ToolUse(delegate_to_agent)
   → 父 CLI stdio → codeg-mcp（伴生）
        → UDS/管道 + 临时 token
             → DelegationBroker
                  → ConnectionManager.spawn_agent / send_prompt_linked
                       → 子 ACP Session
                  ← TurnComplete
   ← MCP tool_result（子最终 assistant 文本）
```

- **v1 = one-shot**：子首轮 `TurnComplete` 后 disconnect；计划 v2 `continue_with_session` / `close_session`。  
- **深度限制 / 超时**：broker 默认配置；UI 可 hot-swap。  
- **伴生缺失**：委托跳过 + 警告，主会话仍可用（降级友好）。  
- 注入点：`load_mcp_servers_for_agent` 把 `codeg-mcp` 写进父 Agent 的 MCP 配置。

### 4.2 额外 MCP 工具组（feature gate）

| 工具组 | 作用 |
|--------|------|
| `delegation` | `delegate_to_agent` |
| `feedback` | `check_user_feedback` 中途转向 |
| `ask` | `ask_user_question` 选择题卡阻塞 |
| `sessions` | `get_session_info` |

### 4.3 对 Hearth 的直接映射

| Codeg | Hearth 应吸收 |
|-------|----------------|
| 跨引擎委托 | **Provider 间 Handoff 的「软」路径**：Member A（Claude）可 tool 调 Member B（Codex）跑一程，结果回写 Work comment / Artifact，而非只做队级 Handoff 包 |
| codeg-mcp 伴生 | Provider Adapter **可选注入 MCP 工具面**（daemon 侧 broker），禁止每引擎私造协议 |
| parent/child conversation | Session.`parent_session_id` + `delegation_id`（M3 前可字段预留） |
| one-shot v1 | 对齐 M1 solo：委托 = 子 Session 单次 attempt，不先做长对话子环 |

---

## 5. 会话聚合与解析

### 5.1 解析器矩阵

`parsers/` 每引擎一文件：`claude`、`codex`、`opencode`、`gemini`、`openclaw`、`cline`、`hermes`、`codebuddy`、`kimi_code`、`pi`、`grok` + `summary_cache`。

### 5.2 导入语义

`ImportResult { imported, updated, skipped }`：  
- 已导入可 **只刷新 AI 标题**  
- **title_locked** 永不被自动改  

### 5.3 工作台工程闭环

文件树 · Diff · Git 变更 · commit · 终端 · 运行时日志（分模块级别）。

**启发：** Pulse Live 不够；**Work 详情需要「工程面板」**（Files/Artifact + git 状态 + 终端入口），Codeg 把这些做成默认，而不是 optional IDE。

---

## 6. 周边能力（产品广度）

| 能力 | 摘要 | Hearth 态度 |
|------|------|-------------|
| **Project Boot** | shadcn 可视化脚手架 + live preview | 非 M1；可作 Team 模板附属 |
| **Automations** | 保存 composer → cron/手动 + isolation | **强吸收**：= 静默派活模板 |
| **Chat Channels** | Telegram / 飞书 / 微信 远程控 Agent | M2+；硬门 approve 可先落渠道 |
| **Office / Science skills** | 技能×Agent 矩阵、集中 skill store | 对齐 Brain/skills；矩阵 UI 可抄 |
| **MCP 市场** | 本地扫描 + 注册表装 | Daemon 配置面 |
| **Remote workspace** | 远程连接 + transfer | ExecutionBackend later |
| **Pets** | 桌宠态映射 ACP 生命周期 | 不吸收（产品趣味） |
| **In-place server update + --supervise** | 自更新与回滚 | 运维细节可参考 |

---

## 7. 技术与工程品质

| 项 | 观察 |
|----|------|
| 前端 | Next **static export only**（无动态路由）；transport 双模 |
| 后端 | Rust 2021；`sacp` / `sacp-tokio` ACP 栈 |
| 测试 | vitest + cargo test + insta 解析快照 + test-utils feature |
| 条件编译 | `tauri-runtime` 清晰切桌面 |
| 安全默认 | 本地优先；Web token；系统代理 |
| 版本节奏 | 高频 release（工程与产品迭代极快） |

---

## 8. 与 Hearth 的差异总表

| 维度 | Codeg | Hearth（当前合同） |
|------|-------|-------------------|
| 主对象 | Folder + Conversation | Project + WorkItem + Team |
| 多引擎 | AgentType 枚举 + parsers + ACP | Provider 注册表 + Adapter |
| 协作 | **委托 MCP**（同工作台跨引擎） | Team/Member + later Thread/Handoff |
| 异步 | Automation + isolation worktree | 异步 CVO + quiet + Bundle |
| 硬门 | ask_user_question / 渠道权限 | Approval + Pulse 硬门区 |
| 产出 | 工作台文件/预览 | Artifact 索引（M0.2.9） |
| UI | 富工作台（对话中心） | Pulse + Board（账本中心） |
| 部署 | 桌面 + server + Docker | 设计为 Daemon + CLI + Pulse |

**结论：** Codeg 是 **IDE/工作台型多 Agent 壳**；Hearth 是 **个人 Agent OS 账本**。应 **嫁接机制，不照搬中心隐喻**。

---

## 9. 可汲取智慧（给 Hearth 的建议，按优先级）

### P0 — 应写入合同 / 近期原型

1. **Folder 语义强化 Project**  
   - Project 必须可打开为「工作台根」：path、default_provider、default_team、git_branch 提示。  
   - worktree = Project 下的子工作区（M1 字段 `worktree_path`；M3 升 Workspace）。

2. **Provider 会话聚合（可选能力）**  
   - 不只「我们启动的 Session」：允许 **索引本机 Claude/Codex 历史** 挂到 Project/Work（只读导入）。  
   - 降低「换工具丢上下文」摩擦。

3. **委托（Delegation）作为 M3 前的「软协作」**  
   - 合同预留：`Session.parent_session_id`、`delegation_call_id`。  
   - 实现形态可抄：Daemon broker + 可选 MCP 注入；v1 one-shot。  
   - 结果默认 → Artifact 或 WorkComment，不静默改 Work 状态机。

4. **Automation = 可复用派活**  
   - 保存：`{ project_id, team_id, member/provider, prompt, loop_policy, isolation }`。  
   - `isolation: shared | worktree_per_run` 直接进 M1.5/M2。  
   - 对齐现有「异步 CVO 离开再跑」。

5. **Live HUD 指标**  
   - tokens、duration、context window %（Codeg SessionStats）进 Pulse Live 最小集。

### P1 — 架构模式

6. **三二进制思维（可选）**  
   - `hearthd`（daemon）· `hearth`（CLI）· `hearth-mcp`（注入 Agent 的控制面工具）。  
   - 与 codeg-mcp 同构：工具面与控制面进程分离。

7. **Transport 抽象**  
   - CLI/本地 IPC 与未来 Web Pulse 共用 `_core` 业务，避免双写。

8. **Tabs CAS version**  
   - 多端打开同一 Project 时的 UI 冲突解决（M2 Web）。

9. **技能×Provider 矩阵**  
   - 与 Member.tools_allow 同一交互语言。

### P2 — 明确不抄

10. 不以 **对话侧边栏** 取代 **Board/WorkItem** 主轴。  
11. 不把 Pets / 全量 Office 脚手架塞进 M1。  
12. 不把 AgentType **写死枚举** 当 Provider 模型（Hearth 保持注册表开放）。

---

## 10. 风险与边界（Codeg 自身）

| 风险 | 说明 |
|------|------|
| 产品面过宽 | 工作台 + 渠道 + Office + 科研 + 宠物 → 域边界易糊 |
| 单进程配额 | uploads 硬顶不跨实例 |
| 委托 v1 短命 | one-shot 不适合长 pipeline（需 v2 或 Hearth 自己的 orchestration） |
| 解析脆弱 | 各 CLI 会话格式变更会炸 parser（需快照测试，他们已有 insta） |
| 安全面 | 本地 Agent ≈ 用户权限；Web token 模式需运维纪律 |

---

## 11. 参考路径（复现分析）

| 路径 | 内容 |
|------|------|
| `README.md` / `docs/readme/README.zh-CN.md` | 产品面 |
| `AGENTS.md` | 架构与工程约定 |
| `src-tauri/src/app_state.rs` | 运行时图 |
| `src-tauri/src/paths.rs` | 路径合同 |
| `src-tauri/src/models/{folder,conversation,agent,automation}.rs` | 域投影 |
| `src-tauri/src/acp/delegation/mod.rs` | 委托协议说明 |
| `src-tauri/src/bin/codeg_mcp.rs` | MCP 伴生入口 |
| `src-tauri/src/automation/engine.rs` | isolation / fire_lock |
| `src-tauri/src/parsers/*` | 多引擎导入 |
| `package.json` / `src-tauri/Cargo.toml` | v0.20.0 · 三 bin |

---

## 12. 一句话收束

**Codeg 证明：多 Provider 工作台的关键不是「再做一个聊天」，而是 Folder=cwd 轴 + 会话树 + ACP 连接 + MCP 委托旁路 + worktree 隔离自动化；Hearth 应把这些机制挂到 Project/WorkItem/Session 账本上，而不是改成对话中心产品。**
