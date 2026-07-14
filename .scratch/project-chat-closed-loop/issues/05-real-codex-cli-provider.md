# 05. 接入第二个真实 Hearth Provider：Codex CLI

Type: implementation
Status: ready-for-agent
Progress: in-progress
Blocked by: 04
PRD: [../PRD.md](../PRD.md)
User stories: 28, 58, 60, 62, 98

## 目标

实现 Codex CLI 适配器，用真实 Codex 进程证明 Hearth Provider 层不是 Pi 专用壳。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 用 strict TypeScript 实现 Codex adapter，适配启动、JSONL 事件、取消、完成、错误和健康探测；不以 PTY 刮屏作为默认路径
- 保存 `hearth_provider_id`、transport、model provider、model 和 compatibility route，同时输出统一 Hearth Session events
- 支持两条真实 route：Codex native model route；宿主侧 Responses-to-Chat bridge 到 `agnes-ai/agnes-2.0-flash`
- Agnes bridge 必须覆盖 streaming、input items、tool definitions、tool call/result、usage、finish/error/cancel；文本-only proxy 不合格
- Session 启动后 Provider 不可变；Pi 与 Codex 可在同一 Project 并行
- 认证只由宿主 credential broker 或受支持本机机制读取；Agnes raw key 不传给 Codex、不进入命令行或 Hearth 领域数据
- 安装与运行不依赖 Docker；子进程使用最小 cwd/env 和可验证的 policy/sandbox 能力

## 验收标准

- [ ] 同一真实任务分别由 Pi 与 Codex 完成并形成两个独立 Session（Pi 与 Codex-native 各自的真实 adapter 已分别验证；同一 Project 内并行双 Session 待 Registry/解析落地）
- [~] Codex native route 与 Codex+Agnes compatibility route 都通过 adapter contract；后者确认实际模型为 `agnes-2.0-flash`（native route 已通过 `codex-native.contract.test.ts`；bridge/compatibility route 已通过 `codex-agnes.contract.test.ts`；两条真实路线均成立，acpx 归一化事件仅 native 侧覆盖）
- [x] Codex 输出不是录制 fixture；可观察真实进程、模型响应与 usage（若上游提供）
- [x] Agnes bridge 的真实 tool-call round trip、stream、cancel 与错误归一化通过，不只验证纯文本响应
- [ ] 取消真实终止 Codex；异常退出归一为诊断事件
- [ ] UI 能区分 Hearth Provider、transport、compatibility route、底层模型与 Soul
- [x] 日志与持久记录中不存在 Agnes/OpenAI raw key，测试过程不要求 Docker

## 验证要求

Level 2：真实 Codex contract test；与 Pi contract test 使用同一适配器合同套件。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments

- 2026-07-13 transport 前提校准（[ADR 0006](../../../docs/adr/0006-acpx-runtime-as-provider-transport.md)）：Codex 接入不再自建 JSONL transport，而是复用 `acpx/runtime` 的内置 `codex` agent（`codex-acp`）。校准后的范围：
  - Codex adapter = 复用 Pi 已验证的 acpx 消费路径（`ensureSession` / `startTurn` / `turn.result` 归一化），只需换 `acpx_agent = "codex"`；启动、事件、cancel、错误、health 走同一套 Hearth 归一化事件契约（`design/annex/providers.md` §3–§4）。
  - **Provider seam 由此成立**：Pi + Codex 两个真实 adapter 满足 ADR 0005 §2「出现两个真实实现才升 seam」；两者跑同一 conformance 套件。
  - Agnes Responses-to-Chat bridge 仍是独立于 acpx 的窄网关，覆盖 streaming / input items / tool defs / tool call+result / usage / finish·error·cancel；文本-only proxy 不合格。bridge 不进 acpx，也不进 Hearth 领域模型。
  - 记录字段保持 `hearth_provider_id` / `transport=acpx` / `model_provider` / `model` / `compatibility_route`（仅 bridge 路线填）；Codex CLI 不是模型名，Agnes 不是第二个 Hearth Provider。
  - Agnes/OpenAI raw key 不传给 Codex、不进命令行、不进持久记录；安装与运行不依赖 Docker。
