# 05. 接入第二个真实 Hearth Provider：Codex CLI

Type: implementation
Status: ready-for-agent
Blocked by: 04
PRD: [../PRD.md](../PRD.md)
User stories: 28, 58, 60, 62, 98

## 目标

实现 Codex CLI 适配器，用真实 Codex 进程证明 Hearth Provider 层不是 Pi 专用壳。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 用 strict TypeScript 实现 Codex adapter，适配启动、JSONL 事件、取消、完成、错误和健康探测；不以 PTY 刮屏作为默认路径
- 保存 `hearth_provider_id`、transport、model provider、model 和 compatibility route，同时输出统一 Hearth Session events
- 支持两条真实 route：Codex native model route；宿主侧 Responses-to-Chat bridge 到 `agnes-ai/agnes-2.0-flash`
- Agnes bridge 必须覆盖 streaming、input items、tool definitions、tool call/result、usage、finish/error/cancel；文本-only proxy 不合格
- Session 启动后 Provider 不可变；Pi 与 Codex 可在同一 Project 并行
- 认证只由宿主 credential broker 或受支持本机机制读取；Agnes raw key 不传给 Codex、不进入命令行或 Hearth 领域数据
- 安装与运行不依赖 Docker；子进程使用最小 cwd/env 和可验证的 policy/sandbox 能力

## 验收标准

- [ ] 同一真实任务分别由 Pi 与 Codex 完成并形成两个独立 Session
- [ ] Codex native route 与 Codex+Agnes compatibility route 都通过 adapter contract；后者确认实际模型为 `agnes-2.0-flash`
- [ ] Codex 输出不是录制 fixture；可观察真实进程、模型响应与 usage（若上游提供）
- [ ] Agnes bridge 的真实 tool-call round trip、stream、cancel 与错误归一化通过，不只验证纯文本响应
- [ ] 取消真实终止 Codex；异常退出归一为诊断事件
- [ ] UI 能区分 Hearth Provider、transport、compatibility route、底层模型与 Soul
- [ ] 日志与持久记录中不存在 Agnes/OpenAI raw key，测试过程不要求 Docker

## 验证要求

Level 2：真实 Codex contract test；与 Pi contract test 使用同一适配器合同套件。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
