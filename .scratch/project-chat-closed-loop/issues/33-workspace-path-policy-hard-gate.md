# 33. Workspace 路径策略与越界硬门

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 31, 32
PRD: [../PRD.md](../PRD.md)
User stories: 67–68

## 目标

在任何工具副作用前强制 Workspace 允许路径、禁止路径与能力策略。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 策略覆盖 cwd、读/写范围、symlink traversal、绝对路径、repo 外路径
- 策略决策由 Daemon/adapter gate 执行，不依赖提示词自律
- 拒绝事件含 actor、target、reason，不泄漏敏感文件内容
- 适配器无法 pre-tool gate 时不授予对应写能力

## 验收标准

- [ ] 真实 Agent 尝试 fixture 外写入被副作用前拒绝
- [ ] symlink 与 `..` 绕过测试失败
- [ ] 允许范围内读写正常
- [ ] 拒绝不导致 Workspace/Issue 状态被误改

## 验证要求

Level 1 安全边界测试 + Level 2 真实恶意提示冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
