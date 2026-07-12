# OpenTeams 项目深度分析

> 分析对象：`references/openteams`  
> 许可证：Apache-2.0  
> 关联：多 Agent 协作工作台（Free Chat + Workflow）

---

## 1. 定位

**OpenTeams = 开源多 Agent 协作工作台。**

- 多 coding agent（Claude Code、Codex、Gemini、OpenCode…）**同一 session 共享上下文**
- **两种协作模式**（核心差异化）：
  - **Free Chat**：群聊式 `@` 协作
  - **Workflow**：可见 DAG、步骤级审批/重试/拒绝
- 本地运行：Web（npx）、Desktop（Tauri）

> 产品论点：生产力不在「更多 agent」，而在 **可看见、可控制的编排**。

---

## 2. 双模式协作

| 模式 | 适用 | 能力 |
|------|------|------|
| **Free Chat** | 小修、快 review、探索 | `@` 成员、互传消息、团队协议 |
| **Workflow** | 复杂 feature、要可追溯 | Lead 规划 → 执行计划图 → 每步 approve/retry |

典型 Workflow 流（README）：

1. Lead 澄清需求  
2. Lead 出 **5 步执行计划**（依赖、负责人、验收）  
3. 人 **批准计划** 后再跑  
4. 步骤并行/串行执行，图上看状态与 diff  
5. 单步失败 **只重试该步**  
6. 收尾后小事回 **Free Chat** `@Frontend` 修 flicker

---

## 3. 技术概览

| 层 | 技术 |
|----|------|
| Desktop | Tauri + Rust（`crates/git` 等） |
| Frontend | React 工作台 UI |
| CLI | `openteams-cli`（Bun） |
| 分发 | npx `openteams-web`、GitHub Releases |

团队模板：`docs/team-templates/fullstack-development-team-template.md`

- 默认 **`hybrid`**：Chat 澄清 + Workflow 调度  
- `centralized + workflow_dag`：Lead 拆步，Workflow 管状态  
- 成员可 @，但 **关键流转以 Workflow 为准**

---

## 4. 可借鉴点与边界

OpenTeams 是 **「Agent Teams 产品」较完整的参考之一**：

| 能力 | 可吸收 |
|------|--------|
| **双模式** | Thread（轻）+ WorkflowRun（重） |
| **共享 session 上下文** | Workspace 级 context 服务 |
| **步骤级控制** | 比纯球权更贴近用户心智 |
| **Preset Team** | Member 编组模板 |
| **可见计划图** | Hub UI 工作流视图 |

| 差异 / 注意 |
|-------------|
| 偏 **单 session 多 agent 聊天 + 图** |
| 未必有 Clowder 级 custody 事件溯源 |
| Rust/Tauri 全栈重量大 |

**选型提示**：完整产品形态常见组合是 **OpenTeams 双模式 + Multica 工作对象**；球权是 Thread 子机制，Workflow 是平行一等模式——不宜只做 Clowder 式 @+球权。

---

## 5. 关键文件

| 路径 | 用途 |
|------|------|
| `README.md` | 双模式、用例 |
| `docs/team-templates/fullstack-development-team-template.md` | hybrid 编排 |
| `frontend/DESIGN_MAIN.md` | 工作台 UI 定位 |

---

*关联：[paseo-分析.md](./paseo-分析.md)、[Archon-分析.md](./Archon-分析.md)*