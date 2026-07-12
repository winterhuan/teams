# Omnigent 项目深度分析

> 分析对象：`references/omnigent`  
> 版本：`0.5.0.dev0`  
> 状态：Alpha

---

## 1. 项目定位与愿景

### 1.1 核心定位

Omnigent 是一个开源 **Meta-Harness（元编排层）**，目标是在 Claude Code、Codex、Cursor、OpenCode、Hermes、Pi 及自定义 Agent 之上，提供统一的编排、治理与协作能力。

> *"The open-source meta-harness for all your AI agents."*

| 能力维度 | 说明 |
|---------|------|
| **多 Harness 统一** | 同一套会话模型下切换/组合不同 Agent 运行时 |
| **跨设备同步** | 终端、浏览器、手机、macOS 桌面 App 共享同一会话 |
| **多 Agent 监督** | 同一会话内混用多种 Agent，互相审查或分工 |
| **策略与沙箱** | Policy 引擎 + OS 级沙箱（`bwrap`/`seatbelt`） |
| **团队协作** | 共享会话、Co-drive、Fork、多用户认证 |
| **云沙箱** | Modal、Daytona、E2B、K8s 等托管执行环境 |

### 1.2 典型用户旅程

```bash
omnigent              # 快速启动，本地 Web UI :6767
omnigent claude       # Claude Code TUI
omnigent pi           # Pi TUI
omnigent opencode     # OpenCode
omnigent run examples/polly/   # 自定义 Agent
omnigent server start          # 远程协作
```

### 1.3 示例 Agent

- **Polly**（`examples/polly/config.yaml`）：多 Agent 编码编排器，委派 Claude/Codex/OpenCode/Cursor/Hermes/Pi 子 Agent，并做跨厂商 Review
- **Debby**（`examples/debby/`）：Claude + GPT 双头辩论伙伴

---

## 2. 整体架构

### 2.1 分层模型

```
┌─────────────────────────────────────────────────────────────┐
│  CLI (omnigent/cli.py)  ·  Web UI (web/)  ·  Desktop App    │
├─────────────────────────────────────────────────────────────┤
│  Server (omnigent/server/)                                   │
│  FastAPI · 会话 CRUD · SSE 流 · 认证 · Policy · Host 注册   │
├─────────────────────────────────────────────────────────────┤
│  Runner (omnigent/runner/app.py)                             │
│  Harness 子进程管理 · 终端资源 · MCP 代理 · Native Forwarder  │
├─────────────────────────────────────────────────────────────┤
│  Harness Wrap (omnigent/inner/*_harness.py)                  │
│  SDK/Subprocess 或 Native Bridge Executor                    │
├─────────────────────────────────────────────────────────────┤
│  Vendor CLI/SDK (claude, codex, pi, opencode serve, …)      │
└─────────────────────────────────────────────────────────────┘
```

| 包 | 职责 |
|----|------|
| `spec/` | Agent **是什么**（YAML 契约） |
| `runtime/` | Agent **怎么跑**（推理循环、工具调用） |
| `server/` | **托管服务**（HTTP API、持久化、多租户） |
| `runner/` | **执行宿主**（Spawn Harness、绑定终端、隧道回连 Server） |

### 2.2 进程拓扑

```
Terminal 1: omnigent server     → :6767 (API + 可选 Web UI)
Terminal 2: omnigent host       → 注册本机为 Host，暴露 Runner
Terminal 3: web npm run dev     → :5173 (Vite 代理 /v1 → server)
```

远程部署时，Runner 通过 WebSocket Tunnel（`omnigent/server/routes/host_tunnel.py`）回连 Server。

### 2.3 技术栈

| 层级 | 技术 |
|------|------|
| 语言 | Python 3.12+ |
| Web 框架 | FastAPI + Starlette + Uvicorn |
| 数据库 | SQLAlchemy 2.x + Alembic（默认 SQLite） |
| 终端 | tmux + pexpect + pyte（POSIX） |
| 前端 | Vite + React + TypeScript + Tailwind v4 |
| 包管理 | uv（`uv.toml` / `uv.lock`） |
| 质量 | pytest + ruff + mypy(strict) + pre-commit |

