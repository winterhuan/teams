# Pi Agent Harness 项目深度分析

> 分析对象：`references/pi`  
> 当前版本：**0.80.3**（lockstep 同步版本）  
> 仓库：`earendil-works/pi`（原 pi-mono）

---

## 1. 项目定位与愿景

### 1.1 核心定位

Pi 是一个**极简、可自扩展的终端 Coding Agent Harness（智能体运行时框架）**，由 Mario Zechner（libGDX 作者）主导，Earendil Works 维护。它不是"大而全的 IDE Agent"，而是刻意保持内核精简，把复杂能力交给扩展（Extensions）、技能（Skills）、包（Pi Packages）和社区生态。

官方自述（`packages/coding-agent/README.md`）：

> *"Pi is a minimal terminal coding harness. Adapt pi to your workflows, not the other way around, without having to fork and modify pi internals."*

### 1.2 设计哲学

| 原则 | 含义 |
|------|------|
| **最小内核** | 不内置 sub-agent、plan mode 等"重型功能"，鼓励用扩展实现 |
| **不 fork 内核** | 通过 TypeScript 扩展、Skills、Prompt Templates 定制工作流 |
| **四层运行模式** | Interactive TUI / Print(JSON) / RPC / SDK 嵌入 |
| **本地优先** | 以用户权限运行，无内置沙箱，隔离靠容器/VM |
| **供应链硬化** | npm 依赖 pin、shrinkwrap、ignore-scripts 等 |

### 1.3 愿景

- **pi.dev** 作为产品入口与文档站
- **pi-chat**（独立仓库）处理 Slack/聊天自动化
- **OSS Session 共享**：鼓励开发者用 `pi-share-hf` 发布真实开发会话到 Hugging Face，用于改进模型与工具
- **RFC 驱动长期规划**：`rfc.earendil.com/keyword/pi/`

### 1.4 与同类产品的差异

对比同类项目：

- **OpenCode**：全栈开源 AI coding agent（Bun monorepo，含 Desktop/Web/Console）
- **Clowder AI**：多 Agent 协作平台层（跨模型互审、共享记忆）
- **Omnigent**：meta-harness，统一编排 Claude Code/Codex/Pi 等
- **Pi**：**最薄的 Harness 层**，专注 Agent Loop + 工具 + 扩展点，不追求应用完整性

---

## 2. 整体架构

### 2.1 Monorepo 结构

```
pi-monorepo/
├── packages/
│   ├── ai/              # @earendil-works/pi-ai
│   ├── agent/           # @earendil-works/pi-agent-core
│   ├── tui/             # @earendil-works/pi-tui
│   ├── coding-agent/    # @earendil-works/pi-coding-agent（CLI 主包）
│   └── orchestrator/    # @earendil-works/pi-orchestrator（实验性）
├── scripts/             # 发布、shrinkwrap、版本同步
├── .pi/                 # 项目级扩展/技能/提示词（dogfooding）
└── test.sh / pi-test.sh # 测试与源码运行入口
```

**构建顺序**（`package.json` `build` 脚本）：

```
tui → ai → agent → coding-agent → orchestrator
```

### 2.2 包依赖关系

```
                    ┌─────────────────┐
                    │  pi-coding-agent │  ← CLI/SDK/RPC/TUI 应用层
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │ pi-agent-core│   │   pi-tui    │   │   pi-ai     │
    └──────┬──────┘   └─────────────┘   └─────────────┘
           │
           ▼
    ┌─────────────┐
    │   pi-ai     │
    └─────────────┘

    ┌─────────────────┐
    │ pi-orchestrator │  → 依赖 pi-coding-agent（多实例 RPC 编排）
    └─────────────────┘
```

### 2.3 技术栈

| 维度 | 选择 |
|------|------|
| 语言 | TypeScript 5.9，Node ≥ 22.19 |
| 模块 | ESM (`"type": "module"`) |
| 编译 | `@typescript/native-preview`（tsgo，strip-only 模式） |
| Lint/Format | Biome 2.3.5 |
| 测试 | Vitest（agent/coding-agent/ai），Node test（tui） |
| Schema | TypeBox 1.1.38 |
| 扩展加载 | jiti 2.7.0（运行时 TS 加载） |
| 二进制 | Bun compile（`build:binary`） |

