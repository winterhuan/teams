# 12. 在 Thread 中 @Posting 并可靠唤醒 Soul

Type: implementation
Status: ready-for-agent
Blocked by: 03, 11
PRD: [../PRD.md](../PRD.md)
User stories: 22–25

## 目标

实现“消息先持久化 → wake-up 入队 → 并发检查 → Session”的可靠 @ 路径。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 普通无 @ 消息不自动唤醒；收件人以 Posting ID 解析
- message append 与 wake-up enqueue 原子提交
- 并发槽满、暂不可执行或 Provider 不可用时保留 queued wake-up
- delivery 重试使用幂等键，不重复启动 Session

## 验收标准

- [ ] 真实 @Pi Posting 后收到真实回复
- [ ] 无效 Posting 不丢消息并展示发送失败/待处理状态
- [ ] 重复消费 wake-up 只有一个 Thread Turn Session
- [ ] 队列释放后自动启动且保留原消息因果链

## 验证要求

Level 1 事务/并发测试 + Level 2 真实 Pi wake-up。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
