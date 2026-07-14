# 02. 用真实 Pi + Agnes 启动首个 Thread Session

Type: implementation
Status: ready-for-agent
Progress: in-progress
Blocked by: 01
PRD: [../PRD.md](../PRD.md)
User stories: 5, 29, 33, 58, 61–62

## 目标

从 Project Chat 创建无 Issue Thread，真实启动 `pi` 并固定路由 `agnes-ai/agnes-2.0-flash`，把流式响应投影回 Chat。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Session owner 必须是 Thread Turn，且与 Workflow Attempt 互斥
- 持久化 Hearth Provider `pi`、Pi model provider `agnes-ai`、model `agnes-2.0-flash`、cwd、预算和最后事件时间
- 消息先持久化，再启动 Provider；detach 不取消执行，cancel 真实终止子进程
- 生产 `hearthd` 以常驻进程持有活跃 Provider handle，并提供版本化 command/query 与可从游标重放的事件订阅；一次性 CLI 只是客户端
- 归一化文本、usage、stop reason、完成与错误事件；密钥不得进入 transcript、事件或 Workspace

## 验收标准

- [x] 响应来自真实 Pi 进程而非 fixture/fake adapter
- [x] Chat 可见流式文本，Live HUD 可见 owner/provider/model/cwd/last event
- [ ] 关闭客户端后执行继续，重新连接能恢复；cancel 后状态与进程一致（cancel 已实现；detach/resume 需常驻 Daemon，尚未落地——见 Comments）
- [ ] Daemon API 支持按 Session/event cursor 重连，不重复 Chat transcript 或终态事件
- [x] 去敏后的真实 Session trace 可作为验收证据

## 验证要求

Level 2：真实 Provider contract test，必须运行 `pi` + `agnes-ai/agnes-2.0-flash`。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments

- 2026-07-13：首个 tracer bullet 已用 `pi --print --mode json` 验证真实 Pi + Agnes 文本响应，但该 transport 仅保留为一次性诊断/降级路径。正式 Session transport 从 Issue 03 起改用 `acpx/runtime` + Pi ACP；Hearth Session ID 作为 acpx session key，恢复记录写入 Hearth 管理的独立 runtime SQLite。
- 2026-07-14 验收对齐（按现有测试证据勾选）：`packages/core/test/pi-agnes.contract.test.ts` 用真实 `pi` + `agnes-ai/agnes-2.0-flash` 经 `acpx/runtime` 跑通，断言 `session.running` / `assistant.delta` / `session.completed`（usage.totalTokens）、HUD `owner/provider/model/providerSessionRef=hearth-session:<id>`、Chat 末条 assistant 含真实响应；`apps/daemon/test/process-smoke.test.ts` 的 "runs a real acpx Pi tool Session" 从公开 `hearthd start-thread-session` 命令进入，证明非 fake adapter。去敏 trace 见 [`../evidence/03-acpx-runtime-trace.md`](../evidence/03-acpx-runtime-trace.md)（含 2026-07-14 model route 解耦校准）。
  - **detach/resume 未闭环**：`cancel()` 已实现（`AcpxAdapter` `AbortController.abort()` + `turn.cancel`，`acpx-adapter.test.ts` 覆盖）。但"关闭客户端后执行继续、重连恢复"要求一个常驻 Daemon 进程持有运行中的 Session——当前 `hearthd` 是一次性 CLI（`main.ts` 跑一条命令即退出，`process-smoke` 的进程独立性正说明这一点），因此该项保持未勾。detach/resume 的完整闭环归 Issue 45（Session detach/resume/steer/cancel），前置是常驻 Daemon 形态决策。
