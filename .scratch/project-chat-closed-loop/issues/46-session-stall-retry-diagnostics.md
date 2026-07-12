# 46. Session stall 与真实 Provider retry

Type: implementation
Status: ready-for-agent
Blocked by: 16, 28, 45
PRD: [../PRD.md](../PRD.md)
User stories: 10–11, 31–33, 90, 103

## 目标

用 heartbeat/last event 和进程健康检测 stall，在有界策略下恢复或新建 retry。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 区分长推理、无事件、进程死亡和通信中断
- stall 先诊断/核验进程；不得仅凭 lease 超时双启
- retry 创建新 Session/Attempt 并保留旧诊断，受次数/退避/预算限制
- 需要用户处理时投影 Board attention/Inbox，不改 Issue.status

## 验收标准

- [ ] 冻结/杀死真实 fixture 进程得到确定诊断
- [ ] 仍存活进程不会被重复启动
- [ ] 进程缺失时按策略只创建一个 retry
- [ ] 恢复/失败 Timeline 能解释每次决定

## 验证要求

Level 1 虚拟时钟/进程故障注入 + Level 2 Provider 冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
