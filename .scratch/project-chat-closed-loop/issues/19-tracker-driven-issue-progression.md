# 19. 让 Soul 通过 tracker 推进 Issue

Type: implementation
Status: ready-for-agent
Blocked by: 18
PRD: [../PRD.md](../PRD.md)
User stories: 10–13, 16–17, 90

## 目标

要求真实 Agent 使用 tracker 工具显式执行 todo→in_progress→in_review，而非由退出码推导。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- tracker 工具校验 actor、Posting 权限、期望旧状态、目标状态和幂等键
- Session 完成、失败、Approval 等待、command 结果都不隐式迁移
- Principal 可用同一命令面手动覆盖
- 每次迁移记录 actor、reason 与证据引用

## 验收标准

- [ ] Agnes 在真实 Session 中调用 tracker 并完成两次合法迁移
- [ ] 无权限、陈旧 expected status、非法迁移均失败且不部分写入
- [ ] Session 成功但未调用 tracker 时 Issue 保持原状态
- [ ] Board、Thread 与 Timeline 投影一致

## 验证要求

Level 2 真实工具调用 + Level 1 授权/幂等测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
