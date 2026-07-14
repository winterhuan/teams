# 44. Artifact export 与硬门 publish

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 27, 37
PRD: [../PRD.md](../PRD.md)
User stories: 48–50, 83–85

## 目标

区分本地固定版本 export 与外部分发 publish，并在任何外部副作用前审批。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- export 只读指定 ArtifactVersion，不改变 current/unseen/review
- publish pointer 明确目标、版本、权限与风险，并创建 Approval
- 无 pre-side-effect gate 的 adapter 不提供 publish
- grant 幂等；Hearth publish dispatch 至多一次，目标使用幂等键或可查询状态；deny/失败/未知保留审计

## 验收标准

- [ ] 多次 export 得到相同 hash 且不创建新版本
- [ ] publish 未 grant 前外部计数器为零
- [ ] 双 grant/恢复只产生一次 Hearth dispatch；目标幂等或 reconciliation 后只有一个发布结果
- [ ] 导出与发布在 UI/API 文案和权限上明确分离

## 验证要求

Level 1 hard-gate 副作用计数器 + export fixture。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
