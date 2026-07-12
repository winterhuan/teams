# 50. OAuth 编码场景端到端验收

Type: implementation
Status: ready-for-agent
Blocked by: 14, 19, 30, 34, 38, 44, 47, 48, 49
PRD: [../PRD.md](../PRD.md)
User stories: 18, 22–24, 34–50, 58–70, 73–77, 85, 90, 94–99, 101–104

## 目标

用真实 Pi+Agnes writer 与真实 Codex verifier 完成 OAuth fixture 的编码、复核、验证、审批、发布和 Review。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Todo Issue 原子 Claim；Pi writer 在隔离 Workspace 实现 OAuth/CSRF fixture
- Codex verifier 通过 bounded handover 复核并触发一次可预期修正
- Run 含 AI、Command test、Approval publish；merge 使用 prepare/verify/apply
- 发布固定 ArtifactVersion，tracker 进入 In Review，Acceptance 绑定版本/command evidence
- 中途 detach，并至少演练一次 Daemon restart 后从 Inbox 返回

## 验收标准

- [ ] 所有 Provider 响应与工具调用是真实执行，不使用 deterministic fake 作为验收证据
- [ ] 完整 trace 可从 Project→Board/Chat/Runs/Workspace/Artifacts/Inbox 导航
- [ ] Issue.status 从未被运行故障隐式修改；无双 Claim/Session/副作用
- [ ] 测试命令、去敏 traces、版本 hash 与最终 Review decision 归档

## 验证要求

Level 4 系统场景；允许 Level 1 fixtures 注入故障，但 Agent 输出必须来自真实 Pi 与 Codex。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
