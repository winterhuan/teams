# 42. 实现 Dataset / Report 结构视图

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 37
PRD: [../PRD.md](../PRD.md)
User stories: 82–83

## 目标

为 CSV/JSON/report Artifact 提供有界、固定版本的结构化浏览。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 检测 schema/columns/row count 或 JSON shape，限制解析尺寸/深度
- 提供分页/截断和原始下载，不将全部大文件塞入浏览器内存
- 解析失败降级 metadata/export
- 视图始终标明 ArtifactVersion 与 provenance

## 验收标准

- [ ] CSV、JSON、空数据、畸形数据和大文件 fixture 有确定行为
- [ ] 旧版本结构不会随 current 变化
- [ ] 导出保持原始字节
- [ ] 解析错误不污染 Artifact 或 unseen 状态

## 验证要求

Level 1 数据 fixture + structured view 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
