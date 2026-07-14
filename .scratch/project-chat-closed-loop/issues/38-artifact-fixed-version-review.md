# 38. Artifact 固定版本 Review

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 17, 30, 37
PRD: [../PRD.md](../PRD.md)
User stories: 16–19, 74, 76

## 目标

让 Acceptance Review 永久绑定 ArtifactVersion ID，而不是 Artifact current 指针。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Review 保存 evidence version、reviewer、decision、comment、时间与相关 command result
- 发布新版本不改变进行中或历史 Review 的渲染内容
- failed Review 可生成 issue comment/reopen 建议，旧 evidence 保留
- done 前按 Issue 规则验证 Acceptance，但不由 Artifact 自动改状态

## 验收标准

- [ ] Review v1 后发布 v2，v1 review 内容/hash 不变
- [ ] 重复 decision 幂等；冲突 decision 明确拒绝
- [ ] 从 Board/Artifact/Inbox 深链打开同一版本
- [ ] 来源对象归档后 Review 仍可读取证据

## 验证要求

Level 1 不变性测试 + fixed-version Review 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
