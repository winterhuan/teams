# 01. 建立 Daemon 命令、事件日志与 Project 读模型 seam

Type: implementation
Status: ready-for-agent
Blocked by: 无
PRD: [../PRD.md](../PRD.md)
User stories: 92–93, 101–102

## 目标

用最小 Project 创建路径证明“公开命令 → 持久事件/聚合 → 读模型”是后续所有闭环共用的唯一权威 seam。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 定义可演进的 Project、Timeline event 与 application command 最小合同
- Project 创建与重复提交具有幂等键，事件包含 actor、object、reason 与时间戳
- 提供 Project grid 与 Project detail 最小读模型；Web/CLI 不直连存储或 Provider
- 从第一刀保留最终对象标识，不引入 WorkItem 或 Thread pipeline 临时模型
- 初始化 Node.js 22 + pnpm + strict TypeScript modular monolith；建立 `apps/daemon` composition root 与最小 application/domain/storage/projection 模块
- SQLite 是唯一耐久数据库；不得引入 Redis、消息总线、微服务或 Docker 运行依赖

## 验收标准

- [ ] 通过公开 Daemon 命令创建 Project 后，可查询一致的聚合与读模型
- [ ] 相同幂等键重放不产生第二个 Project 或重复 Timeline event
- [ ] 进程重启后仍能读到相同 Project 与事件
- [ ] 测试只断言外部行为、持久状态和投影，不耦合内部调用顺序
- [ ] `pnpm typecheck` 在 strict 模式通过；Web/CLI/tests 均只通过同一 public application interface
- [ ] 安装、启动与测试路径不要求 Docker，且文档不宣称当前进程控制等价于容器隔离

## 验证要求

Level 1：领域集成测试；保存命令、事件、聚合与两个读模型的一致 ID 证据。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments
