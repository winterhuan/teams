# acpx 项目深度分析

> 分析对象：`references/acpx`  
> 版本：`0.11.2`  
> 维护方：OpenClaw Team  
> 许可证：MIT  
> 状态：Active Alpha

---

## 1. 项目定位与愿景

### 1.1 核心定位

`acpx` 是 **Agent Client Protocol (ACP)** 的无头 CLI 客户端——让你从命令行与 coding agent 对话，**不刮 PTY 终端**，直接走结构化 JSON-RPC。

> *"The smallest useful ACP client: a lightweight CLI that lets one agent talk to another agent through ACP without PTY scraping or adapter-specific glue."*

### 1.2 双重角色

| 角色 | 说明 |
|------|------|
| **人类/脚本可用的 CLI** | `acpx codex 'fix the bug'`、`acpx pi 'review this'` |
| **可嵌入的后端层** | 导出 `acpx/runtime`、`acpx/flows`，供编排器复用 session/queue/权限逻辑 |

Vision 文档明确：**主要用户是另一个 agent、编排器或 harness**；人类可用性是次要约束。

### 1.3 刻意不做的事（Vision §What acpx should not become）

- 大而全的自动化框架
- 替代每个 agent harness
- UI 厚重的产品
- 无核心的 agent 特例堆叠

测试标准：**这让 acpx 作为 ACP 客户端/后端更 interoperable、更 robust、更有用吗？**

---

## 2. 整体架构

### 2.1 数据路径

```
CLI 命令 (src/cli.ts)
    ↓
cli-core.ts（命令路由、输出策略）
    ↓
AcpClient (src/acp/client.ts)
    ↓ ndJsonStream stdio
ACP Adapter 子进程（如 npx pi-acp、codex-acp、claude-agent-acp）
    ↓
上游 Coding Agent（Pi、Codex、Claude Code、OpenCode…）
```

**核心原则**：CLI 从不刮终端 ANSI 文本，只处理 ACP 结构化消息。

### 2.2 包结构

| 导出 | 路径 | 用途 |
|------|------|------|
| CLI bin | `dist/cli.js` | `acpx` 命令 |
| `acpx/runtime` | `dist/runtime.js` | 可嵌入运行时（session、queue、probe） |
| `acpx/flows` | `dist/flows.js` | Flow 编排 DSL + 执行引擎 |

### 2.3 技术栈

| 维度 | 选择 |
|------|------|
| 语言 | TypeScript 6，Node ≥ 22.13 |
| ACP SDK | `@agentclientprotocol/sdk` ^0.28.1 |
| CLI | Commander ^15 |
| Schema | Zod ^4.4 |
| 构建 | tsdown，target node22 |
| 质量 | oxlint + oxfmt + tsgo + c8（85% 覆盖率门槛）+ Stryker 变异测试 |
| 包管理 | pnpm |

### 2.4 内置 Agent 注册表

`src/agent-registry.ts` 维护 17+ 内置 agent 名 → adapter 命令映射：

| Agent | Adapter | 上游 |
|-------|---------|------|
| `pi` | `npx pi-acp@^0.0.26` | Pi Coding Agent |
| `codex` | `npx -y @agentclientprotocol/codex-acp@^0.0.44` | Codex CLI |
| `claude` | `npx -y @agentclientprotocol/claude-agent-acp@^0.0.37` | Claude Code |
| `opencode` | `npx -y opencode-ai acp` | OpenCode |
| `cursor` | `cursor-agent acp` | Cursor CLI |
| `gemini` | `gemini --acp` | Gemini CLI |
| … | … | … |

未知名称 fall through 为原始命令；`--agent <command>` 是自定义 escape hatch。

---

## 3. 核心模块深度拆解

### 3.1 ACP 协议流（`src/acp/client.ts`）

典型 prompt 流程：

```
initialize
  → newSession / loadSession（优先 resume）
  → prompt
  → stream sessionUpdate 直到 done
```

- `initialize` 宣告客户端能力：`fs.readTextFile`、`fs.writeTextFile`、`terminal`
- `loadSession` 失败（not-found）→ 回退 `newSession`
- 响应和通知经 formatter 输出（text / json / quiet）

### 3.2 Session 持久化（`src/session/`）

元数据存储：`~/.acpx/sessions/*.json`

每条记录包含：
- stable file/session id
- ACP session id
- agent command、cwd、optional name
- timestamps（`createdAt`、`lastUsedAt`、`closedAt`）
- soft-close 状态
- adapter process pid
- protocol capabilities snapshot

**Scope key**（会话唯一性）：

```text
(agentCommand, absoluteCwd, optional name)
```

同 repo 不同目录 walk 可 auto-resume；`-s backend` / `-s docs` 支持并行工作流。

### 3.3 Queue Owner 生命周期

Prompt 提交是 **queue-aware** 的：

