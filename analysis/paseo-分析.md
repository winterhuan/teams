# Paseo 项目深度分析

> 分析对象：`references/paseo`  
> 版本：`0.1.104-beta.3`  
> 许可证：AGPL-3.0-or-later

---

## 1. 项目定位与愿景

### 一句话定位

**Paseo 是围绕本地 AI 编程 Agent 构建的下一代开发环境**——用统一界面在桌面、移动、Web、CLI 上监控、控制、编排本机运行的 coding agents，代码始终留在用户机器上。

来源：`docs/product.md`、`README.md`

### 核心哲学

| 原则 | 含义 |
|------|------|
| **Multi-provider** | 不绑定单一模型/厂商，Claude Code、Codex、Copilot、OpenCode、Pi 等可自由切换 |
| **Cross-device** | 桌前开工、手机查看、终端脚本化 |
| **Self-hosted / Local-first** | Daemon 跑在用户机器，无推理加价、无强制云依赖 |
| **Privacy-first** | 无遥测、无强制登录、无追踪 |
| **BYOK** | 各 Provider 自行管理认证，Paseo 不托管 API Key |
| **Open source** | AGPL-3.0，可审计、可 fork |

### 战略赌注（`docs/product.md`）

1. **模型会商品化**，价值上移到**编排层**
2. **多 Provider 长期胜出**
3. **Daemon 即基础设施**——可部署在笔记本、VM、远程服务器、Docker
4. **开源社区比融资更持久**

### 当前产品能力

- 桌面（Electron）、移动（iOS/Android）、Web、CLI
- 内置 Provider：Claude、Codex、Copilot、OpenCode、Pi、OMP
- 语音模式、MCP Server、定时任务（cron）、Loop、多窗格分屏、Worktree 工作区
- Skills 生态：`skills/paseo-handoff/`、`paseo-loop/`、`paseo-advisor/`、`paseo-committee/`

---

## 2. 整体架构（Desktop / Mobile / CLI）

### 系统拓扑

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Mobile App  │  │     CLI     │  │ Desktop App │
│   (Expo)    │  │ (Commander) │  │ (Electron)  │
└──────┬──────┘  └──────┬──────┘  └──────┬──────┘
       │    WebSocket   │    WebSocket   │ Managed subprocess + WS
       └────────────────┴────────────────┘
                        │
                 ┌──────▼──────┐
                 │   Daemon    │  packages/server
                 │  (Node.js)  │
                 └──────┬──────┘
        ┌───────────────┼───────────────┐
        │               │               │
   Claude/Codex    Copilot/ACP    OpenCode/Pi/OMP
