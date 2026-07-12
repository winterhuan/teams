# Herdr 项目深度分析

> 分析对象：[`ogulcancelik/herdr`](https://github.com/ogulcancelik/herdr)  
> 官网：https://herdr.dev  
> 维护方：**ogulcancelik（Can）**  
> 许可证：**双许可** — 默认 **AGPL-3.0-or-later**；商业许可另议（`hey@herdr.dev`）  
> 状态：活跃；Releases ~70；分析时点 **v0.7.3**（2026-07-07）  
> 仓库：约 **15.3k★ / 1.0k forks**，推送至 2026-07-10  
> 语言：**Rust ~85%**（单二进制 TUI / 多路复用器；无 Electron）  
> 分析日期：2026-07-11  
> 一手材料：README · AGENTS.md · SKILL.md · Cargo.toml · [docs: concepts / agents / session-state / socket-api / agent-skill / quick-start](https://herdr.dev/docs/) · 源码树 `src/{pane,workspace,detect,server,api,worktree,...}` · GitHub API  

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**Herdr 是终端里的「Agent 多路复用器 / 工作区管理器」：用真实 PTY 跑 Claude Code / Codex / Pi 等，侧栏汇总 blocked/working/done，client 可 detach，server 与 agent 继续跑；并通过 Socket API + SKILL.md 让 agent 自己编排兄弟 pane。**

官方表述：

> *agent multiplexer that lives in your terminal.*  
> *terminal workspace manager for AI coding agents*（`Cargo.toml`）

赞助文案进一步暗示路径：**「path to a real agent runtime」** — 当前是 runtime **外壳**，不是 LLM 内核。

### 1.2 是 / 不是

| Herdr **是** | Herdr **不是** |
|--------------|----------------|
| **tmux 式** server+client + 真实终端 pane | Electron 工作台（≠ Codeg / Dyad） |
| **Agent 状态检测 + 侧栏 rollup** | WorkItem 账本 / 审批 OS（≠ Hearth 域核） |
| **Socket API + CLI** 可编程编排 | 自研 ReAct / tool 执行器 |
| workspace / tab / pane 拓扑 + worktree 一等 | 云 SaaS 多租户 |
| 插件（manifest actions/events/panes） | 完整 CI/CD 或工单系统 |

### 1.3 与 Hearth / Codeg / Dyad 坐标

```text
Herdr    终端运行时壳：PTY 多路 + agent 态势 + 可编程 socket
Codeg    GUI 会话聚合 + ACP 委托 + 自动化
Dyad     App builder：chat → apply → preview
Hearth   个人 OS 账本：Project + WorkItem + Team + Pulse + Provider
```

**Herdr 强在「人同时盯多 agent 的注意力面 + 可 detach 的长跑 + agent-to-agent 编排原语」；弱在「承诺任务状态机 / 验收 / 多队策略」。**  
Hearth 应把 Herdr 当 **执行表面 / 可选运行时适配** 的智慧源，而不是替换 Board。

---

## 2. 系统架构

### 2.1 Client / Server

```text
herdr (client TUI)  ──attach──►  herdr server (拥有 panes / PTY / 进程)
        │                              │
        │  detach (ctrl+b q)           │  agents keep running
        ▼                              ▼
   任意终端 / SSH  reattach        socket API / CLI / plugins
```

- **Server** 拥有 pane 与进程真相。  
- **Client** 是附着的 UI；可多个 attach（含 `agent attach` 直连单 pane）。  
- 默认会话 socket：`~/.config/herdr/herdr.sock`；命名 session 隔离命名空间。

### 2.2 概念模型（官方 Concepts）

| 概念 | 含义 |
|------|------|
| **Workspace** | 顶层容器（一 repo / 一任务 / 一调查）；侧栏状态由内部 agent **rollup** |
| **Tab** | workspace 内布局（agents / logs / server / review） |
| **Pane** | **真实终端**；可 split、读输出、送输入、跨 tab/workspace move |
| **Agent** | pane 内被识别的进程；有语义状态 |
| **Session** | 持久 server 命名空间（默认 vs named） |
| **Worktree** | Git checkout 作为 Herdr workspace（create/open/remove API） |

### 2.3 工程原则（`AGENTS.md`）

| 原则 | 含义 |
|------|------|
| **State ≠ Runtime** | `AppState` 纯数据可测；`PaneState` ≠ `PaneRuntime`；无 PTY 也能测 workspace 逻辑 |
| **Render is pure** | `compute_view()` 算几何；`render()` 只画、不改状态 |
| **No god objects** | app/ 拆 state / actions / input |
| **Detection decoupled** | 检测器只读 screen snapshot，不碰 parser viewport |
| **Screen detection evidence-based** | 用 bottom-buffer + 显式 AND/OR 规则，不用用户滚动视口 |
| **Server-owned protocol** | TUI 是 client 之一；新能力走 JSON API/event，避免私有 TUI socket 耦合 |

这对 Hearth：**Daemon 拥有真相；Pulse/CLI 是 client** — 与 Herdr 迁移方向一致。

---

## 3. Agent 态势模型（核心产品）

### 3.1 语义状态

| State | 含义 |
|-------|------|
| **blocked** | 需要输入 / 批准 / 决策 |
| **working** | 正在跑 |
| **done** | 已结束且结果 **尚未被看** |
| **idle** | 已结束或等待且结果 **已被看** |
| **unknown** | 无法置信分类 |

**`done` vs `idle` 的注意力语义：**  
同一「底层完成」用 **是否被看见** 区分 — 这直接服务 CVO 的「回来看什么」。

- 后台 tab 完成 → 常报 `done`  
- 前台看过 / focus → `done` → `idle`  
- 新开 prompt 空闲 → `idle`（不是 done）

### 3.2 状态权威（Status authority）

每个 pane **只有一个** 状态权威源：

| 路径 | 何时 |
|------|------|
| **Lifecycle hooks / plugin** | 集成完整时 **唯一** 权威（不混用 screen 回退） |
| **Screen manifest** | 无完整 hooks 时；读 **bottom-buffer** 匹配 TOML 规则 |
| **Session-only integration** | 只报 native session id（恢复用）；状态仍用 screen |

**Blocked 故意严格：** 仅匹配已知审批/提问 UI；未知提示默认 `idle` 而非假 blocked（避免误动作；只影响可见状态与 wait）。

### 3.3 检测与集成

- 捆绑 manifest + 远程 hot-update（herdr.dev）+ 本地 override  
- `herdr agent explain` 诊断误状态  
- `pane.report_agent` / `pane.report_agent_session` / `pane.report_metadata`  
  - `state` = 语义（wait / notify / rollup）  
  - `custom_status` / titles = **纯展示**  
- 支持大量 CLI agent（Claude / Codex / Pi / OpenCode / Hermes / Cursor / …）

### 3.4 侧栏 Rollup

```text
blocked agent → pane/tab/workspace 都显示 blocked 注意力
working → workspace 活跃
done → 保持可见直到你看过
```

**主工作流：** 并行多个 agent → 侧栏只看谁 blocked / 谁 done 待 review。

---

## 4. 持久化与恢复（分层）

| 路径 | 进程保活 | 布局 | 屏内容 | Agent 对话 |
|------|----------|------|--------|------------|
| **Detach/reattach** | 是 | 是 | 是（活终端） | 是 |
| **Server 重启 + snapshot** | 否 | 是 | 仅 pane history（默认关） | 仅 native resume |
| **Update --handoff** | 尽力保活 | 是 | 活终端 | 是（handoff 成功时） |
| **Native agent resume** | 新进程 | 是 | n/a | 用官方 `--resume` |

要点：

1. **最强路径是 live server 不杀进程**（异步 CVO 的「离开」）。  
2. Snapshot 恢复的是 **形状**，不是任意 shell。  
3. Pane history **默认关**（密钥风险）；opt-in。  
4. Native resume 依赖 integration 上报 session ref。

---

## 5. 可编程表面（Socket API + SKILL）

### 5.1 三层集成

| Layer | 用途 |
|-------|------|
| **Agent skill**（`SKILL.md`） | 教 pane 内 agent 如何用 herdr CLI |
| **CLI wrappers** | 脚本 / 人调试 |
| **Raw socket** | 自定义 client / 长订阅 |

协议：本地 UDS/named pipe + NDJSON；`herdr api schema` 导出 JSON Schema。

### 5.2 能力面（摘要）

- workspace / tab / pane CRUD、split、focus、resize、zoom、move  
- **worktree** create/open/remove（Git checkout ↔ workspace）  
- **agent** list/get/read/send/start/wait  
- **events.subscribe** + **wait agent-status** / wait output  
- plugins：manifest actions、event hooks、overlay panes  
- 注入 env：`HERDR_SOCKET_PATH`、`HERDR_ENV=1`、`HERDR_WORKSPACE_ID`、`HERDR_TAB_ID`、`HERDR_PANE_ID`

### 5.3 SKILL 安全与编排约定

1. **必须 `HERDR_ENV=1`**，否则拒控（防外部 agent 乱控会话）。  
2. 默认 **sibling pane + `--no-focus`**，不抢用户焦点。  
3. ID **只从 JSON 解析**，不猜侧栏顺序。  
4. 交互式 agent：先起 TUI → wait idle → `pane run` 提交任务（不默认 argv 塞 prompt）。  
5. 后台完成：wait `working` → wait `done` → `pane read`。  
6. 不关自己没创建的 pane；绝不随意 `server stop`。

**这是「agent 编排 agent」的产品化交互语言**，比抽象 multi-agent 框架更贴编码日常。

---

## 6. 插件

```toml
# herdr-plugin.toml
id / name / version / min_herdr_version
[[actions]]  command = [...]
[[events]]   on = "worktree.created"
[[panes]]    placement = overlay|split|tab|zoomed
[[link_handlers]] pattern = "..."
```

- 链接安装持久化 `plugins.json`  
- 未知 event 名警告但不阻断  
- 平台过滤 `platforms`  
- v1 **无** 托管插件存储 API（路径发现 only）

---

## 7. 与 Hearth 差异总表

| 维度 | Herdr | Hearth |
|------|-------|--------|
| 主对象 | Workspace · Pane · Agent 态势 | Project · WorkItem · Team |
| 进程 | 真实 PTY 多路 | Provider Session（常即 CLI 进程） |
| 注意力 | blocked/working/**done(未见)**/idle | Pulse 硬门 + Live + Return |
| 持久 | server live + snapshot + native resume | WorkItem FSM + Timeline |
| 编排 | Socket + wait + split | Daemon 派活 / later Thread |
| UI | TUI 侧栏 rollup | Pulse / Board Web |
| 许可 | AGPL + 商业 | 设计期未绑 |

---

## 8. 可汲取智慧（给 Hearth，按优先级）

### P0 — 合同 / 注意力模型

1. **Agent 态势四态 +「未见」**  
   - 映射 Pulse：`blocked` → 硬门/need_input；`working` → Live；**`done`（未见）→ Return 待逛**；`idle`（已见）→ 安静。  
   - WorkItem 可保留 FSM；**Session 观察态** 增加 `attention: unseen_complete | seen`（或等价字段）。

2. **状态单权威源**  
   - Provider Adapter 报状态时：lifecycle 报告与 screen 启发式 **互斥**（Herdr status authority）。  
   - 禁止双源打架导致假 blocked。

3. **Rollup 到 Project / Team**  
   - Pulse Return / 顶栏：按 Project（或 Team）汇总 blocked 数、unseen done 数（侧栏 rollup 思想）。

4. **Detach 心智 = 异步 CVO**  
   - 「离开」= 不杀 Session；CLI `hearth` / Pulse 是 reattach，不是重启。  
   - 文档与 UX 明确区分 **stop work** vs **detach attention**。

### P1 — 运行时与 API

5. **可编程控制面分层**  
   - CLI 包装 / raw API / agent skill 三层（Herdr 已验证）。  
   - Hearth：`hearth` CLI · Daemon API · 可选 **SKILL 片段** 教 Provider 如何 `work wait` / 读 Live。

6. **wait 原语**  
   - `hearth wait work --status blocked|done` / `wait session --exit` — 对齐 `herdr wait agent-status`。  
   - 支撑 Bundle 后并行修、或脚本编排。

7. **Worktree API 与 Project**  
   - 已有 M0.2.10 isolation；Herdr 的 worktree↔workspace 一等可强化：`worktree create` 即新 Project 视图或 Session.cwd 绑定。

8. **Native session resume 字段**  
   - Session 存 `provider_session_ref`（Codex/Claude resume id）；Daemon 重启后可 resume（对齐 Herdr + Codeg 导入）。

9. **Server 真相 / Client 投影**  
   - 强化：Pulse 禁止直连 Provider（已有）；协议版本 `PROTOCOL_VERSION` 思维可抄。

### P2 — 明确不抄 / 边界

10. **不**用 TUI 多路复用器取代 Board 账本。  
11. **不**在 M1 做 screen-scrape 状态检测（脆）；优先 Adapter 结构化事件，screen 仅 fallback later。  
12. AGPL 传染风险：Hearth 若链接/内嵌需法务评估；默认 **集成调用**（spawn `herdr` / 兼容 socket）而非 fork 进内核。  
13. **不**默认存满屏 history（密钥）；对齐 quiet + 最小审计。

---

## 9. 域映射一图

```text
Herdr Workspace     ≈  Hearth Project（注意力容器）+ 运行时布局
Herdr Tab           ≈  可选「视图」分组（非域根）
Herdr Pane/PTY      ≈  Session 承载进程（Provider CLI）
Herdr Agent state   ≈  Session 观察态 + Pulse 注意力
Herdr blocked       ≈  Approval / need_input / 硬门
Herdr done (unseen) ≈  Return「待逛」完成项
Herdr Socket API    ≈  Daemon API + CLI
Herdr SKILL.md      ≈  Provider/Member 可注入的编排说明
Herdr worktree API  ≈  Project + Session.worktree_path / Automation isolation
```

---

## 10. 风险与边界（Herdr 自身）

| 风险 | 说明 |
|------|------|
| Screen detection 脆 | 新 UI 会漏 blocked；靠 explain + remote manifest 迭代 |
| AGPL | 二次分发与商业闭源有压力 |
| 不是账本 | 无 Acceptance/Work FSM；完成定义靠人看终端 |
| Handoff 实验 | live update handoff 仍 experimental |
| 单机 socket | 安全依赖本机权限模型 |

---

## 11. 参考路径

| 路径 | 内容 |
|------|------|
| `README.md` | 定位与安装 |
| `AGENTS.md` | 架构原则、state/runtime、检测纪律 |
| `SKILL.md` | Agent 编排 Herdr 的完整约定 |
| https://herdr.dev/docs/concepts/ | workspace/tab/pane/agent |
| https://herdr.dev/docs/agents/ | 状态权威、manifest、rollup |
| https://herdr.dev/docs/session-state/ | detach / snapshot / resume / handoff |
| https://herdr.dev/docs/socket-api/ | 完整 API 与 events |
| `src/detect/` · `src/pane/` · `src/workspace/` · `src/server/` | 实现落点 |
| `docs/next/api/herdr-api.schema.json` | 协议 schema（随二进制） |

---

## 12. 一句话收束

**Herdr 证明：多 agent 并行的关键不是再做一个聊天聚合器，而是「真实进程 + 可 detach 的 server + 语义态势（尤其 blocked 与未见完成）+ 可编程 wait/split + 状态单权威」；Hearth 应把这些收成 Pulse 注意力模型与 Daemon 运行时合同，而继续用 Board/WorkItem 定义「完成承诺」。**