```
并发调用 acpx codex '...'
    ↓
一个进程成为 queue owner（持锁 + Unix socket）
    ↓
其他调用通过本地 IPC 提交 prompt 到 owner
    ↓
队列 drain 后 owner 等待 idle TTL（默认 300s）
    ↓
TTL 到期 → shutdown owner，释放锁
```

设计文档 `docs/2026-02-25-warm-session-owner-architecture.md` 定义了演进目标：
- 调用方 turn 完成后立即退出（不阻塞等 TTL）
- 后台 warm owner 保持 session 温热
- 单 writer 并发模型 + crash-safe 锁回收

### 3.4 权限策略（`src/permissions.ts`）

| 模式 | 行为 |
|------|------|
| `--approve-reads`（默认） | 自动批准 read/search；其他交互提示 |
| `--approve-all` | 自动批准第一个 allow 选项 |
| `--deny-all` | 尽可能拒绝 |

`requestPermission` ACP 回调驱动；统计 requested/approved/denied/cancelled 影响 exit code。

### 3.5 输出格式（`src/cli/output/`）

| 格式 | 用途 |
|------|------|
| `text` | 人类可读流式输出 |
| `json` | NDJSON ACP 事件，管道友好 |
| `quiet` | 仅 assistant 文本；usage/cost 走 stderr |

```bash
acpx --format json codex exec 'review changed files' \
  | jq -r 'select(.type=="tool_call") | [.status,.title] | @tsv'
```

### 3.6 Flows 编排（`acpx/flows`，实验性）

多步工作流引擎，状态持久化在 `~/.acpx/flows/runs/<runId>/`：

| 节点类型 | 职责 |
|----------|------|
| `acp` | 对一个 agent session 跑一轮 ACP turn |
| `action` | 确定性步骤（shell、HTTP） |
| `compute` | 纯函数变换 |
| `decision` | 约束选择分支（acp + parse + switch） |
| `checkpoint` | 暂停等人审或外部触发 |

```bash
acpx flow run ./my-flow.ts --input-json '{"task":"..."}'
acpx --approve-all flow run examples/flows/pr-triage/pr-triage.flow.ts
```

Flow 可声明权限需求（缺 `--approve-all` 则 fail-fast）；支持 per-step `cwd` 隔离（git worktree 模式）。

### 3.7 Compare 命令

```bash
acpx compare pi codex claude 'summarize this checkout'
```

同一 prompt **串行**跑多个 agent（避免并发写同一 checkout），输出 token/耗时/状态对比表。

### 3.8 Conformance 套件

`conformance/` 目录：
- `spec/v1.md`：ACP 核心行为规范
- `cases/*.json`：21 个 conformance case（handshake、prompt、cancel、permission…）
- `runner/run.ts`：自动化探测

用于防止 adapter 行为漂移。

---

## 4. Pi 集成路径

### 4.1 acpx 如何用 Pi

```bash
acpx pi 'fix the flaky test'
acpx pi exec 'summarize repo'        # 一次性，不保存 session
acpx pi sessions new
acpx -s api acpx pi '...'           # 命名并行 session
```

底层：`npx pi-acp@^0.0.26` → Pi 的 ACP adapter → Pi Coding Agent。

### 4.2 与 `pi --mode rpc` 的区别

| 维度 | `acpx pi` | `pi --mode rpc` | `pi-orchestrator` |
|------|-----------|-----------------|-------------------|
| 协议 | ACP JSON-RPC | Pi 自有 RPC JSONL | Orchestrator IPC → Pi RPC |
| Adapter | `pi-acp` 包 | 原生 | 原生子进程 |
| 多 Agent | `acpx <agent>` 切换 | 仅 Pi | 多 Pi 实例 |
| Session | `~/.acpx/sessions` | `~/.pi/agent/sessions` | instances.json |
| 权限 | acpx policy flags | Extension 事件 | 无 |
| 编排 | Flows | 无 | spawn/list/rpc |

**三者互补，不互斥**：
- 要 **ACP 生态互操作** → `acpx pi`
- 要 **Pi 原生 RPC 全能力** → `pi --mode rpc`（Paseo 路线）
- 要 **多 Pi 进程池** → `pi-orchestrator`

### 4.3 与 Paseo Pi Provider 的关系

Paseo 直接 spawn `pi --mode rpc`；acpx 走 `pi-acp` ACP 层。  
若需要编辑器/IDE 级 ACP 兼容，acpx 更合适；若需要 Pi 全量 RPC 事件（extension_ui 等），Paseo 路线更完整。

---

## 5. 测试与工程质量

### 5.1 测试金字塔

| 层级 | 路径 |
|------|------|
| 单元 | `test/*.test.js`（build 到 dist-test） |
| Flow | `test/flows.test.js` 等 |
| Runtime | `test/runtime*.test.js` |
| Live | `test/cursor-live.integration.js`（`test:live`） |
| Conformance | `conformance/runner/run.ts` |
| 变异测试 | Stryker |

覆盖率门槛：lines/branches/functions/statements 均 ≥ 85%（核心模块）。

### 5.2 工程规范

