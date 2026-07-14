# 29. 完成 Runs Steps、Graph、Discussion 与 Logs 交互

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 23, 25, 26, 27, 28
PRD: [../PRD.md](../PRD.md)
User stories: 43–46, 50, 61

## 目标

交付正式 Runs section 的操作闭环，而不是把 Run 控制复制到 Chat。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Steps 默认视图、Graph alternate、Step Inspector、Result、Logs、Attempt history
- 展示 Provider/model、Workspace、assignment、cost、Approval 与 blocker
- Discussion 可选且生命周期独立；Chat 仅摘要/深链
- 支持 pause/cancel，并准确区分 queued/running/waiting/failed/completed

## 验收标准

- [ ] 复杂 DAG 在 Steps/Graph 中指向同一 Step/Attempt ID
- [ ] 可从 Inbox gate 深链并完成 Approval
- [ ] 暂停/取消不删除结果或 Discussion
- [ ] 浏览器冒烟不复制领域状态机断言

## 验证要求

Level 1 读模型测试 + 关键 Runs 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
