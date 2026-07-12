# 18. 原子 Claim Issue 并启动真实 Pi Session

Type: implementation
Status: ready-for-agent
Blocked by: 11, 16, 17
PRD: [../PRD.md](../PRD.md)
User stories: 8–11, 15, 94–97

## 目标

从 Todo Issue 自动拉取到真实 Pi+Agnes Session，保证 generation 内至多一个 Claim。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- eligibility 检查 actionable 状态、依赖、Posting/Provider、并发与 active generation
- Claim、execution owner、start idempotency key、Timeline event 在启动 Provider 前提交
- 自动 scheduler 与手动 trigger 走同一原子竞争路径
- 启动失败留存诊断并释放/重试 Claim，但不改 Issue.status

## 验收标准

- [ ] 重复 tick、手动/自动竞态、双 worker 均只能产生一个 active Claim
- [ ] 真实 Pi Session 可追溯回 Claim、Issue、Posting 和主 Thread
- [ ] 启动 commit 后崩溃可恢复且不双跑
- [ ] Board 同时显示业务状态与 Claim/Session attention

## 验证要求

Level 1 并发/崩溃注入 + Level 2 真 Pi claim trace。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
