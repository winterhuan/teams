# Nezha 项目深度分析

> 分析对象：[`hanshuaikang/nezha`](https://github.com/hanshuaikang/nezha)  
> 一句话：面向 Claude Code / Codex 的本地多项目 Agent IDE 与任务工作台  
> 分析版本：`main@baf96ac`（2026-07-08），最新 Release `v0.4.5`（2026-07-05）  
> 许可证：GPL-3.0  
> 技术栈：React 19 + TypeScript + Vite 8 · Tauri 2 + Rust · xterm.js · CodeMirror · Shiki  
> 仓库状态：创建于 2026-03-22；分析时约 1.8k stars / 171 forks / 47 open issues  
> 分析日期：2026-07-12  
> 一手材料：[README](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/README.md) · [AGENTS.md](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/AGENTS.md) · `src/**` · `src-tauri/src/**` · [GitHub API](https://api.github.com/repos/hanshuaikang/nezha) · [Releases](https://github.com/hanshuaikang/nezha/releases)

---

## 1. 项目定位与核心判断

### 1.1 一句话定位

**Nezha 是一个“Agent-first 的轻量本地 IDE”：以 Project 为导航轴，把 Claude Code / Codex 原生 CLI 会话、Task 生命周期、PTY 终端、Git/worktree、代码浏览、会话回放和 Skill 管理收进一个约 7-13MB 的跨平台桌面应用。**

官方口号是“哪吒：三头六臂，并发编程”，其核心问题不是让单个 Agent 更聪明，而是让人能同时追踪多个项目、多个任务和多个原生 CLI 会话，减少在终端、IDE、Git 工具和会话历史之间切换。

来源：[README 定位与功能](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/README.md)、[package.json](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/package.json)

### 1.2 它是什么

| Nezha 是 | 说明 |
|---|---|
| **本地桌面 Agent 工作台** | Tauri 进程直接启动和管理本机 Claude Code / Codex |
| **Project-first 多项目壳** | Project Rail 快速切换项目；Task 永远归属 Project |
| **Task 生命周期投影器** | 把 CLI 进程、hook、会话文件和用户操作折叠为可见 Task 状态 |
| **原生 CLI 会话查看器** | 自动发现 Claude/Codex session 文件，结构化回放与 resume |
| **轻量开发闭环** | 下发任务 → 看终端 → 等介入 → 看 diff → commit/push/merge worktree |
| **Skills 软链管理器** | 设一个 Skill Hub，通过软链安装到不同项目/Agent 的技能目录 |

### 1.3 它不是什么

| Nezha 不是 | 证据与边界 |
|---|---|
| **不是自研 Agent/LLM runtime** | 推理、tool loop、context 管理由 Claude Code / Codex 自己完成；Nezha 只负责启动、PTY、hook 和会话解析 |
| **不是常驻 Daemon 控制面** | 权威运行态主要在 Tauri 桌面进程的 `TaskManager` 内；退出应用会失去 PTY/子进程宿主能力 |
| **不是多 Agent 团队编排平台** | Agent 类型只有 `claude | codex`；没有 Soul、Posting、A2A Thread、handoff 或跨模型审查协议 |
| **不是统一 Provider 协议层** | Claude 与 Codex 分别构造命令、监听不同 session 格式，没有开放 Provider registry/adapter contract |
| **不是知识/记忆系统** | 没有长期记忆聚合、召回或知识写入；Skill Hub 是文件分发，不是 Memory |
| **不是 Artifact OS** | 产出主要以工作区文件、Git diff 和 session transcript 呈现，没有 medium/version/export 型 Artifact 根 |

这些判断来自 [Task/Agent 类型](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src/types.ts)、[TaskManager](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/lib.rs)、[PTY 启动实现](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/pty.rs)。

---

## 2. 整体架构

### 2.1 运行时拓扑

```text
React UI
  Project Rail · Task Panel · Terminal · Session Viewer
  File Explorer · Git Changes/History · Skill Hub
        │ Tauri commands / events / IPC Channel
        ▼
Tauri 2 + Rust desktop process
  TaskManager
  ├─ PTY masters / writers / child handles
  ├─ Claude/Codex session mapping
  ├─ hook event watcher
  ├─ file/git/worktree services
  └─ JSON persistence
        │
        ├─ spawn Claude Code CLI
        ├─ spawn Codex CLI
        ├─ read ~/.claude / ~/.codex session JSONL
        ├─ git subprocess
        └─ project filesystem
```

Nezha 没有独立 server 包，也没有 WebSocket/RPC 协议。React 前端通过 Tauri command 调 Rust；高频终端输出使用 `tauri::ipc::Channel<String>` 定向推送，状态变化用全局 Tauri event。

来源：[AGENTS 架构说明](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/AGENTS.md)、[lib.rs command 注册](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/lib.rs)

### 2.2 前端模块

| 模块 | 作用 |
|---|---|
| `App.tsx` | 根状态：projects、tasks、buffers、事件监听和持久化协调 |
| `ProjectRail` | 跨项目切换、隐藏/展开、活动圆点、拖拽排序 |
| `TaskPanel` | 当前 Project 的任务列表、分支栏与设置入口 |
| `NewTaskView` | Prompt、附件、@文件、Agent、权限、worktree 启动方式 |
| `RunningView` / `TerminalView` | 活 Task 的 PTY、状态、用量和控制 |
| `SessionView` | Claude/Codex JSONL 会话的结构化回放/Markdown 导出 |
| `FileExplorer` / `FileViewer` | 项目文件树、搜索、编辑和图片/Markdown预览 |
| `GitChanges` / `GitHistory` | diff、stage、commit、push/pull 和历史浏览 |
| `SkillHubView` | Skill 集中目录、安装关系、冲突与健康检查 |
| `TimelineView` | 跨项目任务时间线，按日期和 Project 分组 |

来源：[AGENTS 组件树](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/AGENTS.md)、[`src/components`](https://github.com/hanshuaikang/nezha/tree/baf96ac31b351ea67494bf4af1346125daad3b21/src/components)

### 2.3 Rust 后端模块

| 文件 | 职责 |
|---|---|
| `pty.rs` | Agent/Shell PTY、进程生命周期、输入、resize、resume |
| `session.rs` | 会话发现、增量监听、消息解析、Markdown 导出 |
| `hooks.rs` | Claude/Codex hook 安装、能力探测、配置注入与卸载 |
| `event_watcher.rs` | 监听 hook JSONL，映射为 Task 状态与系统通知 |
| `storage.rs` | Project/Task 文件持久化与原子写 |
| `git.rs` | Git 状态、分支、diff、stage、commit、push/pull、worktree |
| `fs.rs` / `fs_watcher.rs` | 文件读写、搜索、预览和非递归 watch |
| `skills.rs` | Skill Hub、frontmatter、软链安装、冲突/漂移检测 |
| `analytics.rs` / `usage.rs` | session metrics、Claude/Codex 用量快照 |
| `agent_assist.rs` | 用 headless Claude/Codex 生成 Task 名与 commit message |

来源：[后端模块清单](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/AGENTS.md)、[`src-tauri/src`](https://github.com/hanshuaikang/nezha/tree/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src)

---

## 3. 域模型

### 3.1 Project

```ts
interface Project {
  id: string
  name: string
  path: string
  branch?: string
  lastOpenedAt: number
  hiddenFromRail?: boolean
}
```

Project 本质是“登记过的本地目录”，同时承担：

- Project Rail 导航单位
- Task 所有者
- Git/worktree 基准仓库
- 文件树根
- `.nezha/config.toml` 配置边界
- Skill 安装目标

它比 Codeg 的 Folder 更产品化，但仍然是 **path-first Project**，没有作品 medium、Artifact 所有权、团队派驻等上层语义。

来源：[types.ts Project](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src/types.ts)、[config.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/config.rs)

### 3.2 Task

Task 是 Nezha 的真正工作原子：

```ts
interface Task {
  id: string
  projectId: string
  name?: string
  prompt: string
  agent: "claude" | "codex"
  permissionMode: "ask" | "auto_edit" | "full_access"
  status: TaskStatus
  createdAt: number
  updatedAt?: number
  attentionRequestedAt?: number
  starred?: boolean
  failureReason?: string
  claudeSessionId?: string
  claudeSessionPath?: string
  codexSessionId?: string
  codexSessionPath?: string
  worktreePath?: string
  worktreeBranch?: string
  baseBranch?: string
  worktreeDiscarded?: boolean
  additions?: number
  deletions?: number
}
```

Task 同时混合了四类信息：

1. **业务意图**：prompt/name/project
2. **执行配置**：agent/permissionMode
3. **运行态投影**：status/failure/attention
4. **执行产物引用**：session path/worktree/diff stats

这是一个很实用的 MVP 聚合，但长期会遇到 WorkItem、Session、Workspace 和 UI attention 互相缠绕的问题。

来源：[types.ts Task](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src/types.ts)、[storage.rs 镜像结构](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/storage.rs)

### 3.3 Task 状态机

```text
todo → pending → running ↔ input_required
                         ↘ awaiting_review
running → detached / interrupted
任意活跃态 → done | failed | cancelled
```

完整枚举：

| 状态 | 含义 |
|---|---|
| `todo` | 尚未启动的任务草稿 |
| `pending` | 已创建，Agent 进程/Session 尚未就绪 |
| `running` | 正在执行 |
| `input_required` | Agent 等待用户输入或权限确认 |
| `awaiting_review` | 执行结束，worktree/diff 等待人工复核 |
| `detached` | 终端断开，但保留可恢复会话语义 |
| `interrupted` | 被中断，允许后续恢复 |
| `done` | 用户确认完成 |
| `failed` | 进程或会话失败 |
| `cancelled` | 用户取消 |

**关键优点：`awaiting_review` 与 `done` 分离。** Nezha 没有把“Agent 进程退出”等同于“业务完成”，而是给 worktree/diff 一个明确的人审阶段。这一点与 Hearth 的 `in_review` 非常一致。

### 3.4 Session

Session 没有独立持久化模型，而是以 `Task.*SessionId/*SessionPath` 引用 Claude/Codex 自己的 JSONL 文件。运行时 `TaskManager` 保存 task → session 映射与“已认领路径”，防止同一原生会话被多个 Task 绑定。

因此 Nezha 的 Session 是：

- Provider-native session 的索引
- Task 的执行附属
- resume 与 transcript 回放的凭据

它不是统一 Provider Session，也没有 session attempt、context snapshot、budget 或独立状态机。

来源：[session.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/session.rs)、[TaskManager](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/lib.rs)

---

## 4. Agent 执行链

### 4.1 新建 Task

用户在 `NewTaskView` 中选择：

- Claude 或 Codex
- 权限模式
- 直接在 Project root 运行或创建 worktree
- Prompt、文本附件、图片附件、@项目文件

前端先写入 Task，再调用 Rust `run_task`。如果启用 worktree，会先创建基于当前/指定 base branch 的独立 checkout，并把执行 cwd 切到 worktree。

来源：[NewTaskView](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src/components/NewTaskView.tsx)、[run_task](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/pty.rs)、[create_task_worktree](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/git.rs)

### 4.2 权限映射

| Nezha 模式 | Claude Code | Codex |
|---|---|---|
| `ask` | `--permission-mode default` | 默认 approvals/sandbox |
| `auto_edit` | `--permission-mode acceptEdits` | `--sandbox workspace-write -a on-request` |
| `full_access` | `--dangerously-skip-permissions` | `--dangerously-bypass-approvals-and-sandbox` |

优点是给用户一个跨 Agent 的三档统一选择；缺点是它是 **CLI flag 映射**，不是 Nezha 自己的 action-level policy。尤其 `full_access` 直接跳过 Provider 的审批/沙箱，没有 Daemon 侧二次门禁。

来源：[build_claude_cmd / build_codex_cmd](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/pty.rs)

### 4.3 PTY 与输出

`portable-pty` 创建真实交互终端，`TaskManager` 持有 master/writer/child handle。终端输出通过 IPC Channel 直达对应前端 `useTerminalManager`，前端用 buffer/ref + RAF 批量写 xterm，避免每个 chunk 触发 React 全局渲染。

这条链路体现出成熟的桌面终端工程意识：

- 输出不走全局 event bus
- 后端批量 flush
- 前端 RAF 合并
- WebGL addon + scrollback 控制
- selection/input 性能被列为项目“最高优先级红线”

来源：[pty.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/pty.rs)、[useTerminalManager](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src/hooks/useTerminalManager.ts)、[AGENTS 性能规则](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/AGENTS.md)

### 4.4 结束不等于完成

进程退出时 `finalize_task_exit` 会综合判断：

- 是否真正发现 Provider session
- 是否人为取消/完成
- 是否为 worktree Task
- 是否产生 diff
- 是否异常退出

典型结果是进入 `awaiting_review`，让用户查看改动、合并或丢弃 worktree，而不是自动 Done。

**这是 Nezha 最值得借鉴的地方之一：Provider 生命周期与 Work 状态不是同一件事。**

---

## 5. Hook、Session 发现与 Attention

### 5.1 双通道状态感知

Nezha 同时使用两种信号：

1. **Agent hook 事件**：低延迟、语义明确
2. **Session JSONL 增量监听**：发现会话、解析消息、作为 hook 不可用时的兜底

Claude 与 Codex 的 hook 能力、事件字段和配置方式不同，因此分别处理。事件写入 `~/.nezha/events/<taskId>/events.jsonl`，`event_watcher` 增量读取并投影为 Task status。

来源：[hooks.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/hooks.rs)、[nezha-hook.mjs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/nezha-hook.mjs)、[event_watcher.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/event_watcher.rs)

### 5.2 Attention 模型

当 hook/session 检测到以下情况时，Task 进入 `input_required` 并触发通知/角标：

- Agent 明确请求用户输入
- 工具调用需要确认
- Claude Stop/Notification 表示等待下一轮
- Codex function call/request_user_input 或需要审批的工具调用

收到新 user message、PostToolUse 或工具完成后，状态会恢复 `running`。

这不是一个完整的 Approval 根，但已经形成实用的 attention loop：

```text
后台 Task 运行
  → hook/session 发现需要人
  → Task=input_required
  → 系统通知 + Rail/列表角标
  → 人进入终端回复/批准
  → running
```

### 5.3 Hook 工程细节

值得注意的实现选择：

- Claude 优先通过启动参数 `--settings` 使用 Nezha 自有配置，避免长期污染用户全局配置
- Codex 配置使用 marker 块注入/卸载
- 有版本门槛与 Node 能力检测
- hook 不可用时必须能退回 session 文件轮询
- 旧版配置残留有专门的 cleanup
- 事件 watcher 只处理 Nezha 需要的语义事件，不试图复制 Provider 全协议

局限是 Codex 路径使用 `--dangerously-bypass-hook-trust` 简化 hook 信任，这降低了安全上限。项目自己的参考文档也明确记录了这个 trade-off。

来源：[agent-hooks-support.md](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/knowledge/references/agent-hooks-support.md)

---

## 6. Git 与 Worktree 闭环

### 6.1 Git 能力不是装饰

`git.rs` 覆盖：

- status、branch list、checkout/create branch
- log、commit detail、file/commit diff
- stage/unstage 单文件、多文件、全部
- discard（包括 untracked 文件的安全处理）
- commit、push、pull、remote counts
- AI 生成 commit message
- Task worktree create/merge/remove/diff stats

来源：[git.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/git.rs)

### 6.2 Task Worktree 模型

每个 worktree Task 保存：

- `worktreePath`
- `worktreeBranch`
- `baseBranch`
- `worktreeDiscarded`
- additions/deletions

任务完成后用户可以：

1. 查看相对 base branch 的 diff
2. 合并 worktree
3. 丢弃 worktree
4. 保留审计字段但禁用继续 resume/merge

这是一条清楚的 tracer bullet：**Task 级隔离 → Agent 执行 → Review → Merge/Discard**。

### 6.3 安全细节

Git 路径会校验为绝对合法 Project path；相对文件路径拒绝逃逸；对 `.git`、worktree 管理文件等保护路径有额外限制；删除 untracked 内容优先进入系统废纸篓而非直接 `rm`。

这比“把 git 命令暴露给前端”成熟得多。

---

## 7. Skill Hub

### 7.1 模型

Nezha 允许指定一个本地目录或 Project 作为 Skill Hub，扫描其中的 Skill 目录和 `SKILL.md` frontmatter，然后按 Project × Agent 建立安装关系。

```text
Skill Hub canonical directory
  ├─ skill-a/SKILL.md
  └─ skill-b/SKILL.md
        │ symlink
        ├─ project/.claude/skills/skill-a
        └─ project/.codex/skills/skill-a
```

`SkillInstallation` 记录 skill、project、agent、link path、target path 和健康状态。

来源：[types.ts Skill Hub](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src/types.ts)、[skills.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/skills.rs)

### 7.2 有价值的产品细节

- `detect / skip / overwrite / cancel` 冲突策略
- 区分现有 file/directory/symlink
- 检测软链 broken/diverged
- 安装记录与真实磁盘状态交叉校验
- 删除 Skill 时清理相关软链
- Skill 名做路径安全校验
- 自己解析常见 YAML frontmatter/block scalar，避免引入大依赖

### 7.3 边界

Skill Hub 是 **分发/挂载系统**，不是能力沙箱：

- 不做签名、来源信任、release age 或安全扫描
- 不描述 Skill 与 Tool 权限的组合
- 没有 Team 默认 Skill / Posting 项目覆盖层
- 不管理 Skill 运行时版本锁

因此 Hearth 可借鉴软链与 health 检测，但仍需自己的供应链与 Posting 语义。

---

## 8. UI 与交互设计

### 8.1 信息架构

```text
Welcome / Timeline
  → Project
     ├─ Rail：跨项目切换与活动点
     ├─ Task Panel：任务列表 + branch
     ├─ Main：New / Todo / Running Terminal / Session 回放
     └─ Right：Files / Git Changes / Git History / Shell
```

Nezha 的 IA 与 Hearth M0.5 有明显同构：

- Project 是中心
- 进入 Project 后主面是任务/会话
- 左侧跨 Project Rail
- 右侧文件/Git 作为工作上下文
- 后台任务通过圆点/通知召回注意力

区别在于 Nezha 是 **Task-first terminal IDE**，Hearth 是 **chat-first Agent OS**。

### 8.2 Project Rail

Rail 支持：

- 常驻与隐藏 Project
- 拖拽排序
- 搜索/展开全部
- 活动状态圆点
- 当前 Project 快速切换

这与 Hearth 原型 Rail 的方向高度一致，而且是已经产品化的参考。

来源：[`project-rail`](https://github.com/hanshuaikang/nezha/tree/baf96ac31b351ea67494bf4af1346125daad3b21/src/components/project-rail)、[ProjectRail.tsx](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src/components/ProjectRail.tsx)

### 8.3 Timeline

跨 Project Timeline 按今天/昨天/更早分组，再按 Project 二级分组。它提供“最近发生了什么”的时间脸，但不会取代 Project 主入口。

对 Hearth 的启发：Inbox 是“需要介入”，Timeline 是“完整历史”；两者应分开，不要让 Inbox 变成噪音 Activity Feed。

### 8.4 视觉与密度

Nezha 提供 light/dark/eyecare/midnight、多字体、终端字号和 scrollback 设置。UI 是开发者工具式中高密度，而不是营销化 Agent 角色界面。

其优势是实用、信息量高；风险是 App 根状态和 props 较重，功能继续增长时容易形成“多面板 IDE”复杂度。

---

## 9. 持久化与可靠性

### 9.1 数据布局

```text
~/.nezha/
  projects.json
  projects/<projectId>/tasks.json
  events/<taskId>/events.jsonl
  settings.json
  skills installations/config

<project>/.nezha/
  config.toml
  attachments/<taskId>/...
```

### 9.2 原子写

`storage.rs` 的写入流程：

1. 创建包含 pid+纳秒的唯一临时文件
2. 写完整内容
3. `sync_all` 强制数据落盘
4. rename 替换目标
5. 失败时清理临时文件

读取损坏 `tasks.json` 时不会直接覆盖，而是重命名为 `tasks.json.corrupt-<timestamp>` 保留人工恢复现场。

来源：[storage.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/storage.rs)

这是很好的本地优先工程实践，特别适合 Hearth 早期文件账本。

### 9.3 局限

- Project/Task 全量数组 JSON，缺少事务与并发写协调
- Task 状态与进程状态跨前后端更新，崩溃恢复依赖磁盘快照和 session 文件
- 没有 append-only Timeline 作为审计权威
- 高频状态变化仍可能造成冗余磁盘写，AGENTS 已把 300-500ms 防抖列为待改进项
- 桌面进程退出后没有 server 继续拥有任务

---

## 10. 工程成熟度

### 10.1 积极信号

- Windows/macOS/Linux 多架构 Release
- CI checks 与自动发布
- TypeScript/Rust 双侧模型有明确同步纪律
- 终端、文件 watcher、session 大文件、路径遍历等都有专门防劣化规则
- 测试覆盖 theme、path drop、file tree、git diff、terminal interaction 等关键工具逻辑
- 代码已按业务模块拆分，Rust `lib.rs` 保持相对薄
- 对历史事故有注释和恢复策略，而不是只留“TODO”

### 10.2 已知技术债

项目自己的 `AGENTS.md` 坦诚记录：

- `App.tsx` 仍持有大量全局状态
- ProjectPage 等 props 面宽
- Session/Git 长列表未全面虚拟化
- 大 Markdown 同步解析可能阻塞 UI
- Git/fs 的部分 async command 内部仍执行同步阻塞 I/O
- `read_session_messages` 可能全文件读入内存
- 高频 Task 保存缺防抖
- 一些锁持有期间执行 I/O

这些不是“分析者猜测”，而是上游明确的防劣化清单：[AGENTS 已知技术债](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/AGENTS.md)。

### 10.3 成熟度判断

**Nezha 已超过玩具原型，处于快速产品化的早期桌面应用阶段。**

依据：

- 真实跨平台发行与用户量
- 会话/hook/PTY/Git/worktree 都是可运行实现
- 有事故驱动的健壮性处理
- 但对象模型、Provider 抽象、后台守护和大型状态架构仍偏 MVP

---

## 11. 与同类项目的坐标

| 项目 | 核心 | Nezha 的相对位置 |
|---|---|---|
| **Codeg** | 多 Provider 会话聚合、ACP、委托、自动化 | Nezha 更轻、更原生终端、更少 Provider；缺委托与 server |
| **Herdr** | PTY multiplexer、detach server、agent status、socket API | Nezha UI/Git/文件闭环更完整；Herdr 长跑与可编程控制更强 |
| **Paseo** | Daemon、Provider、Timeline、跨设备、agent/subagent | Nezha 更像本机 IDE；Paseo 更像 Agent 控制基础设施 |
| **Dyad** | Chat→代码→live preview App Builder | Nezha 不绑定 App medium，主预览是 terminal/files/diff |
| **Clowder AI** | Soul/Team/A2A/SOP/Memory | Nezha 没有团队身份和平台协作层 |
| **Hearth** | Project 中心、chat-first、Daemon 账本、Posting、Artifact | Nezha 是非常好的 Project×Task×Terminal UI 参考，不是域内核替代品 |

---

## 12. 与 Hearth M0.5 的映射

### 12.1 对象映射

| Nezha | Hearth | 结论 |
|---|---|---|
| Project | Project | 高度接近；Nezha 更偏 path，Hearth 还拥有 Artifact/Issue/Posting |
| Task | WorkItem + active Session + attention 投影 | Nezha Task 过宽；Hearth 应保持分离 |
| AgentType | Provider 选择 | Nezha 是闭合枚举，Hearth 用注册表 |
| permissionMode | autonomy/action policy 的粗投影 | 可学 UI 三档，不学直接 bypass |
| native Session ref | Session.provider_session_ref | 直接可吸收 |
| worktree fields | M1 Session 字段 / M3 Workspace | 与 Hearth 阶段边界吻合 |
| Task status | WorkItem FSM + Session attention | 需拆成业务/执行两轴 |
| Project Rail activity | Rail rollup / Inbox | 强参考 |
| SkillInstallation | Posting.skill 挂载 | 可吸收软链和 health，不等于 Posting |
| Timeline | Timeline 事件投影 | 可作为 Inbox 外的历史表面 |
| Git diff stats | Acceptance/Closeout 证据 | 可作为 code medium 的机器证据 |

### 12.2 对 Hearth 最有价值的机制

#### A. Hook-first + session-file fallback

优先使用 Provider 的结构化 hook；不可用时回退原生 session 文件增量监听。Hearth Provider adapter 可以直接采用这一层次：

```text
native structured event
  > native session JSONL
  > screen/PTY heuristic（最后兜底）
```

#### B. Attention 不是执行状态

Nezha 已经用 `input_required` 和通知表达“现在需要人”。Hearth 应进一步把它拆为 `Session.attention`，避免污染 WorkItem FSM。

#### C. Project Rail 的活动投影

跨项目 rail 圆点、隐藏/展开、快速切换是 Hearth M0.5 原型可直接参考的产品化答案。

#### D. Task→Worktree→Review→Merge/Discard

这是 coding Project 的最短闭环，适合作为 Hearth M2/M3 Workspace 的 tracer bullet。

#### E. 本地 JSON 的崩溃恢复

`fsync + rename + corrupt quarantine` 值得直接写入 Hearth M1 文件存储规范。

#### F. Skill 软链 + 漂移健康

适合 Hearth Posting.skill 挂载的本地实现，但必须再叠加来源信任和版本锁。

### 12.3 不应照搬

| 不照搬 | 原因 |
|---|---|
| Task 同时承担 Work/Session/attention/worktree | 会让状态事务和重试边界模糊 |
| `AgentType = claude | codex` | Hearth 必须开放 Provider registry |
| 桌面进程拥有运行真相 | 离开/退出不应杀掉异步工作；Daemon 才是权威 |
| `full_access` 直接 bypass Provider 安全 | Hearth L0 必须在副作用发生前由平台侧审批 |
| session 文件就是长期记录 | Provider transcript 不等于 Hearth Thread/Timeline 真相 |
| Skills 只靠软链 | 缺供应链、pin、审计和权限组合 |
| Git/文件作为唯一产物 | Hearth 还要支持 novel/image/video/app 等 medium Artifact |
| Timeline 与 Inbox 合并 | 历史活动和需要介入的事件密度不同 |

### 12.4 对当前 M0.5 原型的具体启发

1. **Rail 圆点不只显示数量，应表达最高 attention 状态**：阻塞 > 待复核 > 运行 > 未读完成。
2. **Workspace section 的 M1 定义可参考 Nezha**：文件树、Git changes/history、commit 锚；仍明确它只是 `root_path/cwd` 投影。
3. **Board 的 coding Issue 可显示 diff stats**：`+123/-45` 是低成本验收证据。
4. **Chat 右栏“文件”与 Workspace section 分工**：右栏只显示当前 Session 相关文件；Workspace section 是全项目文件/Git 浏览。
5. **Provider readiness doctor**：启动 Task 前检查 CLI 路径、版本、hook 能力和 session 目录。
6. **原生 session 导入应保持只读旁路**：可浏览/resume，但不自动升级为 Hearth Thread 真相。

---

## 13. 风险与边界

### 13.1 产品风险

- “轻量 IDE”功能面不断扩张，可能重走传统 IDE 的复杂度
- 只支持 Claude/Codex 时体验可精雕，但 Provider 扩张会迅速暴露抽象缺失
- Task/Terminal/Git 很适合 coding，对非代码产物缺少自然扩展路径
- 桌面应用退出与后台 Agent 长跑的语义不够稳定

### 13.2 架构风险

- 大量顶层状态集中在 React `App.tsx`
- Task 结构混合多层状态
- 文件 JSON 缺少跨进程事务
- hook/session 格式依赖 Provider 私有实现
- Rust async command 中仍有同步阻塞调用
- session 大文件解析与长列表渲染存在规模上限

### 13.3 安全风险

- full access 直接使用 Provider bypass flag
- Codex hook trust 采用 bypass
- Skill 缺少供应链信任
- 应用拥有文件/Git/进程广泛权限，Tauri command 的路径校验必须持续严格

---

## 14. 综合评价

### 14.1 优势

1. **产品焦点清楚**：多项目、多任务、多 Agent CLI 的注意力管理
2. **轻量且完整**：小安装包内做成 terminal/files/git/worktree/session 闭环
3. **尊重原生 CLI**：不重写 Claude/Codex，只做高质量宿主
4. **Attention 产品化**：hook、通知、Rail、Task 状态互相配合
5. **Git/worktree 真落地**：不是 README feature checkbox
6. **工程经验诚实**：崩溃恢复、终端性能、session 兼容都留下明确防线

### 14.2 局限

1. Provider 抽象封闭
2. 无 Daemon / detach 长跑控制面
3. 无 Team/Soul/Posting/A2A
4. 无独立 Thread/Timeline 权威
5. 无 Artifact/Memory/Acceptance 模型
6. Task 聚合过宽
7. 权限只是 CLI flag 映射

### 14.3 一句话收束

**Nezha 是目前非常值得 Hearth 参考的“Project-first 本地 Agent IDE 外壳”：它把原生 CLI、Task attention、终端、Git/worktree、文件与 Skill 管理做成了紧凑闭环；但它的上限仍是桌面工作台，而不是 Daemon 账本驱动的个人 Agent OS。Hearth 应吸收它的执行表面与工程细节，同时坚持自己的 Provider、WorkItem/Session 分离、Posting、Artifact 和异步控制面。**

---

## 15. 关键源码索引

| 主题 | 一手来源 |
|---|---|
| 产品定位 | [README](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/README.md) |
| 工程架构与技术债 | [AGENTS.md](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/AGENTS.md) |
| 版本与依赖 | [package.json](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/package.json) · [Cargo.toml](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/Cargo.toml) |
| Project/Task/Skill 类型 | [src/types.ts](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src/types.ts) |
| Tauri 状态与命令 | [src-tauri/src/lib.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/lib.rs) |
| Agent PTY/生命周期 | [pty.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/pty.rs) |
| Session 发现/解析 | [session.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/session.rs) |
| Hook 注入 | [hooks.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/hooks.rs) |
| Hook 事件投影 | [event_watcher.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/event_watcher.rs) |
| 文件持久化 | [storage.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/storage.rs) |
| Git/worktree | [git.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/git.rs) |
| Skill Hub | [skills.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/skills.rs) |
| Project 配置 | [config.rs](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/src-tauri/src/config.rs) |
| Hook 兼容说明 | [agent-hooks-support.md](https://github.com/hanshuaikang/nezha/blob/baf96ac31b351ea67494bf4af1346125daad3b21/knowledge/references/agent-hooks-support.md) |
| 最新发布 | [v0.4.5](https://github.com/hanshuaikang/nezha/releases/tag/v0.4.5) |
