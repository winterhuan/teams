# 52. 历史合同清理与完整回归

Type: implementation
Status: ready-for-agent
Blocked by: 50, 51
PRD: [../PRD.md](../PRD.md)
User stories: 1–3, 92, 105

## 目标

清除仍会误导实现的旧合同，执行全量领域、恢复、Provider 与浏览器回归并形成可复核完成报告。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 标记 M0.3/M0.4 与冲突设计为 superseded；当前文档统一引用 ADR 0003/0004 与 PRD
- 搜索并移除 WorkItem、Thread pipeline/orchestration mode、Daemon 自动 Issue failure 等现行误用
- 核对七 section IA、Session owner XOR、Posting identity、Workspace/Artifact 合同
- 核对 ADR 0005：strict TypeScript modular monolith、SQLite 单权威写者、小宿主原则、凭据不下放、无 Docker 运行依赖
- 运行领域集成、读模型、故障恢复、Pi/Codex native、Codex+Agnes bridge contract 与四条关键浏览器路径
- 汇总已知限制；不得用文档修辞掩盖未通过测试

## 验收标准

- [ ] 105 条 User Story 均映射到至少一个 issue/测试证据
- [ ] 全套自动测试通过，OAuth 与创作 Level 4 trace 通过
- [ ] `pnpm typecheck` strict 通过；依赖版本/安装脚本审计通过；安装和验收未调用 Docker
- [ ] 同模型不同 harness 与不同模型不同 harness 两套 Provider 证据均完成且命名准确
- [ ] 代码/文档搜索无未注明的废弃现行合同
- [ ] 完成报告列出命令、结果、artifact 路径、残余风险和后续 out-of-scope

## 验证要求

全量 Level 1–4 验收；这是里程碑关闭 gate，不承担新增产品范围。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
