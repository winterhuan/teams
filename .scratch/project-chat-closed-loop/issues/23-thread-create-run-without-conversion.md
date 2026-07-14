# 23. 从 Thread 创建 Run，但不转换 Thread

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 12, 21
PRD: [../PRD.md](../PRD.md)
User stories: 34–35, 44–46

## 目标

在 Chat 中选择消息/Artifact/目标创建 Run，只建立来源/讨论链接，不改变 Thread 本体。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 保留 source_thread_id 与可选 discussion_thread_id
- 选中的消息、ArtifactVersion 与目标进入 Plan Preview inputs
- Thread 不新增 orchestration/pipeline mode；同一 Thread 可创建多个 Run
- Chat 仅显示 Run 摘要、当前 blocker 与深链

## 验收标准

- [ ] 创建 Run 前后 Thread 生命周期和消息流不变
- [ ] 两个 Run 可引用同一 Thread 而彼此独立
- [ ] 暂停/取消 Run 不归档 Discussion Thread
- [ ] 未选择 Discussion 时不自动创建

## 验证要求

Level 1 链接语义测试 + Chat→Plan Preview 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
