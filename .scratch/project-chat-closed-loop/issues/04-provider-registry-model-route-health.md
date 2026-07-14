# 04. 建立 Provider Registry、Model Route 与健康状态

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 02
PRD: [../PRD.md](../PRD.md)
User stories: 58–61, 92

## 目标

把 Hearth 执行适配器与适配器内部模型路由建模为两个可检查层级。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Provider Registry 记录能力、隐私属性、enabled、health、成本信号与可用控制面
- Pi route 独立记录 model provider/model；不得把 Agnes 当作第二个 Hearth Provider
- 启动前健康探测；不健康候选不得创建 Session
- Team、Posting、Session 与 Live HUD 使用同一解析结果投影

## 验收标准

- [ ] UI/API 可同时显示 `Hearth Provider: pi` 与 `agnes-ai/agnes-2.0-flash`
- [ ] 健康状态变化可被 Daemon 读取且有 Timeline 诊断
- [ ] 禁用或不健康 Provider 的启动失败发生在 Session launch 前
- [ ] Registry 与 model route 不泄漏认证材料

## 验证要求

Level 1 registry/解析测试 + Level 2 Pi 健康探测。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments

- 2026-07-13 transport 前提校准（[ADR 0006](../../../docs/adr/0006-acpx-runtime-as-provider-transport.md)）：Issue 03 后 Provider transport 已固定为 `acpx/runtime`，本 issue 的 Registry 不再建模自建 `acp | cli_json | cli_text | thin_drive` 四层 transport。校准后的范围：
  - Registry entry 记录**账本身份 + acpx 接入参数 + 能力声明**，`transport` 字段固定 `acpx`，具体 ACP adapter 由 `acpx_agent`（如 `pi` / `codex`）或 agent command 覆盖决定；schema 见 `design/annex/providers.md` §2。
  - health 探测可复用 acpx `doctor()` / `probeAvailability()` 作为信号，但结果与 Timeline 诊断由 Hearth 账本记录；不健康候选仍必须在 Session launch 前失败。
  - 两层可检查模型保持不变：Hearth Provider（`pi`）与其内部 model route（`agnes-ai/agnes-2.0-flash`）分开记录，Agnes 不是第二个 Hearth Provider。
  - 认证材料不进入 Registry / model route / acpx 命令行；credential broker 归属仍在宿主。
- 2026-07-14 现状快照（不改本 issue 状态与勾选）：
  - **已存在的记录：** 仅 Pi 一条 Hearth Provider 通过 acpx transport 跑通（Issue 03），事实上确立了 `hearth_provider_id="pi"` + `acpx_agent="pi"` + model route `agnes-ai/agnes-2.0-flash` 的单条隐式条目；Registry 尚未落成一等对象。
  - **Codex 侧进展：** `agnes-codex-bridge` 作为 Codex 的 compatibility route（model route 侧）已跑通真实端到端（见 Issue 05 2026-07-14 comment 与 [`../evidence/05-codex-agnes-bridge-trace.md`](../evidence/05-codex-agnes-bridge-trace.md)）。bridge 不进 Registry / acpx transport / Hearth 领域模型，仅作为 Codex 未来注册后的 `compatibility_route` 端点。
  - **仍待办：** 把 `codex` 作为第二个 `hearth_provider_id` 注册（`transport=acpx`, `acpx_agent=codex`），并让两层可检查模型（Hearth Provider `pi` / `codex` 与各自 model route）在 UI/API 同时可见、health 状态可读、Timeline 诊断可追。建议 Registry 一等化随 Codex acpx transport 接入一起交付，避免只服务单 Provider 的空壳；本 issue 顶层 checklist 因此保持全部未勾选。
