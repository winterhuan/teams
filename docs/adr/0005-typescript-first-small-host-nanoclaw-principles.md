# TypeScript-first 小宿主与 NanoClaw 原则

Project Chat 完整闭环将从文档和 throwaway prototype 进入首个产品实现。当前没有需要兼容的生产代码，语言与运行时选择必须同时支持本机 Daemon、SQLite 事务、CLI 子进程、结构化事件流、Web UI 和真实 Provider contract tests，并避免在第一阶段引入多语言构建与跨进程协议负担。

NanoClaw 提供了值得采用的实现哲学：宿主小到可以理解，安全依靠可验证隔离而不是提示词，主机掌握路由和耐久事实，执行器只看到明确授予的输入与挂载，凭据不进入 Agent 工作空间，扩展能力不应无限膨胀核心。但 Hearth 的产品中心是 Project、Thread、WorkflowRun、Issue、Workspace 与 Artifact，不是消息通道，也不应直接复制 NanoClaw 的对象模型或在首个闭环强制 Docker。

## 1. 实现语言与运行时

首个闭环冻结为 **TypeScript-first**：

- 生产代码使用 TypeScript，并启用 `strict`。
- Daemon、CLI、Provider adapters、Codex Responses-to-Chat compatibility gateway、领域模块与读模型运行在 Node.js 22 LTS。
- Web UI 使用 React + TypeScript；构建工具保持轻量，首选 Vite。
- 包管理和工作区使用 pnpm；依赖 exact pin，禁止无审查安装脚本，维护显式 build allowlist。
- 耐久状态使用 SQLite。迁移、事务和查询保持显式；不引入 Redis、消息总线或远程数据库作为首个闭环依赖。
- 测试使用 TypeScript 测试栈：领域/集成首选 Vitest，关键浏览器路径使用 Playwright。
- Provider 进程通过 `child_process.spawn`、stdio/JSONL 或等价结构化传输接入；不通过 PTY 屏幕刮取作为默认实现。

不在首个闭环使用 Rust、Go 或 Python 实现第二套核心。只有在真实 profiling、操作系统能力或可分发性证明 Node 无法满足明确指标时，才可用 ADR 引入窄 native sidecar；领域状态机、命令合同和读模型不得因此复制到第二种语言。

## 2. 小宿主原则

`hearthd` 是小而权威的宿主，不是巨型 Agent framework：

- 它拥有命令事务、领域事实、调度、审批、策略、Workspace 生命周期、Provider 生命周期和读模型。
- 它不重新实现 Provider 自带的完整 ReAct loop，不把每个 CLI 的私有语义泄漏进领域模型。
- Web、CLI 和 tests 通过同一 application interface 调用 Daemon；不得各自直连 SQLite 或 Provider。
- 首个 tracer bullet 可以是 modular monolith 和单个 Daemon 进程。模块边界按领域能力划分，但不为了未来分布式部署预建微服务。
- 优先建设深模块：小 interface 隐藏事务、幂等、恢复与投影复杂度。只有出现两个真实实现时才把 seam 升为公共 Adapter interface；Pi 与 Codex 使 Provider seam 成立。

建议代码布局：

```text
apps/
  daemon/                 # hearthd 组合根、进程生命周期
  cli/                    # 薄客户端
  web/                    # React 投影与命令客户端
packages/
  application/            # public commands / queries / transaction orchestration
  domain/                 # aggregates, invariants, domain events
  storage-sqlite/         # journal, migrations, snapshots/read models
  provider-contract/      # Adapter interface + conformance suite
  provider-pi/            # Pi adapter
  provider-codex/         # Codex CLI adapter
  agnes-responses-bridge/ # Codex Responses API -> Agnes Chat Completions
  policy/                 # 单一 pre-side-effect evaluate
  workspace/              # acquire/lock/worktree/merge
  projections/            # Project read models
```

目录是首选起点而非永久公共协议。不得为每个领域名词机械创建 package；当代码很小时先放在所属深模块内部。

## 3. 从 NanoClaw 采用的原则

### 3.1 Small enough to understand

- 优先少进程、少依赖、少配置和可追踪调用链。
- 每个关键流程必须可从 public command 追到持久事件、进程动作和 read model。
- 删除一个模块后，如果复杂度只是在所有调用方重复出现，该模块有深度；纯转发层应删除。

### 3.2 Host owns durable truth

- Daemon 是唯一权威写者；Provider 只能提交结构化事件或请求动作。
- Issue.status、Approval、Claim、Workspace merge 和 Artifact publish 均由 Daemon 命令验证后提交。
- Agent prose、Provider exit code、浏览器状态和文件存在都不是业务真相。

### 3.3 Single-writer by construction