```

### Monorepo 包结构

| 包 | 路径 | 职责 |
|----|------|------|
| **server** | `packages/server` | Daemon：Agent 生命周期、WebSocket API、MCP、终端、Git |
| **protocol** | `packages/protocol` | 协议 Schema 单一事实来源（Zod） |
| **client** | `packages/client` | `DaemonClient` WebSocket 驱动与 SDK 门面 |
| **app** | `packages/app` | Expo 跨平台客户端（iOS/Android/Web，Desktop 共用 UI） |
| **cli** | `packages/cli` | Docker 风格 CLI：`paseo run/ls/logs/wait` |
| **desktop** | `packages/desktop` | Electron 封装，托管 Daemon 子进程 |
| **relay** | `packages/relay` | E2E 加密中继，远程访问 |
| **highlight** | `packages/highlight` | 语法高亮 |
| **website** | `packages/website` | 营销站 `paseo.sh` |

### 三种部署模型

1. **本地 Daemon**（默认）：`127.0.0.1:6767`，数据目录 `~/.paseo`
2. **Desktop 托管**：Electron 自动 spawn Daemon
3. **远程 + Relay**：Daemon 出站连接 Relay，客户端通过 E2E 加密隧道接入

---

## 3. 核心模块深度拆解

### 3.1 Daemon 启动与 HTTP/WS 服务

**入口**：`packages/server/src/server/bootstrap.ts`

- 解析 `listen` 字符串（TCP / Unix socket / Windows pipe）
- 创建 Express HTTP + WebSocket Server
- 挂载 MCP Streamable HTTP、静态 Web UI、Service Proxy
- 初始化 `AgentManager`、`TerminalManager`、`WorkspaceRegistry`、`ScheduleService`、`LoopService` 等

**WebSocket 服务**：`packages/server/src/server/websocket-server.ts`

- Hello 握手、Session 管理、二进制帧路由
- `monitorEventLoopDelay` 监控主事件循环延迟
- Bearer 认证、Host 头校验（DNS rebinding 防护）

### 3.2 Agent 管理核心

**`AgentManager`**：`packages/server/src/server/agent/agent-manager.ts`（约 3800+ 行）

- Agent 生命周期状态机唯一事实来源
- Timeline 追加、epoch 管理、订阅广播
- `AgentStreamCoalescer` 合并高频流事件
- 创建/恢复/归档/级联归档子 Agent
- Provider 会话导入、权限流转

**持久化**：`packages/server/src/server/agent/agent-storage.ts`

- 路径：`$PASEO_HOME/agents/{sanitized-cwd}/{agent-id}.json`
- 按 `cwd` 分目录

**工具目录**：`packages/server/src/server/agent/tools/`

- 传输无关的 Paseo 工具目录（`create_agent`、`send_agent_prompt`、worktree、schedule 等）
- MCP 仅为薄适配层

### 3.3 工作区与项目模型

**Model B 边界**（`docs/architecture.md`）：

- **Directory-backed**（按 `cwd` 共享）：Git status/diff、文件预览
- **Workspace-owned**（按 `workspaceId` 独立）：Review draft、附件、文件树展开状态

### 3.4 终端子系统

**路径**：`packages/server/src/terminal/`

| 模块 | 职责 |
|------|------|
| `terminal-manager.ts` | 创建/销毁终端会话 |
| `terminal-worker-process.ts` | fork 子进程跑 headless xterm |
| `terminal-output-coalescer.ts` | ≤5ms 每终端 1 条 IPC |
| `terminal-session-controller.ts` | 每客户端流二次合并 |

### 3.5 编排与自动化

| 模块 | 路径 | 能力 |
|------|------|------|
| Loop | `packages/server/src/server/loop-service.ts` | Worker + Verifier 迭代直到验收 |
| Schedule | `packages/server/src/server/schedule/` | Cron 定时 Agent |
| Chat | `packages/server/src/server/chat/` | Agent 间 / 人机聊天室 |
| Worktree | `packages/server/src/server/worktree/` | Git worktree 工作流 |

### 3.6 客户端 SDK

**`DaemonClient`**：`packages/client/src/daemon-client.ts`（5000+ 行）

- 类型安全的 RPC 方法集合
- 终端二进制帧解码
- Relay E2E 传输

### 3.7 协议层

**`packages/protocol/src/messages.ts`**：所有 WS 消息 Zod Schema

- 顶层信封：`hello`、`ping`/`pong`、`session`
- 能力标志：`packages/protocol/src/client-capabilities.ts`
- Provider 清单：`packages/protocol/src/provider-manifest.ts`

---

## 4. Agent 生命周期与会话管理

### 4.1 状态机

```
initializing → idle ⇄ running
        ↓       ↓        ↓
              error → closed
```

定义：`packages/protocol/src/agent-lifecycle.ts`、`docs/agent-lifecycle.md`

| 状态 | 含义 |
|------|------|
| `initializing` | Provider 会话创建中 |
| `idle` | 有活跃会话，等待下一 prompt |
| `running` | 正在产生 turn |
| `error` | 上次失败，会话仍附着 |
| `closed` | 终态，无活跃会话 |

### 4.2 父子关系与 Subagent Track

**创建方式**：Agent 作用域 MCP 工具 `create_agent`

| 维度 | 选项 | 效果 |
|------|------|------|
| `relationship` | `subagent` | 写入 `labels["paseo.parent-agent-id"]`，出现在父 Agent 的 Subagents Track |
| `relationship` | `detached` | 独立 Agent，不出现在父 Track（handoff 场景） |
| `workspace` | `current` / `create` | 决定 cwd / 是否新建 worktree |

### 4.3 Tab vs Archive 语义分离

| 概念 | 范围 | 行为 |
|------|------|------|
| **Tab** | 每客户端布局 | 打开/关闭视图 |
| **Archive** | 全局（Daemon） | 软删除，`archivedAt` 打标 |

**刻意的不对称**（`docs/agent-lifecycle.md`）：

- **Root Agent**：关 Tab → 归档（需确认对话框）
- **Subagent**：关 Tab → **仅布局**，Agent 仍在 Track 中
- **Detach**：清除 parent 标签，Agent 独立继续运行

**级联归档**：父 Agent 归档时，递归归档所有子 Agent。

### 4.4 Timeline 模型

- **Append-only**，每次 run 新 `epoch`
- 序列号 `sequence` 用于客户端去重
- 实时 `agent_stream` + 权威 `fetch_agent_timeline_request` 双轨同步

---

## 5. RPC / 通信机制

### 5.1 WebSocket 协议概览

**握手流程**：

```
Client → Server: WSHelloMessage { type: "hello", clientId, clientType, protocolVersion, capabilities }
Server → Client: status { status: "server_info", serverId, hostname, version, features }
```

- RPC 默认超时 60s
- 存活检测用 JSON `ping`/`pong`（兼容 RN WebSocket）

### 5.2 RPC 命名规范

新 RPC 使用点分命名（`docs/rpc-namespacing.md`）：

```
domain.provider.operation.request
domain.provider.operation.response
```

- 请求参数在顶层；响应数据在 `payload` 下
- 旧 flat 名称保留兼容，新 RPC 禁止 flat 命名

### 5.3 二进制帧（终端）

```
[1-byte opcode][1-byte slot][variable payload]
```

| Opcode | 含义 |
|--------|------|
| `0x01` Output | PTY 输出 |
| `0x02` Input | 键盘输入 |
| `0x03` Resize | `{ rows, cols }` JSON |
| `0x04` Snapshot | 终端快照 |

### 5.4 协议兼容性契约

- **Protocol contract**：Schema 只增不删，optional 永不变 required
- **Feature contract**：新功能通过 `server_info.features.*` 能力门控
- 所有兼容 shim 标记 `COMPAT(name)` 便于清理

### 5.5 Relay E2E 通信

`packages/relay/src/encrypted-channel.ts`：

- Curve25519 ECDH + XSalsa20-Poly1305（NaCl box）
- Relay 为零知识路由，无法读内容

---

## 6. UI / 终端性能设计

### 6.1 终端延迟管线

```
pty (node-pty, worker)
  → headless xterm parse (worker)
  → TerminalOutputCoalescer (worker, ≤1 IPC/5ms/terminal)
  → process.send → daemon main
  → TerminalOutputCoalescer (per-client)
  → binary WS frame
  → client decode → emulator runtime
  → xterm.write
