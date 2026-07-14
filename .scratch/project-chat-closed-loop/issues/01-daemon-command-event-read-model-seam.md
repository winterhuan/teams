# 01. 建立可演进 Daemon 命令、事件日志、Project 读模型与 Web shell seam

Type: implementation
Status: ready-for-agent
Progress: in-progress
Blocked by: 无
PRD: [../PRD.md](../PRD.md)
User stories: 1–3, 92–93, 101–102

## 目标

用最小 Project 创建路径证明“公开命令 → 持久事件/聚合 → 读模型 → 生产 Web shell”是后续所有闭环共用的唯一权威 seam，并建立可持续演进的 SQLite migration 基线。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 定义可演进的 Project、Timeline event 与 application command 最小合同
- Project 创建与重复提交具有幂等键，事件包含 actor、object、reason 与时间戳
- 提供 Project grid 与 Project detail 最小读模型；Web/CLI 不直连存储或 Provider
- 建立生产 Web shell：Project grid、进入 Project 默认 Chat、七个稳定 section、Daemon 连接状态；未实现 section 使用读模型驱动的明确空态
- 建立有序、事务化、可测试的 SQLite migration；重复事件类型合法，Timeline 具有稳定流内顺序，投影可从持久事实重建
- 从第一刀保留最终对象标识，不引入 WorkItem 或 Thread pipeline 临时模型
- 初始化 Node.js 22 + pnpm + strict TypeScript modular monolith；建立 `apps/daemon` composition root 与最小 application/domain/storage/projection 模块
- SQLite 是唯一耐久数据库；不得引入 Redis、消息总线、微服务或 Docker 运行依赖

## 验收标准

- [x] 通过公开 Daemon 命令创建 Project 后，可查询一致的聚合与读模型
- [x] 相同幂等键重放不产生第二个 Project 或重复 Timeline event
- [x] 进程重启后仍能读到相同 Project 与事件
- [x] 测试只断言外部行为、持久状态和投影，不耦合内部调用顺序
- [ ] `pnpm typecheck` 在 strict 模式通过；Web/CLI/tests 均只通过同一 public application interface
- [ ] 生产 Web shell 可从 Project grid 进入默认 Chat，并可导航七个 Project section；浏览器不直连 SQLite/Provider
- [ ] 从旧 `user_version` 升级后数据不丢；同一 Project 可记录多个相同事件类型；投影重建前后 ID 与内容一致
- [x] 安装、启动与测试路径不要求 Docker，且文档不宣称当前进程控制等价于容器隔离

## 验证要求

Level 1：领域集成测试；保存命令、事件、聚合与两个读模型的一致 ID 证据。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments

- 2026-07-14 原始 tracer 证据：`project-create.integration.test.ts` 覆盖公开命令、grid/detail、幂等与重启读取；CLI/tests 只经 public application interface，安装与快速测试不依赖 Docker。
- 2026-07-14 重排：原验收把“Web 尚不存在”作为勾选例外，且内联 schema 不能支撑后续重复事件与投影重建，因此重新打开本 issue。完成条件现包括生产 Web shell、正式 migration/event ordering 与 projection rebuild，不再接受“现有消费者都走 seam”的豁免解释。
