# 48. WorkflowRun 重启恢复

Type: implementation
Status: ready-for-agent
Blocked by: 25, 26, 28, 47
PRD: [../PRD.md](../PRD.md)
User stories: 37, 41–42, 46–47, 94, 97, 103

## 目标

在任意 Step/Attempt 边界重启 Daemon 后，重建 DAG ready/running/waiting 状态且不重复执行。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 从持久 Definition version、snapshot、StepResult、Attempt 和 Session truth 恢复
- running AI 核验进程；Command 依据结果/执行 token 收敛；Approval 保持等待
- 依赖解锁由已提交 StepResult 推导且幂等
- pause/cancel 意图在重启后继续生效

## 验收标准

- [ ] 在 AI、Command result commit、下游 unlock 各边界注入崩溃
- [ ] 恢复后每个 Step 至多一个有效结果，副作用不重复
- [ ] Run/Steps/Graph 投影恢复前后一致
- [ ] Discussion Thread 不受 Run 恢复影响

## 验证要求

Level 1 crash matrix + Level 2 真 Provider存活恢复。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
