# 06. 验证 Provider 解析优先级与显式覆盖

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 04, 05
PRD: [../PRD.md](../PRD.md)
User stories: 58–60

## 目标

冻结并实现 privacy filter → explicit → execution context → Posting → Member → global → sole enabled 的解析。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 显式选择可包含 Hearth Provider 及其 model route
- local-only 在选择前剔除 cloud Provider；无本地候选时 fail closed
- 显式选择失败不得静默 fallback
- 改变选择只能新建 Session/Attempt，不能热切换已有执行

## 验收标准

- [ ] 表驱动测试覆盖每级优先级及相互冲突
- [ ] 显式 Pi+Agnes 与显式 Codex 均启动到预期真实 Provider
- [ ] 解析结果和选择理由可审计
- [ ] 不存在候选时不持久化 running Session

## 验证要求

Level 1 决策矩阵 + Level 3 两个真实 Provider 冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
