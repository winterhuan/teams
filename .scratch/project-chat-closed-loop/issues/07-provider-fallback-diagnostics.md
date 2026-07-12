# 07. 实现真实 Provider fallback 与失败诊断

Type: implementation
Status: ready-for-agent
Blocked by: 06
PRD: [../PRD.md](../PRD.md)
User stories: 10–11, 32, 58–60, 90

## 目标

仅在没有显式覆盖时，从失败的默认 Provider 安全切到另一真实 Provider并保留原因。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 区分启动前不可用、启动失败和 Session 中途失败；只按冻结策略 fallback
- fallback 创建一个最终固定 Provider 的 Session，并记录候选与淘汰原因
- local-only 永不回退到 cloud；显式选择永不 fallback
- 失败投影到执行诊断、Board badge 与 Inbox，不改 Issue.status

## 验收标准

- [ ] 以健康探测/受控故障触发 Pi↔Codex 的真实 fallback 路径
- [ ] 重放启动命令不产生双 Session
- [ ] 用户能从 Timeline 解释最终选择
- [ ] 所有候选失败时返回结构化错误并保留业务状态

## 验证要求

Level 3 真实多 Provider acceptance + Level 1 故障矩阵。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
