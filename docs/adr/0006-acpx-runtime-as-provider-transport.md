# 复用 acpx/runtime 作为 Provider transport

ADR 0005 冻结了 TypeScript-first 小宿主与「深模块、少 seam」的实现哲学，`providers.md` 附录据此描述了 Hearth 自建的四层 transport 抽象（`acp | cli_json | cli_text | thin_drive`）。Issue 02 的首个 tracer bullet 用 `pi --print --mode json` 起 Session，但该路径在 Issue 03 的真实工具调用中连续两轮超时；同时暴露出 `cwd` 不是 Pi 工具沙箱、`pi-acp` 不委托 ACP filesystem/terminal 等一系列 Provider-private 细节。

本 ADR 记录一个此前只散落在 Issue 02/03 comment 里的架构决策：**Hearth 不自建各 Provider 的 ACP/CLI transport 与 session/queue/cancel 机制，而复用 `acpx/runtime` 作为 Provider transport 层。** Hearth 的差异化在 Project、Thread、Issue、Posting、Artifact、Approval、Workspace 这套本地优先账本，而不是重造一个 ACP 客户端。

Issue 03 期间曾实现过一套 Hearth 自建 launcher（`bin/hearth-pi` 启动 `pi --mode rpc`）+ 工具白名单 + 副作用前路径 gate 的边界机制，用于在 `pi-acp` 不委托 ACP filesystem/terminal 时强制路径隔离。经产品决策，**首个闭环放弃这套边界，直接用 acpx 内置 `pi` agent 起 Session，不设工具面裁剪、不设路径 gate、不设 scratch-root 校验**（见 §4）。该 launcher/gate 代码与相关边界测试已删除。

## 1. 决策

- Provider Session 的传输通过 `acpx@0.12.0` 的 `acpx/runtime` 导出驱动，不再以 `pi --print` 作为正式 Session transport；`pi --print --mode json` 仅保留为一次性诊断/降级路径。
- `acpx/runtime` 负责 ACP 会话生命周期、adapter 子进程、cooperative cancel、timeout 与规范化事件流；Hearth 继续拥有 Session / Thread / Approval / Artifact 的权威真相。
- Hearth 只依赖 `acpx/runtime` 的窄接口：`createAcpRuntime`、`createAgentRegistry`、`ensureSession`、`startTurn`（`turn.events` + `turn.result`）、`turn.cancel`、`close`，以及 `AcpSessionStore` 接口。不依赖 acpx 的 CLI、Flows、compare 或输出格式化层。
- 归一化边界固定在 `packages/core/src/provider/acpx-adapter.ts`：把 acpx 的 `text_delta | status | tool_call` 事件与 `AcpRuntimeTurnResult`（`completed | cancelled | failed`）翻译成 Hearth 内部事件（`session.provider_bound | session.running | assistant.delta | tool.started | tool.delta | tool.ended | cost.sample | session.completed | session.failed | session.cancelled`）。终态取自 `turn.result` 而非事件流，遵循 acpx 0.12 契约。

## 2. Session 映射与分库存储

- `sessionKey = hearth-session:<session_id>`；Hearth `sessions.provider_session_ref` 持久化 acpx 返回的 `acpxRecordId`，作为 resume pointer。
- Hearth 实现 acpx 的 `AcpSessionStore`（`SqliteAcpSessionStore`），把完整 `AcpSessionRecord` 存入独立的 `<db>.acpx.db`（WAL 模式），与核心 `hearth.db` 分库。核心库只保存 Session 映射与权威业务状态，不混入 acpx-private 的 record schema。
- 一个 Hearth Session 对应一条 acpx record；重放同一命令不创建第二条 ACP Session（幂等由 Hearth `thread_session_receipts` 保证，acpx 侧由 `sessionKey` 复用保证）。

## 3. Agent 解析