- SQLite 写入由 Daemon 串行化到明确事务；读模型与领域事实共享提交边界或可靠 checkpoint。
- Project root 同时最多一个 writer；并发执行使用独立 worktree。
- 不照搬 NanoClaw 的 inbound/outbound 双 SQLite，除非未来容器/文件共享实测证明单库 IPC 不可靠。当前 Provider stdio 事件进入 Daemon，不让 Provider 直接写权威数据库。

### 3.4 Secure by isolation, not prompting

- 路径、工具和危险副作用由 OS/Workspace/policy gate 强制，不依赖 system prompt。
- 首个闭环支持 project、worktree、scratch；**不要求、不安装、不启动 Docker**，容器 backend 不属于当前路线图。
- 无法在副作用前执行 gate 的 Provider 不获得对应能力。没有容器时必须诚实标注安全边界：Workspace、env 裁剪和 policy gate 只能约束 Hearth 授予的能力，不能把拥有任意本机执行能力的第三方进程描述为已被 OS 强隔离。
- Provider 子进程获得最小 cwd、env allowlist 和工具面；不得默认继承宿主全部环境。

### 3.5 Credentials stay with the host

- 凭据由 Daemon credential broker 或受支持的 Provider 本机认证读取。
- API key 不写入 Session transcript、领域事件、Workspace、Artifact、命令参数或普通子进程环境快照。
- Agnes bridge 在宿主侧读取密钥并向 Codex 暴露短生命周期本地 endpoint；Codex 不持久化 Agnes raw key。

### 3.6 Skills over core feature growth

- 核心只保留 registry、contracts、policy、lifecycle 和投影。
- Provider、previewer 和未来 ExecutionBackend 作为受 conformance suite 约束的 adapter。
- 但 Hearth 不采用“每人 fork 后任意改代码”作为主要产品配置模型；稳定领域不变量仍由版本化代码和 migrations 维护。

## 4. Codex + Agnes compatibility route

Codex CLI 0.144.1 的自定义 Provider 使用 OpenAI Responses API，而 Agnes 当前可用的是 Chat Completions/Completions；直接调用 Agnes `/responses` 的实测结果失败。因此实现宿主侧兼容网关：

```text
Codex CLI
  -> localhost Responses API
  -> agnes-responses-bridge
  -> Agnes /v1/chat/completions
  -> agnes-2.0-flash
```

该 bridge 是窄 adapter，不进入领域模型，不成为通用 API gateway 产品。它必须转换 streaming text、input items、tool definitions、tool calls/results、usage、finish/error/cancel，并执行请求体/尺寸限制和日志去敏。只转换文本的 demo 不满足 Codex Provider contract。

验收保留两条独立路线：

1. **同模型、不同 harness：** Pi + Agnes 与 Codex CLI + bridge + Agnes，验证执行引擎适配差异。
2. **不同模型、不同 harness：** Pi + Agnes 与 Codex CLI + Codex 原生可用模型，验证真正的跨模型复核。

记录身份时必须分别保存 `hearth_provider_id`、`transport`、`model_provider`、`model` 和可选 `compatibility_route`。Codex CLI 不是模型名，Agnes 也不是第二个 Hearth Provider。

## 5. 明确不采用

- 不复制 NanoClaw 的 messaging group、channel wiring、agent group 或双 DB 对象模型。
- 不让 Provider/Agent 直接写 Daemon 权威数据库。
- 不把 Docker、OneCLI、Bun 或每 Session 一个容器作为 Project Chat 完整闭环的依赖；安装与验收不得要求 Docker。未来只有出现明确、经验证的强隔离需求，并通过独立 ADR 批准后，才能讨论可选容器 backend。
- 不用配置宇宙替代清晰代码，但也不把 fork 源码当普通用户唯一配置方式。
- 不为假想的远程部署拆微服务，不引入 Redis/Kafka。
- 不用 TypeScript 类型代替数据库约束、事务与恢复测试。

## 6. 验证合同

- `pnpm typecheck` 对全部生产包启用 strict TypeScript。
- public Daemon commands 驱动领域集成测试，并断言持久事实与 Project read models。
- SQLite tests 覆盖幂等、并发竞争、崩溃边界与 restart recovery。
- Provider conformance suite 同时运行 fake 故障注入、真实 Pi+Agnes、真实 Codex native 和真实 Codex+Agnes bridge。
- dependency audit 证明生产依赖有明确用途、版本固定、安装脚本受 allowlist 控制。
- 架构评审必须能从 composition root 列出所有有副作用的 adapters；领域模块不得隐式启动进程、读环境或联网。

## 7. 取舍

TypeScript/Node 降低 Daemon、CLI、UI、Provider adapters 与测试之间的语言切换成本，适合快速形成一个可读的 modular monolith，并与 Pi、Codex、JSONL、SQLite 和 Web 技术栈自然衔接。代价是必须主动约束事件循环阻塞、子进程回收、SQLite 写事务、内存上限和类型擦除边界。以上风险通过窄 interfaces、运行时 schema 校验、单写者事务、真实进程测试和恢复测试处理，而不是提前迁移到多语言架构。
