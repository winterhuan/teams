# 13. 实现负责人、接手与交回

Type: implementation
Status: ready-for-agent
Blocked by: 12
PRD: [../PRD.md](../PRD.md)
User stories: 23–27

## 目标

在 Thread 内建立 advisory/enforced 责任策略和可审计接手/交回，而不混淆 Issue assignee。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 记录 current responsible Posting、policy 与 handoff timeline
- 接手、交回都要求结构化 handover summary
- handoff 默认不修改 Issue assignee；提供显式同步操作
- 单 Soul Thread 默认隐藏复杂 relay UI

## 验收标准

- [ ] 交接前后责任人及 Session segment 准确投影
- [ ] 无权接手在命令层被拒绝
- [ ] 同步 assignee 必须是独立审计命令
- [ ] 删除/撤销 Posting 后历史负责人仍可识别

## 验证要求

Level 1 领域测试 + Chat 责任投影冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