### 2.4 版本策略

- **Lockstep versioning**：所有包共享同一版本号（当前 0.80.3）
- `patch` = 修复 + 新增；`minor` = Breaking Changes；**不做 major release**
- 内部 workspace 包用 `^` 范围，外部依赖 **精确 pin**

---

## 3. 核心模块深度拆解

### 3.1 `@earendil-works/pi-ai` — 统一 LLM API

**路径**：`packages/ai/src/`

#### 职责

- 多 Provider 统一抽象（OpenAI、Anthropic、Google、Bedrock、Mistral、OpenRouter 等 30+）
- 仅支持 **支持 tool calling** 的模型（Agentic 工作流必需）
- Auth 解析、OAuth、Token/Cost 追踪、跨 Provider 上下文切换

#### 核心接口（`packages/ai/src/models.ts`）

```typescript
interface Provider<TApi extends Api> {
  readonly id: string;
  readonly auth: ProviderAuth;
  getModels(): readonly Model<TApi>[];
  refreshModels?(): Promise<void>;
  stream(model, context, options?): AssistantMessageEventStream;
  streamSimple(model, context, options?): AssistantMessageEventStream;
}
```

#### 模块组织

| 目录 | 内容 |
|------|------|
| `providers/` | 各 Provider 工厂与模型目录（`*.models.ts` 生成） |
| `api/` | 底层 API 实现（`anthropic-messages`、`openai-responses` 等，lazy 加载） |
| `auth/` | 凭证存储、解析、`resolveProviderAuth` |
| `utils/oauth/` | GitHub Copilot、Anthropic、OpenAI Codex OAuth |
| `scripts/generate-models.ts` | 生成 `models.generated.ts`（**禁止手改**） |

#### 设计亮点

- **Lazy API 加载**：`api/lazy.ts` 减少启动体积
- **Faux Provider**：测试用假 Provider（`providers/faux.ts`）
- **EventStream 协议**：流式事件统一为 `start` / `text_delta` / `toolcall_delta` / `done` / `error`

---

### 3.2 `@earendil-works/pi-agent-core` — Agent 运行时

**路径**：`packages/agent/src/`

#### 双层架构

```
Agent（有状态封装）
  └── agent-loop.ts（无状态循环）
        └── pi-ai streamSimple（LLM 边界）
```

#### 关键类型（`packages/agent/src/types.ts`）

```typescript
interface AgentLoopConfig extends SimpleStreamOptions {
  model: Model<any>;
  convertToLlm: (messages: AgentMessage[]) => Message[] | Promise<Message[]>;
  transformContext?: (messages, signal?) => Promise<AgentMessage[]>;
  getSteeringMessages?: () => Promise<AgentMessage[]>;
  getFollowUpMessages?: () => Promise<AgentMessage[]>;
  beforeToolCall?: (ctx, signal?) => Promise<BeforeToolCallResult>;
  afterToolCall?: (ctx, signal?) => Promise<AfterToolCallResult>;
  shouldStopAfterTurn?: (ctx) => boolean | Promise<boolean>;
  prepareNextTurn?: (ctx) => AgentLoopTurnUpdate | undefined;
  toolExecution?: "sequential" | "parallel";
}
```

#### Agent 类（`packages/agent/src/agent.ts`）

- **Steering Queue**：运行中注入用户消息（`steer()`）
- **Follow-up Queue**：Agent 即将停止时注入（`followUp()`）
- **QueueMode**：`"all"` 或 `"one-at-a-time"`
- **事件订阅**：`subscribe(listener)` 按序 await，包含在 run settlement 中
- **生命周期**：`prompt()` → `agent_start` → `turn_start` → ... → `agent_end` → listeners settle → idle

#### AgentHarness（`packages/agent/src/harness/`）

