# 03. 让真实 Pi Session 执行结构化工具调用

Type: implementation
Status: ready-for-agent
Blocked by: 02
PRD: [../PRD.md](../PRD.md)
User stories: 30, 33, 48–49, 61

## 目标

让 Agnes 在安全 scratch Workspace 中完成一次真实读写工具调用，并贯通 tool-call/result 事件。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 接收并持久化 tool-call start/delta/end 与 tool result，不把它们伪装成 assistant prose
- 工具执行绑定 Session、cwd、权限和路径策略
- 支持 abort、timeout、非零/Provider error 的统一诊断
- 仅允许 fixture 指定的安全工具与 scratch 路径

## 验收标准

- [ ] 真实模型发出工具调用、工具执行并把结果返回同一 Session
- [ ] Chat 展示用户可读摘要，诊断面可检查结构化细节
- [ ] 越界工具调用在副作用前被拒绝
- [ ] 终止与错误不会自动创建 Issue 或修改 Issue.status

## 验证要求

Level 2 真实 contract test + Level 1 故障注入；记录去敏 tool trace。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
