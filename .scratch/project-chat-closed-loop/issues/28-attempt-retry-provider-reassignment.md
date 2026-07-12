# 28. 支持 Attempt retry 与 Provider 改派

Type: implementation
Status: ready-for-agent
Blocked by: 05, 25
PRD: [../PRD.md](../PRD.md)
User stories: 32, 38–41, 58, 60

## 目标

失败后创建新 Attempt，并允许对未执行工作从 Pi 显式改派到 Codex，保留完整历史。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- retry 永不覆盖旧 Attempt/Session/Workspace/结果
- 显式改派只影响新 Attempt，且区别于自动 fallback
- 未执行 Step 可审计 reassign；已有执行后整体换 Team 必须 fork/re-plan
- 重试有次数、退避和预算边界

## 验收标准

- [ ] 注入 Pi Attempt 失败后，Codex 在新 Attempt 真实完成
- [ ] 两个 Attempt 的 Provider、日志、成本与 Workspace 独立可查
- [ ] 超过边界停止并产生 attention，不无限烧预算
- [ ] 旧 Attempt 不因成功重试被改写为成功

## 验证要求

Level 3 真 Pi→Codex retry acceptance + Level 1 边界测试。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