更高层编排，**正在演进中**（`packages/agent/docs/agent-harness.md`）：

- Session 持久化、Compaction、Branch Summary
- 四阶段状态：`idle | turn | compaction | branch_summary | retry`
- Turn Snapshot vs Harness Config 分离
- Hook 系统（`packages/agent/docs/hooks.md`）：phantom type `HookResult` 驱动类型安全

---

### 3.3 `@earendil-works/pi-coding-agent` — CLI 与应用层

**路径**：`packages/coding-agent/src/`

#### 入口与模式

| 文件 | 职责 |
|------|------|
| `cli.ts` | bin 入口 |
| `main.ts` | 参数解析 → `createAgentSession()` |
| `modes/interactive/` | TUI 交互模式 |
| `modes/print-mode.ts` | `-p` 单次输出 |
| `modes/rpc/` | `--mode rpc` JSONL 协议 |
| `rpc-entry.ts` | RPC 独立入口 |
| `core/sdk.ts` | `createAgentSession()` 工厂 |

#### 核心抽象：AgentSession

`packages/coding-agent/src/core/agent-session.ts`（~3000 行）是**所有运行模式共享的核心**：

职责：
- Agent 状态访问与事件订阅
- 自动 Session 持久化
- Model / Thinking Level 管理
- Compaction（手动 + 自动阈值）
- Bash 执行
- Session 切换与分支

#### 内置工具（`packages/coding-agent/src/core/tools/`）

| 工具 | 说明 |
|------|------|
| `read` | 读文件，支持截断 |
| `bash` | Shell 执行，`BashOperations` 可注入 |
| `edit` | 基于 diff 的编辑 |
| `write` | 写文件 |
| `grep` | 内容搜索 |
| `find` | 文件查找 |
| `ls` | 目录列表 |

默认激活：`read, bash, edit, write`

#### Session 管理（`packages/coding-agent/src/core/session-manager.ts`）

- 存储格式：**JSONL**，树结构（`id`/`parentId`）
- 路径：`~/.pi/agent/sessions/--<cwd-path>--/<timestamp>_<uuid>.jsonl`
- 版本：v3（`hookMessage` → `custom`）
- Entry 类型：`message`、`compaction`、`branch_summary`、`model_change`、`thinking_level_change`、`leaf` 等

#### Compaction（`packages/coding-agent/src/core/compaction/`）

触发条件：`contextTokens > contextWindow - reserveTokens`（默认 reserve 16384）

流程：
1. 从最新消息向前累计 token，找到 cut point（保留 `keepRecentTokens` 默认 20k）
2. LLM 生成结构化摘要
3. 追加 `CompactionEntry`，Session reload 使用 summary + 保留消息

---

### 3.4 `@earendil-works/pi-tui` — 终端 UI 库

**路径**：`packages/tui/src/`

#### 核心能力

- **Differential Rendering**：三策略差分渲染，只更新变化部分
- **CSI 2026 Synchronized Output**：原子屏幕更新，无闪烁
- **Bracketed Paste**：大段粘贴处理（>10 行显示标记）
- **Inline Images**：Kitty / iTerm2 图形协议
- **组件**：Text、Editor、Markdown、SelectList、SettingsList、Loader、Image、Box、Container

---

### 3.5 `@earendil-works/pi-orchestrator` — 多实例编排（实验性）

**路径**：`packages/orchestrator/src/`

> **警告**：README 明确标注 *"experimental... may change or be removed without notice"*

#### 职责

管理多个 Pi RPC 子进程实例，提供 IPC 统一入口：

```typescript
type OrchestratorRequest =
  | { type: "spawn"; cwd; label? }
  | { type: "list" }
  | { type: "stop"; instanceId }
  | { type: "status"; instanceId }
  | { type: "rpc"; instanceId; command: RpcCommand }
  | { type: "rpc_stream"; instanceId }
```

配置目录：`~/.pi/orchestrator/`

---

## 4. Agent 运行时机制

### 4.1 Agent Loop 核心流程

`packages/agent/src/agent-loop.ts` 实现双层循环：

