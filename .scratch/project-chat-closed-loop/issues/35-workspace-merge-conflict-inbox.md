# 35. Workspace merge conflict 与 Inbox 处理

Type: implementation
Status: ready-for-agent
Progress: not-started
Blocked by: 34
PRD: [../PRD.md](../PRD.md)
User stories: 4, 70, 72

## 目标

检测合并冲突后进入 awaiting_merge 并产生一个可操作 Inbox item，绝不静默解冲突。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 冲突保存文件列表、base/head/target 与安全诊断
- Workspace 转 awaiting_merge，锁/临时状态按合同保持
- Inbox 投影与 Workspace 使用同一 attention ID
- 用户可放弃、重新准备或在显式操作后继续

## 验收标准

- [ ] 真实 git 冲突 fixture 不修改目标分支
- [ ] 重复冲突检测不重复 Inbox item
- [ ] 解决后重新 verify/apply 形成新审计阶段
- [ ] 归档前 unresolved conflict 必须显式处理/放弃

## 验证要求

Level 1 冲突/幂等集成 + Inbox 浏览器冒烟。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
