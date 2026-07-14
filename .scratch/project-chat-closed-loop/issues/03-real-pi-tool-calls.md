# 03. 用 acpx/runtime 执行真实 Pi 工具 Session

Type: implementation
Status: ready-for-agent
Progress: in-progress
Blocked by: 02
PRD: [../PRD.md](../PRD.md)
User stories: 30, 33, 48–49, 61

## 目标

以 `acpx/runtime` 取代当前 `pi --print` 主路径，让 Agnes 在安全 scratch Workspace 中完成一次真实读写工具调用，并贯通 ACP tool-call/result 事件与可恢复 SessionRecord。

## Tracer bullet

本 issue 必须从公开 Daemon 命令进入，写入持久领域事实，并让相关 Project read model 可观察；不得只完成 UI、内存状态或孤立适配器。实现采用最终领域对象，不引入临时 WorkItem、Thread pipeline mode，且不得由运行状态隐式改写 Issue.status。

## 范围

- 引入并精确固定 `acpx@0.12.0`；通过 `acpx/runtime` 驱动 Pi ACP，不再以 `pi --print` 作为正式 Session transport
- 用 Hearth 管理的独立 runtime SQLite 实现 `AcpSessionStore`；完整 `AcpSessionRecord` 与核心领域账本分库存储
- `sessionKey = hearth-session:<session_id>`；Hearth `sessions` 记录持久化 `acpx_record_id` / Provider resume pointer
- 实时接收并持久化 text/tool/usage/terminal 事件，不把 tool 事件伪装成 assistant prose，也不在进程退出后回读临时 trace
- 工具事件绑定 Session 与 cwd；`pi-acp` 的 Pi 工具不走 ACP filesystem/terminal delegation，当前执行按 ADR 0006 明确使用宿主权限，不声称 cwd、scratch 或 acpx permission mode 是安全边界
- 支持 cooperative cancel、timeout、ACP/Provider error 的统一诊断
- 真实验收使用一次性 scratch fixture 控制影响范围；强制工具能力与路径策略留给 Issue 11/33，且必须先证明存在跨 Pi/Codex 的副作用前强制点

## 验收标准

- [x] 真实模型发出工具调用、工具执行并把结果返回同一 Session
- [x] `AcpSessionStore` 可从独立 SQLite 重载完整 record；核心 `hearth.db` 只保存 Session 映射与权威状态
- [x] Hearth Session 与 acpx record 一一对应，重放同一命令不创建第二条 ACP Session
- [x] Chat 展示用户可读摘要，诊断面可检查结构化细节
- [x] 证据明确记录当前无工具白名单、路径 gate 或 cwd 沙箱，不把历史已删除的 gate 当作现行能力
- [x] tool start/update/end 在执行期间实时写入 `session_events`，不依赖退出后的临时文件
- [x] 终止与错误不会自动创建 Issue 或修改 Issue.status

## 验证要求

Level 1：SQLite SessionStore、事件映射、cancel/error 与越界拒绝的确定性测试。
Level 2：真实 `acpx/runtime` → `pi-acp` → Pi + Agnes contract test；记录去敏 ACP/tool trace。

提交证据至少包含：执行命令、关键持久 ID/事件、相关读模型断言、失败或幂等路径；涉及真实 Provider 时必须记录去敏后的 provider/model/Session trace。确定性 fake adapter 仅可用于故障注入和快速测试，不能替代要求中的真实 Provider 验收。

## 非目标

- 不提前实现后续 issue 明确拥有的能力。
- 不实现 PRD Out of Scope 中的跨 Team Handoff package、swarm、远程 Workspace、多租户 SaaS 或 Session 内热切换 Provider。
- 不以 throwaway prototype 或纯文档截图作为运行时闭环证据。

## Comments

- 2026-07-13：原 `pi --print` + extension 临时 trace 连续两轮在真实工具调用中超时。经设计复核，Hearth 的差异化在 Thread/Issue/Posting/Artifact 账本，而非自建各 Provider transport；本 issue 改为复用 `acpx/runtime`。acpx 负责 ACP 会话、进程、cancel 与规范化事件，Hearth 继续拥有 Session/Thread/Approval 真相。
- 当前 acpx 0.12 的 Session event log 目录仍固定在 `~/.acpx/sessions/`；本 issue 只接管 `AcpSessionStore` 到独立 SQLite，event-log-root 扩展作为后续上游/集成改进，不阻塞本 tracer bullet。
- 2026-07-13：真实越界测试证明 `cwd` 不是 Pi 工具沙箱，且 `pi-acp` 不委托 ACP filesystem/terminal。正式链路保留 acpx Session transport，但由 Hearth launcher 启动 `pi --mode rpc`、限制工具 allowlist 并注入副作用前路径 gate。
- 2026-07-13 验收证据：`pnpm test` 通过公开 `hearthd start-thread-session` 路径完成真实 `acpx/runtime → pi-acp@0.0.31 → Pi → agnes-ai/agnes-2.0-flash` write/read；核心映射为 `providerSessionRef=hearth-session:<session_id>`，实时事件包含 `tool.started/tool.ended(write, read)`。独立真实越界用例确认 scratch 外目标保持不存在；Level 1 覆盖 SQLite record 重载、cancel 终态、timeout/provider error、symlink 路径逃逸和命令重放。完整去敏 trace 见 [`../evidence/03-acpx-runtime-trace.md`](../evidence/03-acpx-runtime-trace.md)。
- 2026-07-13 文档收敛：本 issue 确立的「复用 acpx/runtime 作为 transport、Hearth 保留账本真相」决策已升为 [ADR 0006](../../../docs/adr/0006-acpx-runtime-as-provider-transport.md)，`design/annex/providers.md` 附录随之重写（§0 校准声明 + §3 acpx 分工表取代原自建四层 transport）。后续 Provider issues（04/05）以该 ADR 为 transport 前提。
- 2026-07-13 边界移除：经产品决策，首个闭环**放弃**本 issue 实现的 Hearth launcher + 工具 allowlist + 副作用前路径 gate。相关代码与测试已删除；Session 直接使用 acpx 内置 `pi` agent，不裁剪工具面、不设路径 gate、不设 cwd 沙箱。2026-07-14 重排已同步修正上方验收，不再把历史越界拒绝当作现行能力；治理门留给 Issue 11/33，详见 [ADR 0006](../../../docs/adr/0006-acpx-runtime-as-provider-transport.md) §4。