```
外层循环（follow-up 消息）
  └── 内层循环（tool calls + steering 消息）
        ├── transformContext（可选，AgentMessage 级别）
        ├── convertToLlm（必需，→ LLM Message[]）
        ├── streamAssistantResponse（streamSimple）
        ├── executeToolCalls（parallel 或 sequential）
        ├── prepareNextTurn（可选，切换 model/thinking）
        └── shouldStopAfterTurn（可选，优雅停止）
```

### 4.2 消息队列语义

| API | 时机 | 行为 |
|-----|------|------|
| `steer(msg)` | Agent 运行中 | 当前 turn 工具执行完后、下次 LLM 调用前注入 |
| `followUp(msg)` | Agent 即将停止 | 仅当无 tool calls、无 steering 时注入，触发新 turn |
| RPC `streamingBehavior: "steer"` | 流式中发 prompt | 等同 steer |
| RPC `streamingBehavior: "followUp"` | 流式中发 prompt | 等同 followUp |

---

## 5. 扩展机制

### 5.1 Extensions

**文档**：`packages/coding-agent/docs/extensions.md`（2700+ 行）

#### 发现路径

| 位置 | 范围 |
|------|------|
| `~/.pi/agent/extensions/*.ts` | 全局 |
| `.pi/extensions/*.ts` | 项目本地（需 trust） |
| `settings.json` `extensions` 数组 | 自定义路径 |
| `settings.json` `packages` | npm/git Pi Package |

#### ExtensionAPI 能力

```typescript
pi.on("session_start" | "tool_call" | "message_end" | ..., handler);
pi.registerTool({ name, parameters, execute });
pi.registerCommand("mycommand", { handler });
pi.registerProvider("my-provider", { baseUrl, models, api });
pi.registerShortcut(...);
pi.appendEntry(...);  // Session 持久化
ctx.ui.notify / confirm / select / custom();  // TUI 交互
```

### 5.2 Skills

