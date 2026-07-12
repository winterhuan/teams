# 10. 将 Team 派驻到 Project 并生成 Posting

Type: implementation
Status: ready-for-agent
Blocked by: 09
PRD: [../PRD.md](../PRD.md)
User stories: 22, 51, 53–57

## 目标

把 Team 中的 Soul 以唯一、显式来源的 Project Posting 派驻到 Project。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Posting 配置 role、autonomy、skills、permissions、memory slice、Provider override
- 同一 Member 在同一 Project 只允许一个 active Posting
- Member 经多个 Team 可用时强制选择 source Team，不合并隐式权限
- Posting 变更只影响当前 Project；撤销 Posting 不删除历史执行身份

## 验收标准

- [ ] 多 Team Soul 未选 source Team 时创建失败并给出可操作原因
- [ ] 重复 Posting 在事务层被阻止
- [ ] Team section 完整展示来源和覆盖项
- [ ] 历史 Session 仍保留启动时 Posting snapshot

## 验证要求

Level 1 并发唯一性测试 + Team 投影测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
