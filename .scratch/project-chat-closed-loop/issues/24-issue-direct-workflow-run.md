# 24. 从 Issue 直接启动 WorkflowRun

Type: implementation
Status: ready-for-agent
Blocked by: 17, 21
PRD: [../PRD.md](../PRD.md)
User stories: 7, 16, 34, 36

## 目标

从 Issue detail 启动受控 Run，并把 Acceptance 作为显式输入而不要求主 Thread。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Plan Preview 展示 Issue、Acceptance 与 assignment snapshot
- Run 可引用 Issue 但不拥有或推导 Issue.status
- 启动可选择/不创建 Discussion Thread
- 重复操作使用幂等键防止双 Run

## 验收标准

- [ ] 无 Thread 的 Issue 可启动真实 Run
- [ ] Run 失败、暂停、取消均不改变 Issue.status
- [ ] Acceptance 输入引用稳定 ID，而非复制后失去关联
- [ ] Issue 页面显示 Run 链接与独立状态

## 验证要求

Level 1 Issue/Run 正交测试 + Runs 导航冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