- 遵循 [Agent Skills 标准](https://agentskills.io/specification)
- 渐进式披露：启动时仅加载 name + description 到 system prompt（XML 格式）
- 按需 `read` 加载完整 `SKILL.md`
- 注册为 `/skill:name` 命令

### 5.3 Custom Providers

```typescript
pi.registerProvider("my-proxy", {
  baseUrl: "https://proxy.example.com",
  apiKey: "$MY_API_KEY",
  api: "openai-completions",
  models: [{ id: "my-model", contextWindow: 128000, ... }]
});
```

### 5.4 Pi Packages

通过 `pi install npm:@foo/bar@1.0.0` 或 `pi install git:github.com/user/repo@v1` 安装可分发扩展包。

---

## 6. 安全与供应链

### 6.1 安全模型

| 层面 | 策略 |
|------|------|
| **权限** | 以启动用户权限运行，无内置沙箱 |
| **Project Trust** | 控制是否加载项目级 `.pi/settings.json`、extensions、skills |
| **信任存储** | `~/.pi/agent/trust.json`（按 canonical 目录） |
| **非交互模式** | `-p`/`--mode rpc` 不弹 trust 提示，靠 `defaultProjectTrust` 或 `--approve` |
| **隔离方案** | 容器/Docker/Gondolin micro-VM/OpenShell（`containerization.md`） |

### 6.2 供应链硬化

| 措施 | 实现 |
|------|------|
| 精确 pin | `.npmrc` `save-exact=true` |
| 发布年龄门 | `min-release-age=2` |
| Lockfile 保护 | pre-commit 阻止意外 lockfile commit |
| Shrinkwrap | `packages/coding-agent/npm-shrinkwrap.json` |
| 安装安全 | `npm ci --ignore-scripts` |
| CI 审计 | 定时 `npm audit --omit=dev` + `npm audit signatures` |

---

## 7. 开发与发布流程

### 7.1 本地开发

```bash
npm install --ignore-scripts
npm run build
npm run check
./test.sh
./pi-test.sh
```

### 7.2 发布流程

1. 更新各包 `CHANGELOG.md` `[Unreleased]`
2. `npm run release:local` 隔离 smoke test（Node + Bun）
3. `PI_ALLOW_LOCKFILE_CHANGE=1 npm run release:patch`
4. CI 通过 OIDC 发布 npm + 构建二进制

---

## 8. 设计亮点与可借鉴点

| 亮点 | 说明 | 借鉴价值 |
|------|------|----------|
| **AgentMessage 抽象层** | LLM Message 之上再加一层，支持 UI-only / custom 消息 | 分离"应用消息"与"LLM 消息" |
| **双层 Agent Loop** | 内层处理 tool+steering，外层处理 follow-up | 清晰的队列语义 |
| **Steering vs Follow-up** | 运行中注入 vs 停止后注入 | 交互式 Agent 必备的双队列模型 |
| **Session 树结构** | JSONL + id/parentId，原地分支 | 比线性 session 更灵活 |
| **渐进式 Skill 披露** | 仅 description 常驻 context | 有效控制 context 膨胀 |
| **供应链纵深防御** | pin + shrinkwrap + ignore-scripts + audit | 开源 Agent 工具的分发安全范本 |
| **刻意不做 sub-agent** | 用扩展实现，保持内核稳定 | 极简哲学 |
| **RPC JSONL 协议** | 严格 LF 分隔，可嵌入任何语言 | 编排层集成友好 |

---

## 9. 生态定位与集成方式

### 9.1 层次定位

Pi 解决 **"单个 Agent 如何高效运行"**（Loop、工具、扩展、Session）。

在分层生态中，Pi 是 **L1 执行层 / Agent Harness**；上层可由 Paseo、Omnigent、Clowder 等提供编排与协作语义。

### 9.2 典型集成拓扑

```
┌─────────────────────────────────────────────────────┐
│              编排 / 协作层                            │
│  Clowder 协作调度 │ Omnigent Meta编排 │ Paseo Daemon  │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────┐
│           Pi Orchestrator（实验性，已有雏形）           │
│  spawn / list / stop / rpc / rpc_stream             │
└─────────────────────┬───────────────────────────────┘
         ┌────────────┼────────────┐
         ▼            ▼            ▼
   Pi Inst 1     Pi Inst 2     Pi Inst N  ← --mode rpc
```

### 9.3 可复用能力

| 需求 | Pi 能力 | 接入方式 |
|------|---------|----------|
| 多 Agent 并行 | Orchestrator spawn 多 RPC 实例 | `pi-orchestrator` IPC 协议 |
| 跨模型协作 | pi-ai 30+ Provider | `Models` + `session-resources` |
| 持久化会话 | JSONL 树结构 Session | `SessionManager` |
| 工具权限控制 | Extension `tool_call` 事件拦截 | `pi.on("tool_call", { block })` |
| 编辑器集成 | RPC JSONL 协议 | `--mode rpc` 或 `AgentSession` SDK |
| 上下文压缩 | Compaction + Branch Summary | `core/compaction/` |

---

## 附录：关键文件索引

| 类别 | 路径 |
|------|------|
| Agent Loop | `packages/agent/src/agent-loop.ts` |
| Agent 有状态封装 | `packages/agent/src/agent.ts` |
| LLM Provider 抽象 | `packages/ai/src/models.ts` |
| CLI 入口 | `packages/coding-agent/src/main.ts` |
| SDK 工厂 | `packages/coding-agent/src/core/sdk.ts` |
| Session 核心 | `packages/coding-agent/src/core/agent-session.ts` |
| 扩展运行器 | `packages/coding-agent/src/core/extensions/runner.ts` |
| RPC 模式 | `packages/coding-agent/src/modes/rpc/rpc-mode.ts` |
| Orchestrator | `packages/orchestrator/src/supervisor.ts` |
| 扩展文档 | `packages/coding-agent/docs/extensions.md` |
| RPC 协议文档 | `packages/coding-agent/docs/rpc.md` |
| 开发规范 | `AGENTS.md` |

---

*文档生成时间：2026-07-05 | 基于 pi v0.80.3 源码分析*