### 2.4 Harness 双轨架构

| 轨道 | 模式 | 代表 Harness |
|------|------|-------------|
| **SDK/Subprocess** | 直接驱动厂商模型/SDK | `claude-sdk`, `codex`, `pi`, `cursor` |
| **Native** | 包装厂商 TUI/Server，镜像输出 | `claude-native`, `pi-native`, `opencode-native` |

---

## 3. 核心模块深度拆解

### 3.1 Spec（`omnigent/spec/`）

- 解析 Agent YAML（`docs/AGENT_YAML_SPEC.md`）
- 关键字段：`name`, `prompt`/`instructions`, `executor`, `tools`, `policies`, `os_env`, `terminals`, `spawn`
- 工具类型：`function`、`mcp`、`agent`（子 Agent 委派）、`handoff`

### 3.2 Runtime（`omnigent/runtime/`）

- `AgentCache`：已加载 Agent Spec 缓存
- `HarnessProcessManager`：Harness 子进程生命周期
- `ToolManager`：工具注册与调用
- 库而非服务，可被 Server、测试、嵌入式应用直接调用

### 3.3 Server（`omnigent/server/`）

- `create_app()` 装配所有 Router
- 内置 Agent 种子：`claude-native-ui`, `pi-native-ui`, `polly`, `debby` 等
- 核心路由：`sessions.py`, `hosts.py`, `session_policies.py`, `host_tunnel.py`

### 3.4 Runner（`omnigent/runner/`）

- 拥有 Harness 子进程
- 管理 `SessionResourceRegistry`（终端、环境、文件）
- 驱动 Native Forwarder（TUI → Web 镜像）
- 代理 MCP 服务器

### 3.5 Tools（`omnigent/tools/`）

内置 MCP 工具（Harness 必须桥接）：
- 会话：`sys_session_get_info`, `sys_session_list`, `sys_session_get_history`
- Agent：`sys_agent_get`, `sys_agent_list`, `sys_call_async`
- 策略：`sys_add_policy`, `sys_policy_registry`
- 其他：`load_skill`, `web_fetch`, `web_search`

### 3.6 Policies（`omnigent/policies/`）

三层策略栈（Session > Agent > Server）：

| 裁决 | 行为 |
|------|------|
| **ALLOW** | 静默通过 |
| **ASK** | 暂停，等待用户审批 |
| **DENY** | 阻断并返回错误 |

支持 CEL 表达式策略（`cel-expr-python`）。

---

## 4. 多 Agent/Provider 桥接机制

### 4.1 Harness 注册表（`omnigent/harness_plugins.py`）

插件化 Harness 注册 + 能力声明矩阵，社区扩展入口点：`omnigent.community.harness`

| Key | Harness | Terminal |
|-----|---------|----------|
| claude | `claude-native` | `claude` |
| codex | `codex-native` | `codex` |
| pi | `pi-native` | `pi` |
| cursor | `cursor-native` | `cursor` |
| opencode | `opencode-native` | `opencode` |

### 4.2 Native 轨道：通用模式

```
Web UI 消息
    ↓
Bridge（注入到 Vendor TUI/Server）
    ↓
Vendor 处理
    ↓
Forwarder（镜像 transcript 回 Server）
    ↓
Omnigent Conversation View
```

### 4.3 Pi Native（`pi-native`）

| 组件 | 文件 | 机制 |
|------|------|------|
| Bridge | `omnigent/pi_native_bridge.py` | `~/.omnigent/pi-native/<hash>/` + inbox 文件队列 |
| Extension | `omnigent/resources/pi_native/omnigent_pi_native_extension.js` | Pi Extension API，轮询 inbox |
| Harness | `inner/pi_native_harness.py` | `PiNativeExecutor` |
| Resume | `omnigent/pi_native_resume.py` | 会话目录持久化 |

**消息注入流程**：

```
enqueue_user_message(bridge_dir, content)
  → inbox/<msg_id>.json（原子 rename）
  → Extension 轮询消费
  → pi.sendUserMessage()
```

