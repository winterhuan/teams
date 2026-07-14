# 16. 建立 Team 并发、队列与公平调度

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 12, 15
PRD: [../PRD.md](../PRD.md)
User stories: 8–10, 22, 29, 96, 98

## 目标

实现 Project/Team/Soul 三层并发约束及可解释的优先级、公平队列。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 同一 Soul 同时最多一个 Thread Turn；不同 Soul/Team 可并行
- 排序为显式 priority 后 creation time，并防止长期饥饿
- 并发槽由 Session 终止、取消或恢复确认后释放
- @风暴合并为可追踪 digest/队列项，不丢原消息

## 验收标准

- [ ] 受控并发测试证明上限、顺序和槽释放
- [ ] 真实 Pi Session 占槽期间第二任务排队，结束后启动
- [ ] Daemon 重启后不把仍存活执行误判为空闲
- [ ] 队列与原因可在 UI/API 检查

## 验证要求

Level 1 虚拟时钟/并发测试 + Level 2 真实占槽冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
