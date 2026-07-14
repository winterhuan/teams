# 49. Approval resume 崩溃 reconciliation

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 27, 48
PRD: [../PRD.md](../PRD.md)
User stories: 47–50, 85, 97, 103

## 目标

专项证明 grant commit、resume dispatch、side effect、result commit 各崩溃点下不会盲目重复副作用，并能在未知结果时进入可操作 reconciliation。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 持久化 approval decision 与独立 resume dispatch / target idempotency token
- 恢复算法能判断未派发、已派发未确认、已完成
- 无法证明副作用状态时进入 attention，而非盲目重放
- Inbox/Run projection 从同一 Approval 聚合重建

## 验收标准

- [ ] 每个崩溃点重跑测试，Hearth dispatch 始终最多一次；幂等目标始终只有一个业务结果
- [ ] 重复 grant/deny 与并发 delivery 有确定结果
- [ ] 恢复完成后 Approval、Step、Run 状态一致
- [ ] 审计记录足以解释为何继续或暂停

## 验证要求

Level 1 强制崩溃 + at-most-once dispatch / 幂等目标 / unknown reconciliation fixture。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
