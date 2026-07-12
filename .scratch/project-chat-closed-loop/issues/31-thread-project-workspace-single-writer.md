# 31. Thread Session 直接 Project Workspace 单写者闭环

Type: implementation
Status: ready-for-agent
Blocked by: 03, 12
PRD: [../PRD.md](../PRD.md)
User stories: 63, 67, 72

## 目标

让 Thread Session 可安全获取 Project 根 Workspace，同时强制一个 Project root 只有一个 writer。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Workspace owner 为 Thread；kind=project；记录 cwd、policy、lock、base state
- acquire 在 Provider 启动前完成，失败不创建 running Session
- reader 可并行，第二 writer 排队或拒绝
- Session 终止、取消与崩溃恢复均有明确 lock 释放规则

## 验收标准

- [ ] 真实 Pi 在 root Workspace 完成受限写入
- [ ] 两个 writer 竞态只有一个获得锁
- [ ] 释放前后 Workspace 与 Live HUD 状态一致
- [ ] dirty/policy 检查失败不改 Issue.status

## 验证要求

Level 1 锁竞争/恢复 + Level 2 真 Pi 写入。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