- **Conventions are API surface**：agent 名 `claude` 而非 `claude-code` 等都是有意的稳定契约
- **Persisted key casing lint**：防止 session JSON schema 漂移
- **Flow schema terms lint**：Flow DSL 术语一致性
- **Crabbox**：远程跨平台验证（Linux/macOS/Windows/WSL2）

---

## 6. 设计亮点与可借鉴点

| 亮点 | 可借鉴价值 |
|------|-----------|
| **ACP 作为稳定边界** | 换 agent 不改编排代码，只改 agent 名 |
| **Session scope key 三元组** | (agent, cwd, name) 清晰支持并行工作流 |
| **Queue owner + IPC** | 多脚本并发写同一 session 的安全序列化 |
| **Directory walk auto-resume** | 「在这个 repo 继续聊」的 UX |
| **json/quiet 机器可读** | CI/编排器管道集成友好 |
| **Flows 图编排** | 比 monolithic prompt 更可测试、可 replay |
| **Conformance suite** | 多 adapter 一致性保障 |
| **Backend-friendly 导出** | `acpx/runtime` 让上层不必重实现 session 逻辑 |
| **compare 命令** | 跨模型快速基准对比 |

---

## 7. 生态定位与集成方式

### 7.1 在生态中的位置

```
┌─────────────────────────────────────────────────────────┐
│  编排 / 协作层                                           │
│  Symphony 式工单调度 / Clowder 式 A2A / 自建 Flow        │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
   ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
   │   acpx    │   │pi-orch.   │   │  Paseo    │
   │ ACP 统一层 │   │Pi RPC 池  │   │ Daemon    │
   └─────┬─────┘   └─────┬─────┘   └─────┬─────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
                   Pi / Codex / Claude …
```

### 7.2 典型价值场景

| 场景 | 推荐用法 |
|------|----------|
| **统一多 Provider CLI** | `acpx pi` / `acpx codex` / `acpx claude` 同一套 surface |
| **脚本/CI 驱动 Agent** | `--format json` + 稳定 exit code |
| **多步工作流** | Flows（PR triage、branch 分类→实现→文档） |
| **编排器后端** | 嵌入 `acpx/runtime`，不重建 session/queue |
| **跨模型 Review** | `acpx compare pi codex 'review this diff'` |
| **与 ACP 编辑器集成对齐** | 同协议，未来可接 Zed 等 ACP client 生态 |

### 7.3 与 pi-orchestrator 的组合设想

```
上层调度器
  ├── 工单维度：借鉴 Symphony WORKFLOW.md + Orchestrator 状态机
  ├── 执行维度：
  │     方案 A：acpx pi -s <issue-id> '...'   （ACP，简单）
  │     方案 B：pi-orchestrator spawn + rpc    （Pi 原生，更全）
  └── 多步流程：acpx flow run triage.flow.ts
```

- **轻量路径**：全用 acpx，不维护 pi-orchestrator
- **重量路径**：pi-orchestrator 管 Pi 进程池，acpx 管其他 ACP agent
- **混合路径**：Flows 里 `acp` 节点按 agent 分流

### 7.4 差异与注意点

| 维度 | acpx | pi-orchestrator |
|------|------|-----------------|
| 协议 | ACP（跨 agent） | Pi RPC（仅 Pi） |
| 多实例 | 多 session（同 agent 可并行 named） | 多进程（每进程一个 Pi） |
| 工单调度 | 无（需外部 Symphony 式层） | 无 |
| 成熟度 | Alpha 但测试厚重 | Experimental |
| Pi 能力覆盖 | 经 pi-acp 适配，可能有 ACP 子集 | Pi RPC 全量 |

### 7.5 建议演进路径

1. **短期**：用 `acpx pi` 验证 Pi 在 ACP 路径下的工作流；读 `conformance/` 理解协议边界
2. **中期**：用 Flows 编码多步 playbook（实现→review→merge gate）
3. **长期**：上层调度嵌入 `acpx/runtime` 或 spawn `acpx` 子进程，避免自建 session/queue

---

## 附录：关键文件索引

| 类别 | 路径 |
|------|------|
| 愿景 | `docs/VISION.md` |
| 架构 | `docs/2026-02-17-architecture.md` |
| Agent 注册表 | `docs/agents.md`、`src/agent-registry.ts` |
| Session | `docs/sessions.md`、`src/session/` |
| 权限 | `docs/permissions.md`、`src/permissions.ts` |
| Flows | `docs/flows.md`、`src/flows.ts` |
| CLI 参考 | `docs/CLI.md` |
| 输出格式 | `docs/output-formats.md` |
| Warm owner 演进 | `docs/2026-02-25-warm-session-owner-architecture.md` |
| Conformance | `conformance/spec/v1.md`、`conformance/cases/` |
| 可嵌入运行时 | `src/runtime.ts`（导出 `acpx/runtime`） |
| Compare | `docs/compare.md` |
| 快速开始 | `docs/quickstart.md` |

---

*文档生成于 2026-07-05，基于 references/acpx v0.11.2 源码与文档分析。*