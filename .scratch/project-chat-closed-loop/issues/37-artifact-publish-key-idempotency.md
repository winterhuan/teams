# 37. Artifact 稳定 publish key 与幂等版本追加

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 36
PRD: [../PRD.md](../PRD.md)
User stories: 73–75, 97

## 目标

用显式 artifact_id 或 Project-scoped stable publish_key 决定版本链，禁止标题/路径/hash 自动合并。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 首次 publish_key 创建 Artifact；后续同 key append version
- 同一发布命令/幂等键重放不追加重复版本
- title/path/hash 只可提示候选并要求显式确认
- 并发发布对版本序号/父关系有确定合同

## 验收标准

- [ ] 同名 report 可创建两个 Artifact
- [ ] 同 publish_key 的不同内容追加两个不可变版本
- [ ] 相同内容的两个独立 Artifact 不被 hash 合并
- [ ] 并发和重放测试不重复/丢失版本

## 验证要求

Level 1 Artifact 事务与并发测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
