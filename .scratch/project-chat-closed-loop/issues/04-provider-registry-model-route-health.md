# 04. 建立 Provider Registry、Model Route 与健康状态

Type: implementation
Status: ready-for-agent
Blocked by: 02
PRD: [../PRD.md](../PRD.md)
User stories: 58–61, 92

## 目标

把 Hearth 执行适配器与适配器内部模型路由建模为两个可检查层级。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Provider Registry 记录能力、隐私属性、enabled、health、成本信号与可用控制面
- Pi route 独立记录 model provider/model；不得把 Agnes 当作第二个 Hearth Provider
- 启动前健康探测；不健康候选不得创建 Session
- Team、Posting、Session 与 Live HUD 使用同一解析结果投影

## 验收标准

- [ ] UI/API 可同时显示 `Hearth Provider: pi` 与 `agnes-ai/agnes-2.0-flash`
- [ ] 健康状态变化可被 Daemon 读取且有 Timeline 诊断
- [ ] 禁用或不健康 Provider 的启动失败发生在 Session launch 前
- [ ] Registry 与 model route 不泄漏认证材料

## 验证要求

Level 1 registry/解析测试 + Level 2 Pi 健康探测。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
