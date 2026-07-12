# OpenCrew 项目深度分析

> 分析对象：`references/opencrew`  
> 许可证：MIT  
> 构建于：OpenClaw  
> 关联：Slack 原生多 Agent 团队 OS

---

## 1. 定位

**OpenCrew = 基于 OpenClaw + Slack 的多智能体团队操作系统。**

- **频道 = 岗位**（#cto、#build）
- **Thread = 任务** = 独立 session
- 领域分工 Agent（CTO、Builder、CIO、CoS、KO、Ops）
- **A2A v2**：独立 Slack App 的 Orchestrator 进频道 @mention 协作
- 三层：意图对齐 / 执行 / 系统维护

---

## 2. 架构三层

| 层 | Agent | 职责 |
|----|-------|------|
| **意图对齐** | User、CoS（幕僚长） | 定方向、验收；CoS 非网关 |
| **执行** | CTO、Builder、CIO、Research | 干活；CIO 可替换领域 |
| **维护** | KO（知识）、Ops（审计） | 沉淀、防漂移 |

---

## 3. 协作机制

### 3.1 A2A v2（非 Clowder 式 Hub）

**问题**：共享一个 Slack bot → bot 忽略自己消息 → Agent 不能互聊。

**解**：选择性 **独立 Slack App**（Orchestrator）→ 进他频道 `@CTO` 讨论。

**防循环**：

- Config：`requireMention: true`（频道根消息）
- Prompt：Thread 内显式 `<@BotID>` 协议

### 3.2 治理协议（Markdown 即规范）

| 机制 | 文件/概念 |
|------|-----------|
| **自主等级** | L0–L3（建议 / 可逆 / 可回滚 / 不可逆需人确认） |
| **QAPS 任务分类** | Query / Artifact / Project / System |
| **Closeout** | 结构化任务收尾模板 |
| **A2A 协议** | `shared/A2A_PROTOCOL.md` |
| **Workspace 人格** | `SOUL.md`、`AGENTS.md`、`IDENTITY.md` |

### 3.3 知识沉淀

```text
closeout (signal≥2) → #know → KO → knowledge/{principles,patterns,scars}.md
```

---

## 4. 与 Clowder 对比

| 维度 | OpenCrew | Clowder |
|------|----------|---------|
| 载体 | Slack + OpenClaw workspace 文件 | 自研 Hub + Redis |
| A2A | 独立 App + @mention | 球权状态机 + MCP |
| 身份 | 频道岗位 + workspace MD | 猫猫 @句柄 |
| 治理 | 自主阶梯 + QAPS + Closeout | SOP YAML + 48 skills |

**OpenCrew 启示（不依赖 Slack）**：

1. **岗位 = 持久 Member 角色**，不必每次 @ 临时拉人  
2. **Autonomy L0–L3** 应写入平台 Policy  
3. **Closeout / Artifact** 比聊天 handoff 更结构化  
4. **Orchestrator ≠ Worker** 分离（规划/质检 vs 执行）  
5. **知识层**（KO）与 **协作层**（Thread）可分

---

## 5. 关键文件

| 路径 | 用途 |
|------|------|
| `docs/ARCHITECTURE.md` | 三层设计 |
| `docs/CONCEPTS.md` | 频道/Thread、QAPS、自主等级 |
| `shared/A2A_PROTOCOL.md` | A2A v2 协议 |
| `workspaces/*/SOUL.md` | Agent 边界 |

---

*关联：[clowder-ai-分析.md](./clowder-ai-分析.md)*