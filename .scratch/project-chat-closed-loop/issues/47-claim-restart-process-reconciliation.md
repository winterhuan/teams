# 47. Claim 重启重建与底层进程核验

Type: implementation
Status: ready-for-agent
Blocked by: 18, 46
PRD: [../PRD.md](../PRD.md)
User stories: 94–97, 103

## 目标

Daemon 重启后从 journal 与真实进程状态重建 Claim，而不是依赖过期内存 lease。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 恢复读取 Claim generation、Session/Attempt、start key、heartbeat 与 process identity
- 核验 alive/missing/unknown，分别 attach、retry/release 或要求 attention
- 进程身份防 PID reuse 误认；所有决策幂等
- completion、Claim release 与 Inbox projection 可安全重放

## 验收标准

- [ ] active Provider 存活时重启不启动第二进程
- [ ] 进程缺失时仅一个 worker 获得恢复权
- [ ] unknown 不冒险双跑并产生可操作 attention
- [ ] 多次连续重启最终状态一致

## 验证要求

Level 1 真实子进程 + crash/restart 集成测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
