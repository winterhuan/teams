# 14. 实现 Team 内 Pi/Codex 跨 Provider 复核

Type: implementation
Status: ready-for-agent
Blocked by: 08, 13
PRD: [../PRD.md](../PRD.md)
User stories: 23–28, 98–99

## 目标

用 builder（Pi+Agnes）→ verifier（Codex native model route）→ builder 的真实闭环证明角色、权限、Provider 与模型族隔离；Codex+Agnes 仅作为同模型不同 harness 的补充基线。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- builder 有受限写权，verifier 默认只读/评论权
- verifier 返回结构化复核结果并可交回原 builder
- 复核通过 handover 和 Artifact/路径引用传递，不共享 transcript
- verifier 的 Codex route 必须使用与 Agnes 不同的模型族；记录实际 model provider/model，不把 Codex CLI 当成模型名
- 可补跑 Codex+Agnes 形成同模型基线，用来区分 harness 效应与模型差异
- 保持同一 Team 语义，不创建跨 Team Handoff package

## 验收标准

- [ ] Pi+Agnes 真实修改 fixture，Codex native 的不同模型真实复核并指出预设问题，Pi 再修复
- [ ] 验收报告明确标注该路径为 cross-model，并与可选的 Codex+Agnes same-model baseline 区分
- [ ] verifier 写操作被权限层阻止
- [ ] Thread 可查看三段 relay 与各自 provider/model
- [ ] 每段成本、错误和完成状态独立

## 验证要求

Level 3 双 Provider acceptance；fixture 必须可重复且不依赖录制回答。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
