# 21. 创建 WorkflowDefinition 与 Plan Preview

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 10, 17
PRD: [../PRD.md](../PRD.md)
User stories: 34, 36–40

## 目标

建立版本化 WorkflowDefinition，并在启动前预览 DAG、角色、Workspace、权限、输入与 Provider。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 支持 AI、Command、Approval Step 及 dependency/on_fail/role requirement
- 每次定义修改创建新版本；Preview 固定候选版本
- 解析 assignment、Posting、Provider/model、Workspace plan 与 permission summary
- 缺角色、循环依赖、能力/Provider 不足时阻止启动并给出原因

## 验收标准

- [ ] 有效三步 DAG 可预览且不产生 Run/Session
- [ ] 旧版本在新版本发布后仍可引用
- [ ] 无效图和缺失绑定有确定性错误
- [ ] Preview 与实际 Run assignment snapshot 一致

## 验证要求

Level 1 Definition/规划测试 + Runs Plan Preview 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
