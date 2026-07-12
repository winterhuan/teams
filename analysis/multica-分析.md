# Multica 项目深度分析

> 分析对象：`references/multica`  
> 许可证：见仓库 LICENSE  
> 关联：人+AI 任务管理平台，Agent 为一等公民

---

## 1. 定位

**Multica = 把 coding agent 变成真正的团队成员的开源托管 Agent 平台。**

- 像给同事 assign issue 一样给 agent 派活
- Agent 有 profile、出现在看板、在评论区发言、主动报 blocker
- 云托管 + 本地 **daemon** 执行（vendor-neutral）
- 支持 Claude Code、Codex、Pi、OpenClaw、OpenCode 等十余种 CLI

一句话：**不是 Harness，是「人 + AI 共用的问题跟踪与执行平台」**（类 Linear + Agent Runtime）。

---

## 2. 核心概念（与 DB 对齐）

| 概念 | 含义 |
|------|------|
| **Workspace** | 资源容器：issue、agent、project、skill 隔离 |
| **Issue** | 工作单元（看板卡片），可 assign 给人或 agent |
| **Agent** | 可指派 AI 工作者：profile、runtime、provider、skills |
| **Squad** | Agent（+人）编组，有 **leader agent**；assign 给 squad → leader 路由 |
| **Runtime / Daemon** | 本地 `multica daemon` 探测 CLI、执行 issue run |
| **Skill** | 团队可复用能力沉淀（部署、review 等） |
| **Autopilot** | 定时/webhook 自动创建 issue 并路由给 agent/squad |
| **Chat** | 与 agent 围绕 issue 的对话（会话可恢复） |

---

## 3. 架构

```text
Multica Cloud / Self-Host Server (Go)
  ├── Issue / Project / Comment / Mention API
  ├── Web + Desktop (Next.js + Electron)
  └── WebSocket 实时

multica CLI + Daemon（本地）
  ├── 认证、workspace watch
  ├── 认领/执行 issue task
  └── 调用本机 agent CLI
```

**Mention 契约**（`mention.go`）：

| 类型 | 效果 |
|------|------|
| `agent` | 为该 agent enqueue run |
| `squad` | resolve leader_id → enqueue leader run |
| `member` / `issue` | 仅渲染链接，不触发 run |

---

## 4. 可借鉴点与边界

| Multica 强项 | 可吸收 |
|--------------|--------|
| **Issue 作为工作对象** | 可选 `WorkItem` 层（thread 可绑定 issue） |
| **Squad + leader 路由** | `@FrontendTeam` 稳定寻址，避免人名爆炸 |
| **Agent 一等公民 + 看板** | Hub 除时间线外可有 Work 视图 |
| **Daemon 执行模型** | 本地 daemon + 引擎适配器 |
| **Skill 复利** | 平台级 skill 库 |

| 不必照搬 |
|----------|
| 完整 PM 产品（Project/Milestone/Inbox…） |
| 云商业 + 多租户 SaaS 优先 |

**定位差异**：Multica 中心是 **Issue 生命周期**；若只做 Thread A2A 会缺「活从哪来」。常见组合是 **Thread + 可选 WorkItem** 双轨。

---

## 5. 关键文件

| 路径 | 用途 |
|------|------|
| `README.md` | 定位、Squads、特性 |
| `docs/product-overview.md` | 功能全景、概念词典 |
| `CLI_AND_DAEMON.md` | 本地 daemon |
| `server/.../mention.go` | @mention 后端契约 |
