# 32. Workflow Attempt worktree 获取闭环

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 25, 31
PRD: [../PRD.md](../PRD.md)
User stories: 64–67, 72

## 目标

为每个 Workflow AI Attempt 默认创建独立 worktree Workspace。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- owner 精确到 Workflow Attempt；记录 base commit、branch、path、lock
- branch/path 命名稳定、可清理、避免并发碰撞
- acquire 失败发生在 Provider start 前
- retry 默认 fresh Attempt + fresh worktree，不复用脏状态

## 验收标准

- [ ] 两个并行 Attempt 可在不同 worktree 写同一仓库
- [ ] 真实 Pi/Codex Session cwd 指向各自 Workspace
- [ ] 重复 acquire 幂等且不会多建 worktree
- [ ] 归档/清理不删除仍被 Artifact 使用的内容

## 验证要求

Level 1 git fixture 集成 + Level 3 两 Provider 并行写。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