- 2026-07-14 阶段性进展（compatibility route 侧已跑通；acpx transport 侧待办）：
  - **Compatibility route 侧（已跑通，勾选「Agnes bridge tool-call round trip / stream / cancel / 错误归一化」与「不含 raw key、不依赖 Docker」）：**
    - 实现：`packages/core/src/provider/agnes-codex-bridge.ts`（`developer→system` role 归一化、非 `function` tool 过滤、`Authorization: Bearer <upstream>` 替换、SSE 透传、Codex 端断连级联 abort、`localToken` Bearer 鉴权、上游错误状态原样保真）。
    - Level 1 覆盖：`packages/core/test/agnes-codex-bridge.test.ts`（归一化、鉴权、上游错误、下游断连取消上游）。
    - Level 2 真实端到端：`packages/core/test/codex-agnes.contract.test.ts` = `@openai/codex 0.144.1 --sandbox danger-full-access --json` + 本地 bridge + Agnes `/v1/chat/completions` + `agnes-2.0-flash`。两条真实路径都通过：(a) 纯文本 turn（`HEARTH_CODEX_AGNES_TEXT_OK` + `turn.completed.usage.input_tokens/output_tokens` 非零）；(b) `shell_command` 工具往返（写 `codex-agnes.txt=HEARTH_CODEX_AGNES_TOOL_OK` 后再读回并按格式复述）。
    - 凭据安全：Agnes raw key 仅由测试内 `agnesCredential()` 从宿主 credential 位置读取（env `AGNES_API_KEY` 或 `~/.pi/agent/models.json`），通过 bridge 内存下发给 Agnes upstream；Codex 端仅拿短生命周期 `HEARTH_AGNES_BRIDGE_TOKEN`（env），未进入命令行 argv、Session/HUD 事件、SQLite、Artifact、Workspace 与任何持久记录。
    - 去敏 provider/model/Session trace 见 [`../evidence/05-codex-agnes-bridge-trace.md`](../evidence/05-codex-agnes-bridge-trace.md)。
  - **acpx transport 侧（待办，主 checklist 其余项目保持未勾）：** 当前 codex-agnes 契约测试通过 `execFile(node, codex.js exec …)` 直起 Codex CLI，仅为**验证 model route + bridge**，**未**经 `acpx/runtime` 的 `codex` agent（`codex-acp`）接入 Hearth Session 归一化路径。因此以下验收条目仍未闭环：「同一真实任务分别由 Pi 与 Codex 完成并形成两个独立 Session」「Codex native route 通过 adapter contract」「取消真实终止 Codex；异常退出归一为诊断事件」「UI 能区分 Hearth Provider / transport / compatibility route / 底层模型 / Soul」。
  - **下一步（保持 status = ready-for-agent）：**
    1. 用 `AcpxAdapter({ agent: "codex" })` 起 codex-acp，`sessionKey = hearth-session:<session_id>`，复用 `SqliteAcpSessionStore`（分库 `<db>.acpx.db`）；把 codex-acp 事件按 `design/annex/providers.md` §4.1 归一化为 Hearth `session.provider_bound / session.running / assistant.delta / tool.* / cost.sample / session.completed·cancelled·failed`。
    2. 保留 bridge 作为 Codex 的自定义 `model_provider` endpoint（compatibility route），Codex native route 与 Codex+Agnes compatibility route 都跑 Pi/Codex 共用 conformance 套件（`ensureSession` / `startTurn` / `turn.result` 归一化 / cancel / error / health）。
    3. UI/API 同时呈现 `Hearth Provider: pi` 与 `Hearth Provider: codex`，`transport=acpx`，model route 分列（Codex native 或 `agnes-ai/agnes-2.0-flash` + `compatibility_route`）；Provider seam 由 Pi + Codex 两个真实 adapter 后才成立（ADR 0005 §2）。
  - **记录字段落地状态：** `hearth_provider_id / transport=acpx / model_provider / model / compatibility_route` 目前仅在 Pi 侧真实成立（Issue 03）；Codex 侧的 `codex` `hearth_provider_id` 与 `compatibility_route` 字段随 acpx transport 接入一并落到 Registry 与 Session 记录，本轮不生效。
- 2026-07-14 关键进展（Codex native transport 经 acpx seam 已跑通）：探测确认 acpx 内置 `codex` agent（解析为 `npx -y @agentclientprotocol/codex-acp@^0.0.44`）经同一 `AcpxAdapter` 起 Session 后，`getStatus().models.availableModelIds` advertise 真实 GPT-5 native 模型（`gpt-5.5[low|medium|high|xhigh]`、`gpt-5.4*`、`gpt-5.3-codex*`、`gpt-5.2*`），**无需 bridge**。
  - 新增 `packages/core/test/codex-native.contract.test.ts`：用 `AcpxAdapter({ agent: "codex" })` + `SqliteAcpSessionStore` 起真实 Codex native Session，prompt 回 `HEARTH_CODEX_NATIVE_OK`，断言 `session.provider_bound`（`providerSessionRef=hearth-session:<id>`）→ `session.running` → `assistant.delta` → `session.completed(stopReason)`。**Pi 与 Codex 两个真实 adapter 跑同一 `AcpxAdapter` seam，零适配器改动**——ADR 0005 §2「两个真实实现才升 seam」由此在 transport 层由证据支撑。
  - 实现上把内部 `ThreadSessionLaunchSpec` 的 `hearthProviderId/modelProvider/model` 从字面量放宽为 `string`（`acpModelId` 早已解耦），使同一 seam 能同时承载 Pi 与 Codex；**公开 `thread.session.start` 命令仍 pi-locked**（`parseThreadSessionStartCommand` 不变），通用 Provider 选择归 Issue 06。新增常量 `CODEX_NATIVE_ACP_MODEL_ID`。
  - 仍未闭环：「同一 Project 内 Pi/Codex 并行双 Session」需 Registry（Issue 04）+ 解析优先级（Issue 06）；「取消真实终止 Codex」「异常退出归一诊断」的 Codex 侧确定性用例、以及 UI 区分，留待后续。去敏 trace 见 [`../evidence/05-codex-agnes-bridge-trace.md`](../evidence/05-codex-agnes-bridge-trace.md) 的 07-14 native 追加节。
