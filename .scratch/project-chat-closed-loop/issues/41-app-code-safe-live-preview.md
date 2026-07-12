# 41. 实现 App / Code 安全 Live Preview

Type: implementation
Status: ready-for-agent
Blocked by: 33, 37
PRD: [../PRD.md](../PRD.md)
User stories: 48–49, 81, 83

## 目标

对 app/code Artifact 提供受控 live preview；无法安全启动时降级为 code/metadata view。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Preview 进程使用固定 ArtifactVersion、隔离 cwd、端口和能力
- 启动命令、网络/文件权限与超时显式；危险能力需 gate
- 生命周期与 Artifact 分离，可启动/停止/重启且记录诊断
- 未声明 preview contract 或启动失败时显示 code/fallback

## 验收标准

- [ ] 安全 fixture 可启动并从 Hearth 打开
- [ ] 恶意/越界 fixture 被 gate 阻止
- [ ] 停止 Preview 不改变 ArtifactVersion
- [ ] 来源 Workspace 归档后仍使用 durable snapshot 或明确 fallback

## 验证要求

Level 1 sandbox/故障测试 + Live Preview 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