- Hearth 用 acpx 内置的 `createAgentRegistry()` 解析 `pi` agent（即 acpx 自带的 `pi-acp` adapter），不覆盖注册表、不 pin adapter 命令、不注入自建 launcher。
- Session 通过 `AcpxAdapter({ runtime, agent: "pi" })` 起 Pi；model route 由 `sessionOptions.model = "agnes-ai/agnes-2.0-flash"` 声明。
- 若未来需要把某个 adapter 命令固定到 exact 版本（ADR 0005 §1 对生产依赖的 pin 要求），再用 `createAgentRegistry({ overrides })`；当前闭环不做。

## 4. 安全边界（初期不设边界的显式取舍）

- 首个闭环**不在 Provider 流程内设置工具白名单、路径 gate 或 cwd 沙箱**。Session 直接使用 acpx 内置 `pi` agent 与 Pi 的完整工具集，`acpx/runtime` 的 `permissionMode` 固定 `approve-all`。
- 这是一个针对本地单人工具的**显式取舍**：初期优先跑通真实执行脊与账本闭环，把 Agent 的能力面完全放开，不为尚未成型的治理模型预建强制门。
- 因此本闭环**不主张** Provider 子进程被 OS 强隔离：Pi 工具在 Pi 进程内执行，`cwd` 不是沙箱，Agent 可读写本机任意路径。README/PRD 的安全边界描述须与此保持一致，不得声称当前存在工具面裁剪或副作用前路径 gate。
- 治理门（工具面裁剪、副作用前 path/policy gate、Posting autonomy、Approval）整体留给后续 issue（Posting → Issue 11，Approval → Issue 27）。届时若 `pi-acp` 仍不委托 ACP filesystem/terminal，需要一个不依赖单一 Provider 特性的强制点（acpx client fs 委托或统一 policy gate），而不是把 Pi 专属 launcher 当作通用设计。

## 5. 后果

- 采纳 acpx 后，`providers.md` 附录原本的四层自建 transport 抽象（`acp | cli_json | cli_text | thin_drive`）与自建 session/queue/cancel 设计不再是实现路线；该附录随本 ADR 重写为「acpx 作为 transport、Hearth 作为账本」的分工描述。
- Provider Registry（Issue 04）仍是 Hearth 概念：它记录 `hearth_provider_id`、model route、health、capabilities、隐私属性，并映射到一个 acpx agent 名，而不是替代 acpx 的 agent 注册表。Agnes 是 Pi 的 model route（`agnes-ai/agnes-2.0-flash`），不是第二个 Hearth Provider。
- 第二个 Hearth Provider（Codex CLI，Issue 05）优先经由 acpx 的 `codex` agent 接入同一 `acpx/runtime` seam；Codex-to-Agnes 的 Responses-to-Chat bridge 仍是 Hearth 宿主侧的窄 adapter，不进入 acpx，也不进入领域模型。
- 依赖 acpx 带来上游演进风险：其 `AcpSessionStore` 之外的 event-log 目录当前仍固定在 `~/.acpx/sessions/`，event-log-root 扩展作为后续上游/集成改进，不阻塞当前闭环。若 acpx 契约漂移，归一化边界集中在单个 adapter 文件，便于收敛。

## 6. 取舍

复用 acpx 放弃了对 transport 全栈的直接掌控，换来不重造 ACP 客户端、session、queue、cancel 与多 agent 注册的实现成本，并天然对齐 ACP 生态（未来可接 Codex、Claude 等同协议 adapter）。代价是必须把 acpx 视为受归一化 adapter 约束的外部依赖。此决策不改变 ADR 0005 的其余冻结项：SQLite 单库权威、单写者事务、凭据留在宿主。但 §4 记录的「初期不设工具面/路径/policy 边界」是对 ADR 0005 §3.4「secure by isolation」的一个显式、有时限的偏离：首个闭环用能力全开换执行脊跑通，治理门在后续 issue（11 Posting、27 Approval）补齐，届时须落在不依赖单一 Provider 特性的强制点上。
