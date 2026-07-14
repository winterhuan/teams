# 20. 实现 Issue 评论、Bundle 与 Goal Issue

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 17
PRD: [../PRD.md](../PRD.md)
User stories: 19–21

## 目标

把显式标记的开放问题评论打包为 Goal Issue，同时让普通讨论保持普通评论。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 评论区分 note / issue comment，并有 open/bundled/done/discarded 生命周期
- Bundle 只接受用户勾选且 open 的 issue comments，可跨 Issue
- 新 Goal Issue 的 Acceptance item 回指源 comment
- Bundle 只创建承诺对象，不自动 Claim 或 Session

## 验收标准

- [ ] 普通 note 默认不在 Bundle 候选中
- [ ] 重复 Bundle 命令不创建第二 Goal Issue或重复 Acceptance
- [ ] 源评论状态与反向链接一致
- [ ] discarded/done 评论不能被无意重复打包

## 验证要求

Level 1 领域集成 + Issue detail 投影测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
