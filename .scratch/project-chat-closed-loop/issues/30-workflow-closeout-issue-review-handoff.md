# 30. 完成 Workflow Closeout 与 Issue Review 交接

Type: implementation
Status: ready-for-agent
Blocked by: 19, 26, 27, 29
PRD: [../PRD.md](../PRD.md)
User stories: 16–19, 42, 44

## 目标

终步完成后生成 Run Closeout 与证据建议，再由 Soul 通过 tracker 显式送 Issue 进入 Review。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Run Closeout 汇总目标、StepResult、ArtifactVersion、command evidence、风险与未决项
- Closeout 不等于 Thread Closeout、Issue In Review 或 Done
- 绑定 Acceptance 必须使用固定 ArtifactVersion/command result ID
- Review 失败以评论/显式 reopen 继续，不破坏旧证据

## 验收标准

- [ ] 完整 Run 结束时 Issue.status 原样，直到 tracker 命令执行
- [ ] 固定证据在新 Artifact version 发布后仍不漂移
- [ ] 失败 Review 保留旧 review/证据并生成可追踪修正入口
- [ ] Chat、Board、Runs、Artifacts 投影使用一致 ID

## 验证要求

Level 1 closeout/review 集成 + Level 3 真实工作流证据链。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
