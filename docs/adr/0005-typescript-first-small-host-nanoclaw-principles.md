# TypeScript-first 小宿主

Project Chat 完整闭环将从文档和 throwaway prototype 进入首个产品实现。当前没有需要兼容的生产代码，语言与运行时选择必须同时支持本机 Daemon、SQLite 事务、CLI 子进程、结构化事件流、Web UI 和真实 Provider contract tests，并避免在第一阶段引入多语言构建与跨进程协议负担。

本 ADR 只从 NanoClaw 借鉴一条理念——**宿主小到能看懂**——而不照搬它的产品模型、对象模型或安全姿态。Hearth 不是消息通道宿主，不复制 NanoClaw 的双 SQLite 消息桥或 agent group，也不在首个闭环强制 Docker 或容器隔离。凡涉及 NanoClaw 的容器默认隔离、通道 wiring、fork-as-config 等设计，均不采用（见 §5）。Hearth 的产品中心是 Project、Thread、WorkflowRun、Issue、Workspace 与 Artifact。

## 1. 实现语言与运行时

首个闭环冻结为 **TypeScript-first**：

- 生产代码使用 TypeScript，并启用 `strict`。
- Daemon、CLI、Provider adapters、Codex Responses-to-Chat compatibility gateway、领域模块与读模型运行在 Node.js 22 LTS。
- Web UI 使用 React + TypeScript；构建工具保持轻量，首选 Vite。
- 包管理和工作区使用 pnpm；依赖 exact pin，禁止无审查安装脚本，维护显式 build allowlist。
- 耐久状态使用 SQLite。迁移、事务和查询保持显式；不引入 Redis、消息总线或远程数据库作为首个闭环依赖。
- 测试使用 TypeScript 测试栈：领域/集成首选 Vitest，关键浏览器路径使用 Playwright。
- Provider 进程通过结构化传输接入，不通过 PTY 屏幕刮取作为默认实现。ADR 0006 进一步将 ACP transport 冻结为复用 `acpx/runtime`（而非自建 `child_process.spawn` + JSONL 会话层）；Hearth 只实现 `AcpSessionStore` 与事件归一化，保留账本真相。

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
  policy/                 # 单一 pre-side-effect evaluate（后置：初期不设 gate，见 §3 安全边界注）
  workspace/              # acquire/lock/worktree/merge
  projections/            # Project read models
```

目录是首选起点而非永久公共协议。不得为每个领域名词机械创建 package；当代码很小时先放在所属深模块内部。

## 3. 核心理念：小到能看懂

从 NanoClaw 只借这一条，并把它落到 Hearth 自己的架构上：

- 优先少进程、少依赖、少配置和可追踪调用链。
- 每个关键流程必须可从 public command 追到持久事件、进程动作和 read model。
- 删除一个模块后，如果复杂度只是在所有调用方重复出现，该模块有深度；纯转发层应删除。

以下三条不是「从 NanoClaw 采用」，而是 Hearth 作为本地优先账本的自身基石，恰好与该理念一致：

**Host owns durable truth（宿主持有耐久真相）**

- Daemon 是唯一权威写者；Provider 只能提交结构化事件或请求动作。
- Issue.status、Approval、Claim、Workspace merge 和 Artifact publish 均由 Daemon 命令验证后提交。
- Agent prose、Provider exit code、浏览器状态和文件存在都不是业务真相。

**Single-writer by construction（构造上单写者）**

- SQLite 写入由 Daemon 串行化到明确事务；读模型与领域事实共享提交边界或可靠 checkpoint。
- Project root 同时最多一个 writer；并发执行使用独立 worktree（Workspace 生命周期，见 ADR 0004 §6）。
- Provider stdio 事件进入 Daemon，不让 Provider 直接写权威数据库。不引入 NanoClaw 的 inbound/outbound 双 SQLite 消息桥。

**Credentials stay with the host（凭据留在宿主）**

- 凭据由 Daemon credential broker 或受支持的 Provider 本机认证读取。
- API key 不写入 Session transcript、领域事件、Workspace、Artifact、命令参数或普通子进程环境快照。
- Agnes bridge 在宿主侧读取密钥并向 Codex 暴露短生命周期本地 endpoint；Codex 不持久化 Agnes raw key。

> **安全边界（初期不设隔离门）：** 首个闭环**不**实现 OS/容器隔离、Workspace 路径 gate、工具面裁剪或最小 env allowlist。Session 直接以宿主权限运行 Provider，Agent 可读写本机任意路径（见 [ADR 0006](0006-acpx-runtime-as-provider-transport.md) §4）。这是针对本地单人工具的显式取舍：优先跑通真实执行脊与账本闭环。治理门（path/policy gate、Posting autonomy、Approval）留给后续 issue，届时的强制点不应依赖单一 Provider 特性。文档不得声称当前 Provider 子进程已被 OS 强隔离或工具面已被裁剪。

## 4. Codex + Agnes compatibility route

Codex CLI（0.144.1）本身经由 `acpx/runtime` 的内置 `codex` agent（`codex-acp`）接入 Hearth，与 Pi 走同一 transport seam（ADR 0006）。transport 归 acpx；本节只处理 **model route** 一侧：Codex 的自定义 Provider 使用 OpenAI Responses API，而 Agnes 当前可用的是 Chat Completions/Completions；直接调用 Agnes `/responses` 的实测结果失败。因此在宿主侧实现兼容网关，作为 Codex 的自定义 Provider endpoint：

```text
Hearth (hearthd)
  -> acpx/runtime（codex agent / codex-acp，transport 层）
  -> Codex CLI
       -> localhost Responses API（agnes-responses-bridge，Hearth 宿主侧）
       -> Agnes /v1/chat/completions
       -> agnes-2.0-flash
```

该 bridge 是窄 adapter，**独立于 acpx**（acpx 只管 ACP 会话与进程，不知道 Agnes），既不进入领域模型，也不成为通用 API gateway 产品。它必须转换 streaming text、input items、tool definitions、tool calls/results、usage、finish/error/cancel，并执行请求体/尺寸限制和日志去敏。只转换文本的 demo 不满足 Codex Provider contract。

验收保留两条独立路线（两者的 transport 都是 acpx `codex` agent，只有 model route 不同）：

1. **同模型、不同 harness：** Pi + Agnes 与 Codex CLI + bridge + Agnes，验证执行引擎适配差异。
2. **不同模型、不同 harness：** Pi + Agnes 与 Codex CLI + Codex 原生可用模型，验证真正的跨模型复核。

记录身份时必须分别保存 `hearth_provider_id`、`transport`（固定 `acpx`）、`model_provider`、`model` 和可选 `compatibility_route`（仅 bridge 路线填）。Codex CLI 不是模型名，Agnes 也不是第二个 Hearth Provider。

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
