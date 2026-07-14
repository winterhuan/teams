# 09. 创建全局 Soul 并加入多个 Team

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 01
PRD: [../PRD.md](../PRD.md)
User stories: 52–53, 56, 98

## 目标

建立全局 Member（产品语言 Soul）与 TeamMembership 的身份边界。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 创建/编辑 persona、voice、默认 Provider 与稳定 Member ID
- 同一 Member 可加入 Team A 与 Team B，membership 具有独立状态与配置
- 全局编辑前展示影响范围，不把 Team 局部属性写回 Member
- Team 删除/离开不删除全局 Member 或其他 membership

## 验收标准

- [ ] 一个 Soul 同时出现在两个 Team 且保持同一全局身份
- [ ] Team 页面能区分 Member 字段与 membership 字段
- [ ] 全局 persona 修改反映到所有引用并留下审计事件
- [ ] 重复加入同一 Team 幂等或明确拒绝

## 验证要求

Level 1 领域集成 + Team 读模型测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