```

### 6.2 关键不变量

| 不变量 | 说明 |
|--------|------|
| Leading+trailing throttle | 空闲后首 chunk 立即 flush |
| Worker 侧合并先于 IPC | 避免 main loop 被 IPC 淹没 |
| Snapshot 背压门控 | 仅当 `outputBytes > 256KB` 且 `bufferedAmount > 4MB` 才全量 snapshot |
| 客户端 write 不逐帧串行化 | 连续 plain write 直灌 xterm |

### 6.3 基准与监控

| 工具 | 健康指标（2026-06） |
|------|---------------------|
| Node benchmark | echo p50 ~2.3ms, p95 ~3.3ms |
| Browser perf E2E | keydown→commit p50 ~18ms |
| 生产监控 | `ws_runtime_metrics` eventLoopDelay p99 |

---

## 7. Provider 集成

### 7.1 两种集成模式

| 模式 | 基类/接口 | 适用 |
|------|----------|------|
| **ACP** | `ACPAgentClient` | Copilot、Cursor、Generic ACP |
| **Direct** | `AgentClient` + `AgentSession` | Claude、Codex、OpenCode、Pi、OMP、Mock |

### 7.2 内置 Provider 一览

| ID | 封装 | 会话格式 |
|----|------|----------|
| `claude` | Anthropic Agent SDK | `~/.claude/projects/...jsonl` |
| `codex` | Codex AppServer | `~/.codex/sessions/...jsonl` |
| `copilot` | GitHub Copilot ACP | Provider 自管 |
| `opencode` | OpenCode server/CLI | Provider 自管 |
| `pi` | `pi --mode rpc` 子进程 | JSONL + RPC |
| `omp` | Pi 兼容 fork | `~/.omp/agent/sessions`，默认禁用 |

### 7.3 Pi Provider 深度集成

**核心文件**：

- `packages/server/src/server/agent/providers/pi/agent.ts`（~2000 行 Direct Provider）
- `packages/server/src/server/agent/providers/pi/cli-runtime.ts`（stdio JSON-RPC）
- `packages/server/src/server/agent/providers/pi/history-mapper.ts`
- `packages/server/src/server/agent/providers/pi/tool-call-mapper.ts`
- `packages/server/src/server/agent/providers/pi/session-descriptor.ts`

**集成要点**（`docs/providers.md`）：

1. **进程模式**：`pi --mode rpc`，Paseo server 不嵌入 Pi SDK
2. **系统提示**：`--append-system-prompt` 追加 Paseo 指令
3. **MCP**：依赖 `pi-mcp-adapter` 扩展
4. **扩展 UI 桥接**：Pi RPC 的 `select`/`input`/`confirm` → Paseo question permission
5. **User message 契约**：Provider adapter 必须发出唯一 `user_message` timeline 项

**环境变量**：`PI_COMMAND` / `PI_ACP_PI_COMMAND` 覆盖二进制路径。

### 7.4 Paseo 工具注入策略

- 支持原生工具的 Provider：`supportsNativePaseoTools: true`
- 仅支持 MCP 的 Provider：通过 `/mcp/agents` 端点 fallback
- `AgentManager` 在原生工具存在时剥离内部 Paseo MCP server，避免重复注入

---

## 8. 设计亮点与可借鉴点

### 8.1 架构层面

1. **Daemon-as-Infrastructure**：类似 Docker 的 client-server 模型
2. **Protocol / Feature 双契约分离**：协议永远向后兼容，功能用 capability flag 门控
3. **Transport-neutral 工具目录**：MCP 是适配器而非核心
4. **Directory vs Workspace 状态边界**：同 cwd 多 workspace 时 Git 共享、UI 状态隔离
5. **文件 JSON + Zod 验证**：无 DB 迁移负担，原子写

### 8.2 Agent 编排层面

1. **Subagent Track 与 Tab/Archive 解耦**
2. **Cascade archive**：父归档递归清理子舰队
3. **Skills 工作流**：handoff / loop / committee 将编排知识编码为可安装 skill
4. **Loop + Schedule + Chat**：Daemon 级自动化三角

### 8.3 工程实践

1. **文档即单一事实来源**：`docs/` 30+ 专题文档
2. **TDD + 真实依赖**：少 mock、多 E2E
3. **平台门控矩阵**：`.web.ts` / `.native.ts` / `.electron.ts` 编译期分流
4. **paseo.json worktree 开发服务**：多 surface 并行开发

### 8.4 性能工程

1. **终端管线多层 coalescing + 背压门控**
2. **独立 benchmark 脚本**
3. **eventLoopDelay 生产指标**

---

## 9. 生态定位与可借鉴模式

### 9.1 层次互补关系

```
┌─────────────────────────────────────────────┐
│  Paseo（编排层 / 控制面 / 多设备 UI）          │
│  - Daemon 生命周期                           │
│  - 多 Provider 统一 Timeline                 │
│  - MCP 工具 / Skills / Loop / Schedule       │
└──────────────────┬──────────────────────────┘
                   │ pi --mode rpc
