# 45. Session detach / resume / steer / cancel

Type: implementation
Status: ready-for-agent
Blocked by: 02, 05, 12
PRD: [../PRD.md](../PRD.md)
User stories: 29–30, 61–62

## 目标

对 Pi 与 Codex 提供一致且诚实的长运行控制面。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- detach 只断开客户端；resume 重建事件订阅/状态，不伪造 Provider conversation resume
- steer 仅在 adapter 声明支持时可用，不支持时明确禁用
- cancel 幂等并核验底层进程终止；owner/Provider 不变
- 所有控制命令带 actor、reason、idempotency key

## 验收标准

- [ ] Pi 与 Codex 各完成 detach→resume→cancel 真实测试
- [ ] 断线期间事件可回放且无重复 transcript
- [ ] 重复 cancel 安全；进程已经退出时状态收敛
- [ ] 不支持 steer 的 Provider 不展示虚假成功

## 验证要求

Level 2 两 Provider control contract tests。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