**Pi SDK Harness**（`harness: pi`）：
- Headless 运行，适合 Polly 的 Review/Explore 子 Agent
- `Resume: COLD_ONLY`（每次冷启动）

### 4.4 能力矩阵对比（节选）

| Harness | 集成模式 | Elicitation | Resume | 子 Agent |
|---------|---------|-------------|--------|---------|
| `claude-native` | NATIVE_TUI | HOOK | WARM_REATTACH | ✓ |
| `codex-native` | NATIVE_TUI | JSONRPC | WARM_REATTACH | ✓ |
| `pi-native` | NATIVE_TUI | NONE | WARM_REATTACH | ✗ |
| `opencode-native` | NATIVE_SERVER | SSE_PERMISSION | WARM_REATTACH | ✓ |
| `pi` (SDK) | CLI_SUBPROCESS | NONE | COLD_ONLY | ✗ |

### 4.5 Polly 多 Agent 编排实例

- **编排脑**：`claude-sdk`（Polly 自身）
- **工人 Agent**：`claude-native`, `codex-native`, `opencode-native`, `cursor-native`, `pi`（headless Review）
- **跨厂商 Review**：实现者与 Reviewer 必须不同厂商

---

## 5. API / SDK 设计

### 5.1 OpenAPI 规范（`openapi.json`）

核心端点域：

| 路径前缀 | 功能 |
|---------|------|
| `/v1/agents` | Agent 目录 |
| `/v1/harnesses` | 已安装 Harness 元数据 |
| `/v1/sessions` | 会话 CRUD |
| `/v1/sessions/{id}/stream` | SSE 事件流 |
| `/v1/sessions/{id}/policies/evaluate` | 策略评估（Native Hook 对接点） |
| `/v1/sessions/{id}/fork` | 会话 Fork |

### 5.2 Python Client SDK（`sdks/python-client/`）

三层抽象：

```python
# 1. Raw Events（1:1 SSE）
async for event in session.send("hello"): ...

# 2. Semantic Blocks
async for block in BlockStream().stream(session, text): ...

# 3. Composable Transforms
pipe(block_stream, skip_intermediate_ends(), merge_text_across_iterations())
```

核心类：`OmnigentClient`, `Session`, `LocalServer`

### 5.3 UI SDK（`sdks/ui/`）

- `RichBlockFormatter`：Block → Rich 渲染
- `TerminalHost`：prompt_toolkit 输入栏 + 后台流式输出

---

## 6. 会话与状态管理

### 6.1 会话模型

- **Conversation**：顶层会话实体（`conv_*` ID）
- **ConversationItem**：消息、工具调用、推理块等
- **Child Sessions**：子 Agent 会话（`parent_session_id` 关联）

### 6.2 状态存储层次

| 层级 | 位置 | 内容 |
|------|------|------|
| Server DB | `<data-dir>/chat.db` | 会话、消息、策略 |
| Bridge Dir | `~/.omnigent/<harness>-native/<hash>/` | Native 运行时状态 |
| Global Config | `~/.omnigent/config.yaml` | 用户级默认配置 |

### 6.3 协作模式

| 模式 | 机制 |
|------|------|
| **Share** | Web UI 分享链接，实时观看 |
| **Co-drive** | `omnigent attach <session_id>`，消息在用户机器执行 |
| **Fork** | `POST /v1/sessions/{source}/fork` |
| **Switch Agent** | `POST /v1/sessions/{id}/switch-agent` |

### 6.4 Resume/Fork 策略

| 策略 | 适用 Harness |
|------|-------------|
| WARM_REATTACH | Native Harness（保持 Vendor 会话状态） |
| COLD_ONLY | SDK Harness（重放历史或冷启动） |

---

## 7. 测试策略

### 7.1 测试金字塔

```
e2e_live（真实 LLM）
  e2e_ui（Playwright）
    e2e（全栈）
      integration（跨组件）
        inner（Harness Executor）
          unit（各 area 镜像）
```

### 7.2 专项测试

