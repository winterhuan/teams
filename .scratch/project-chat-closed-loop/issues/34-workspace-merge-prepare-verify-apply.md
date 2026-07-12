# 34. Workspace prepare / verify / apply 合并

Type: implementation
Status: ready-for-agent
Blocked by: 26, 32, 33
PRD: [../PRD.md](../PRD.md)
User stories: 69, 72, 99

## 目标

把 worktree 变更以 prepare→verify→apply 事务合并回来源，而非直接破坏源树。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- prepare 固定 base/head、diff 与目标，检测源状态漂移
- verify 在隔离状态运行指定 command checks 并保存结果
- apply 仅在 verify 成功且源前置条件未变时执行
- 任一步失败可重试/检查，不隐式部分 apply

## 验收标准

- [ ] git fixture 中成功变更只在 apply 后进入目标
- [ ] verify 失败时目标树不变且证据可查
- [ ] apply 前源树变化触发重新 prepare
- [ ] 每阶段 Timeline 与 Workspace state 一致

## 验证要求

Level 1 真实 git/command 集成测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
