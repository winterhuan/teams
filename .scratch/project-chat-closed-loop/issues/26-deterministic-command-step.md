# 26. 执行真实 Command Step

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 25
PRD: [../PRD.md](../PRD.md)
User stories: 40–42, 69

## 目标

实现不调用 LLM 的确定性 Command Step，并把结果作为 DAG 与 Acceptance 可引用证据。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 命令固定 argv/cwd/env allowlist/timeout，不经 shell 拼接不可信输入
- 记录 stdout、stderr、exit code、duration 与截断策略
- 成功才解锁下游；失败遵循 on_fail
- Command Step 不创建 Soul Session，危险命令仍受 gate/policy

## 验收标准

- [ ] fixture 命令真实成功和真实失败路径均可复现
- [ ] UI/API 明确标注 Command Attempt 而非 Agent 对话
- [ ] 重复 delivery 不重复执行已提交结果的命令
- [ ] command result ID 可供 Acceptance 引用

## 验证要求

Level 1 集成测试，执行真实本地 fixture 命令。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