| 套件 | 路径 | 用途 |
|------|------|------|
| **Harness Bench** | `tests/harness_bench/` | Harness 能力一致性探测 |
| **Integration** | `tests/integration/` | 每 Harness 真实 LLM 旅程 |
| **Native 测试** | `tests/test_pi_native_*.py` 等 | Bridge 模块 1:1 对应 |

### 7.3 测试 Marker

| Marker | 用途 |
|--------|------|
| `@pytest.mark.live` | 需要真实 API Key |
| `@pytest.mark.llm_flaky` | LLM 非确定性重试 |
| `@pytest.mark.posix_only` | POSIX 专属（tmux/PTY） |

---

## 8. 设计亮点与可借鉴点

| 亮点 | 可借鉴价值 |
|------|-----------|
| **Harness 插件化注册表** | 声明式能力矩阵 + 动态加载，避免硬编码 switch-case |
| **Bridge 文件系统 Rendezvous** | 跨进程 Agent 桥接时，文件系统 + 原子 rename 是简单可靠的消息队列 |
| **统一 Policy Evaluate 端点** | 策略引擎应有单一评估契约，各 Harness 只需实现传输适配 |
| **Server-Runner 分离 + Tunnel** | 区分控制平面（Server）与数据平面（Runner/Host） |
| **SDK 三层抽象** | Raw Events → Blocks → Transforms pipeline |
| **Harness Bench 一致性探测** | 多 Harness 系统需要自动化 conformance suite |
| **Polly 跨厂商 Review** | 厂商多样性可作为 Quality Gate 的一等约束 |

---

## 9. 生态定位与可借鉴点

### 9.1 与 Pi / OpenCode 等执行层的关系

```
Pi  ←── pi-native / pi harness ──→  Omnigent
 │                                      │
 └──────────── OpenCode ────────────────┘
```

| 上游 / 参考 | Omnigent 中的集成点 |
|-------------|-------------------|
| Pi | `pi` SDK harness + `pi-native` TUI harness |
| OpenCode | `opencode-native` harness |
| Codex | `codex` + `codex-native` harness |

### 9.2 对上层编排的价值

1. **编排层参考实现**：Polly 模式、子 Agent 委派 API
2. **Pi Native 集成蓝图**：`pi_native_bridge.py` + Extension JS 是 Web UI ↔ Pi TUI 双向同步的完整参考
3. **治理与安全**：Policy 三层栈可补强 Pi 自身缺失的内置权限系统
4. **SDK/API 契约**：`openapi.json` + `omnigent_client` 可作为对外 API 的设计参考

### 9.3 差异与注意事项

| 维度 | Omnigent | Pi |
|------|----------|-----|
| 定位 | Meta-Harness 编排层 | 单一 Agent Harness |
| 语言 | Python | TypeScript |
| 权限 | 内置 Policy + OS 沙箱 | 无内置，需外部容器化 |
| 多 Agent | 一等公民 | `pi-orchestrator`（实验性） |

### 9.4 建议演进路径

1. **短期**：研究 `omnigent/pi_native_*` 与 `examples/polly/agents/pi/config.yaml`
2. **中期**：参考 Bridge 模式实现独立的 Pi Web 桥接层
3. **长期**：基于 Omnigent 扩展社区 Harness，或抽取 Session/Policy/Host 模式用 TypeScript 重写轻量变体

---

## 附录：关键文件索引

| 主题 | 路径 |
|------|------|
| 项目说明 | `README.md` |
| Agent 规范 | `docs/AGENT_YAML_SPEC.md` |
| Harness 集成指南 | `.claude/skills/harness-integration-guide/SKILL.md` |
| Pi Native E2E | `.claude/skills/pi-native-e2e-dev/SKILL.md` |
| OpenAPI | `openapi.json` |
| Harness 注册表 | `omnigent/harness_plugins.py` |
| Pi Native Bridge | `omnigent/pi_native_bridge.py` |
| Pi Extension | `omnigent/resources/pi_native/omnigent_pi_native_extension.js` |
| Polly 示例 | `examples/polly/config.yaml` |
| Python SDK | `sdks/python-client/omnigent_client/` |

---

*文档生成于 2026-07-05，基于 omnigent 0.5.0.dev0 源码静态分析。*