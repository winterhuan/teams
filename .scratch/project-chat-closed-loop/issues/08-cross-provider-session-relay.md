# 08. 验证 Pi 与 Codex 的跨 Provider Session 接力

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 05, 06
PRD: [../PRD.md](../PRD.md)
User stories: 23–24, 28, 62, 98

## 目标

用结构化 handover 完成两组隔离 relay：先证明 Pi 与 Codex 在同为 Agnes 2.0 Flash 时是不同执行 harness，再为后续跨模型复核保留 Codex native model route。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 每次 handoff 新建 Session；不复用底层会话，不共享完整 transcript
- handover 只含 brief、摘要、相关路径和 ArtifactVersion 引用
- 每段独立归属 Soul、Hearth Provider、transport/model route、成本、错误与 Workspace
- 同模型矩阵使用 `Pi + Agnes` 与 `Codex + Responses-to-Chat bridge + Agnes`，验证 harness/adapter 隔离
- 不同模型矩阵使用 `Pi + Agnes` 与 Codex native model route；只有该矩阵称为跨模型
- Thread 展示接力链和当前负责人，不能表现成同一模型换人格

## 验收标准

- [ ] 真实 Pi+Agnes 与真实 Codex+Agnes 各完成一段，trace 证明 model 相同但 harness、Session 与 transcript 独立
- [ ] 至少一次接力改用 Codex native model route，为跨模型 fixture 提供可复用路径
- [ ] 接收方拿不到发送方原始 tool trace，仍可依据 bounded handover 工作
- [ ] 取消其中一段不污染另一段历史
- [ ] 审计可还原每个 relay segment 的来源与结果

## 验证要求

Level 3：真实 Pi + Codex acceptance trace。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
