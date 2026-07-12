# 36. 发布 Reader Artifact 并预览

Type: implementation
Status: ready-for-agent
Blocked by: 03, 31
PRD: [../PRD.md](../PRD.md)
User stories: 71, 73–78, 83

## 目标

从真实 Thread Session 发布首个 Project-owned Markdown/文档 ArtifactVersion 并在 Reader 打开。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- Artifact 与 ArtifactVersion 分离；版本 append-only、内容进入 durable Project storage
- 记录 Thread Session、Workspace、Member、commit/hash provenance
- Thread/Workspace 归档或删除不删除 Artifact
- Reader 支持固定版本；未知格式有 metadata/download fallback

## 验收标准

- [ ] 真实 Agent 生成文档并发布，Reader 展示该固定版本
- [ ] 归档 Workspace 后仍可读/导出同一字节与 hash
- [ ] 删除来源 Thread（若允许）后 Artifact 保留
- [ ] 投影可从版本反查生产 Session 与 Workspace

## 验证要求

Level 2 真 Provider发布 + Level 1 持久性测试 + Reader 冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
