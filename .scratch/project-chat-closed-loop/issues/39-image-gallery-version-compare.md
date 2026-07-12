# 39. 实现 Image Gallery 与版本比较

Type: implementation
Status: ready-for-agent
Blocked by: 37
PRD: [../PRD.md](../PRD.md)
User stories: 79, 83

## 目标

为 image Artifact 提供固定版本 Gallery 和可理解的版本切换/比较。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 识别受支持 image media type/尺寸并安全解码
- Gallery 展示版本、provenance、hash 与 current/unseen，不改内容
- 比较至少支持并排或切换，失败时 fallback 到 metadata/export
- 大图/损坏图有界处理

## 验收标准

- [ ] 两个真实图片版本可打开和比较
- [ ] 损坏/未知图片不使 Artifact 页面崩溃
- [ ] 选择旧版本不会移动 current 指针
- [ ] 导出字节与版本 hash 一致

## 验证要求

Level 1 media fixture + Gallery 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
