# 17. 创建 Issue、Acceptance 与显式业务状态

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 01
PRD: [../PRD.md](../PRD.md)
User stories: 6–7, 12–17, 90–91

## 目标

交付 Board Issue、Acceptance 及只由 Principal/tracker 修改的稳定业务状态。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 支持从 Board 创建和从 Thread 显式提升，且创建不自动执行
- 状态 slug 固定为 triage/backlog/todo/in_progress/blocked/in_review/done/cancelled
- Acceptance 支持 manual 与 command；cancelled 离开 active Board 但可查
- runtime attention 使用独立 badge，不从执行状态派生业务状态

## 验收标准

- [ ] 非法状态迁移或无权限命令被拒绝并审计
- [ ] Provider/Session/Run 失败测试均不改变 Issue.status
- [ ] UI 文案可变化但 API slug 稳定
- [ ] Thread 提升只复制用户确认的上下文并保留来源引用

## 验证要求

Level 1 Issue 状态机 + Board 投影测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