┌──────────────────▼──────────────────────────┐
│  Pi（执行层 / Agent Harness）                 │
│  - LLM 多 Provider API（pi-ai）              │
│  - 工具调用 / 状态管理（pi-agent-core）       │
│  - CLI / TUI / 扩展系统                      │
└─────────────────────────────────────────────┘
```

### 9.2 Pi Orchestrator vs Paseo Daemon

| 维度 | Pi Orchestrator | Paseo Daemon |
|------|-----------------|--------------|
| 范围 | 多 Pi RPC 实例监督 | 多 Provider + 多客户端 + 完整 DevEnv |
| 持久化 | `instances.json` | `$PASEO_HOME` 全目录树 |
| 通信 | Pi 原生 RPC IPC | WebSocket + MCP |
| UI | 无（纯后端） | Expo + Electron + CLI |

### 9.3 可直接借鉴的模式

| Paseo 模式 | 可应用场景 |
|------------|------------|
| `AgentClient` 接口 + Provider Registry | 统一 Agent 适配层 |
| Timeline epoch + sequence 同步 | 多 Agent 消息去重与 catch-up |
| `create_agent` relationship/workspace 分离 | 子任务 Agent vs handoff Agent 语义建模 |
| Skills（handoff/loop/committee） | Team 协作 playbook 编码 |
| 终端性能管线 | 远程终端/UI 参考 |
| Protocol capability gating | 跨版本客户端/服务端兼容策略 |

### 9.4 建议演进方向

1. **短期**：以 Paseo 的 Pi Provider 集成为参考，理解 `pi --mode rpc` 完整契约
2. **中期**：在 Pi Orchestrator 之上引入 Paseo 式 Timeline / 生命周期模型
3. **长期**：构建专属 Daemon 时复用 Protocol/Client/Terminal 基础设施，Pi 可作为默认 Provider 之一

---

## 附录：关键文件速查

| 类别 | 路径 |
|------|------|
| 项目说明 | `README.md`、`docs/product.md` |
| 架构 | `docs/architecture.md` |
| 生命周期 | `docs/agent-lifecycle.md` |
| 数据模型 | `docs/data-model.md` |
| Provider 指南 | `docs/providers.md` |
| RPC 规范 | `docs/rpc-namespacing.md`、`packages/protocol/src/messages.ts` |
| 终端性能 | `docs/terminal-performance.md` |
| Daemon 启动 | `packages/server/src/server/bootstrap.ts` |
| Agent 管理 | `packages/server/src/server/agent/agent-manager.ts` |
| Pi Provider | `packages/server/src/server/agent/providers/pi/agent.ts` |
| 客户端 SDK | `packages/client/src/daemon-client.ts` |
| Relay | `packages/relay/src/encrypted-channel.ts` |
| 开发编排 | `paseo.json` |

---

*文档生成于 2026-07-05，基于 references/paseo 源码与 docs/ 目录系统阅读。*