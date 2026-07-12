# 25. 执行真实 AI Step 与 StepResult

Type: implementation
Status: ready-for-agent
Blocked by: 22
PRD: [../PRD.md](../PRD.md)
User stories: 37–42, 58, 61–62

## 目标

把 ready AI Step 变成独立 Workflow Attempt、专属 Session 和结构化 StepResult。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Attempt 与 Session owner=`workflow_attempt`，不得关联 Thread Turn owner
- 使用 assignment snapshot 中的 Posting、Provider/model、权限和输入
- 成功原子提交 StepResult 后才解锁依赖
- 失败、取消或结构化结果缺失不伪造成功

## 验收标准

- [ ] 真实 Pi+Agnes 产生可验证 StepResult
- [ ] owner XOR 约束在持久层和命令层均成立
- [ ] 重复完成事件只提交一个结果/解锁一次
- [ ] 成本、日志、结果和错误归属同一 Attempt

## 验证要求

Level 2 真 Pi AI Step + Level 1 重复事件/结果校验。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
