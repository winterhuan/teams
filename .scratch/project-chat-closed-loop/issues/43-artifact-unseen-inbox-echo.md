# 43. 实现 Artifact unseen 与 Inbox 回声

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 36, 37
PRD: [../PRD.md](../PRD.md)
User stories: 4, 86–89, 97

## 目标

新版本产生 Project indicator 与单一 Inbox item；打开固定版本后幂等清除 attention。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- unseen 以 Principal/版本为语义，不以 Artifact current 的模糊布尔值漂移
- publish、Project badge、Inbox 由同一事件投影
- 打开目标固定版本才清除；重复打开幂等
- Chat inspector 无 Artifact 默认收起，并按 Project 记忆用户选择

## 验收标准

- [ ] 发布新版本只产生一个 Inbox item
- [ ] 打开错误/旧版本不误清新版本 unseen
- [ ] 重放 publish/open 事件不重复通知或反复计数
- [ ] Project、Inbox、Artifact 页面 attention 一致

## 验证要求

Level 1 投影/幂等测试 + Project/Inbox 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
