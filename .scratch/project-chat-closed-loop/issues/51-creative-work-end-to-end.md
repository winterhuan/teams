# 51. 创作场景端到端验收

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 08, 13, 15, 36, 38, 43, 44, 45
PRD: [../PRD.md](../PRD.md)
User stories: 5–6, 18, 22–30, 71, 73–87, 98, 100–104

## 目标

用真实多 Soul/多 Provider 创作一份长文或媒体配套作品，验证非编码产品闭环。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 从无 Issue Thread 开始，Pi+Agnes 与 Codex 通过至少两次 bounded handoff 共创/编辑
- 发布 Reader 主作品并追加至少一个版本；可选图片/音频/数据配套 Artifact
- 新版本产生 unseen/Inbox；用户打开固定版本、比较并导出
- 在承诺明确后从 Thread 创建 Issue，Acceptance 固定绑定选定版本
- 至少一次 detach/resume，来源 Workspace 归档后内容仍可读

## 验收标准

- [ ] 真实 Provider 生成与复核内容，不用录制 fixture 冒充创作
- [ ] 旧版本、provenance、handover 与 review 决策完整可查
- [ ] 导出不改变 Artifact 状态，publish 若使用必须经过 hard gate
- [ ] 两个 Team/Posting 的权限和记忆保持隔离

## 验证要求

Level 4 创作系统场景；保存去敏 trace、版本 hashes 与 Review 证据。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
