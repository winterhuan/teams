# 27. 执行幂等 Approval Step 与 at-most-once resume dispatch

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 25
PRD: [../PRD.md](../PRD.md)
User stories: 47–50, 85

## 目标

在副作用前暂停，并让 Run、Chat、Inbox 投影同一个可幂等 grant/deny 的 Approval；Hearth 保证 resume dispatch 至多一次，外部目标通过幂等键或 reconciliation 收敛。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Approval 具有稳定 ID、scope、风险摘要、请求者、目标副作用与状态
- grant/deny 使用幂等键；deny 后不可 grant；grant 后从 Hearth ledger at-most-once dispatch
- 无 pre-tool gate 的适配器不能暴露危险 capability
- 外部动作必须声明幂等键、状态查询或人工 reconciliation 合同；无法证明结果时进入 attention，不盲目重放

## 验收标准

- [ ] 双击、重复 API delivery、并发 grant 只恢复一次
- [ ] Run/Chat/Inbox 操作的是同一 Approval ID
- [ ] deny 保留审计并使 Step 按策略结束
- [ ] 受控副作用计数器证明 Hearth dispatch 至多一次；目标幂等重放只产生一个业务结果

## 验证要求

Level 1 故障注入/并发测试 + Approval 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
