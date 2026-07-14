# 11. 通过 Posting 解析真实 Provider 和权限

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 04, 10
PRD: [../PRD.md](../PRD.md)
User stories: 22, 51, 57–60

## 目标

证明 Posting 的 Provider/model 与权限覆盖会真实影响 Session 启动和工具能力。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 一个 Posting 固定覆盖到 Pi+Agnes，另一个覆盖到 Codex
- 解析并保存 Posting snapshot，而不是运行中读取可变配置
- 权限在 Provider 工具执行前生效；memory slice 只注入允许内容
- 无权限或 Provider 不可用时消息仍持久化并给出结构化诊断

## 验收标准

- [ ] @两个 Posting 分别启动预期真实 Provider
- [ ] 只读 Posting 无法写 fixture，写权限 Posting 可以
- [ ] 运行后修改 Posting 不改变既有 Session
- [ ] Provider/权限解析理由可在检查器查看

## 验证要求

Level 3 双 Provider真实运行 + Level 1 权限拒绝测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
