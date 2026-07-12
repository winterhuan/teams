# 40. 实现 Video / Audio Player

Type: implementation
Status: ready-for-agent
Blocked by: 37
PRD: [../PRD.md](../PRD.md)
User stories: 80, 83

## 目标

为本地 video/audio Artifact 提供固定版本 Player，并为不支持的 codec 提供安全 fallback。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 基于 media metadata 选择播放器，不执行不可信内容
- 展示 duration/size/version/provenance（可得时）
- seek/playback 只读取固定版本；不修改 Artifact state
- unsupported/corrupt 使用 metadata + export fallback

## 验收标准

- [ ] 音频与视频 fixture 可播放/定位
- [ ] 旧版本可独立打开
- [ ] 不支持格式仍可查看元数据和导出
- [ ] 归档来源 Workspace 后播放不失效

## 验证要求

Level 1 media fixture + Player 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
