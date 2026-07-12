# 22. 从 Runs 页面启动无 Thread WorkflowRun

Type: implementation
Status: ready-for-agent
Blocked by: 05, 21
PRD: [../PRD.md](../PRD.md)
User stories: 34, 37, 40–43, 45

## 目标

从独立 Runs section 固定 Definition version 与 assignment snapshot，启动首个无 Thread/Issue Run。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Run 不要求 source Thread、Discussion Thread 或 Issue
- Run 创建时保存 version、inputs、bindings、Provider、permissions 与 Workspace plan snapshot
- Runs 默认 Steps，Graph 为替代视图
- 启动命令幂等，且不会制造虚假 Discussion Thread

## 验收标准

- [ ] 真实 Pi+Agnes 执行首个 AI Step
- [ ] Run 在无 Thread/Issue 情况下可完整查询与取消
- [ ] 后续 Team/Definition 编辑不改变 snapshot
- [ ] Project Chat 不是启动或控制该 Run 的必经面

## 验证要求

Level 1 Run 创建测试 + Level 2 真 Pi direct Run。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
