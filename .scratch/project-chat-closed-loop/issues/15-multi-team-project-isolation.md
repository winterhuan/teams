# 15. 验证两个 Team 在同一 Project 的隔离交互

Type: implementation
Status: ready-for-agent
Blocked by: 10, 12
PRD: [../PRD.md](../PRD.md)
User stories: 51–57, 98

## 目标

让两个 Team 在同一 Project 并存，证明 Posting、知识、技能和权限不会因共享 Project/Provider 混用。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 两个 Team 各有明确 source Team 的 Posting
- @只唤醒目标 Posting；`@all_active` 仅限明确参与范围
- memory slice、skills、permissions 按 Posting snapshot 隔离
- 相同 Member 或 Provider 也不得合并上下文

## 验收标准

- [ ] 两队并发响应能追溯到各自 Posting/Team
- [ ] Team A 专属上下文不可由 Team B Session读取
- [ ] UI 始终展示来源 Team
- [ ] 跨 Team 自动 transfer/handoff 保持未实现且不被暗中模拟

## 验证要求

Level 1 隔离测试 + Level 3 两队真实 Provider 冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
