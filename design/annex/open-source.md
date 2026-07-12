# 附录 — 与开源关系

> **隶属：** [`../personal-agent-os.md`](../personal-agent-os.md) §1.3 / §3  
> **策略：** 思想装配 + 可选运行时调用；**不** fork 全家桶  
> 长篇竞品分析底稿仍在 `analysis/*`；**全量吸收矩阵**见 [`analysis-synthesis.md`](./analysis-synthesis.md)  
> 本附录只保留设计边界（可学 / 不学）

---

## 1. 组合策略

| 策略 | 说明 |
|------|------|
| **不 fork 全家桶** | 思想引用 + 可选运行时调用 |
| **Provider 复用** | 本机已装 Pi/Claude/Codex 则适配，不重写；多引擎合同见主轴 §6.4.5 + [`providers.md`](./providers.md) |
| **可参考实现** | 文件状态机、SQLite FTS、YAML 步骤可小而美自研 |
| **分析全覆盖** | `analysis/` 27 份均有吸收行；新增分析必须更新 synthesis |

### 分组对照（一句话）

| 域 | 参考 | Hearth 落点 |
|----|------|-------------|
| 控制面 | Paseo、Agno | hearthd |
| 执行腰 | Pi、acpx、Omnigent 能力矩阵 | Provider 适配 + conformance |
| 可选图引擎 | LangGraph、Deep Agents | WorkflowRun 后端选项；**≠** Team |
| 工作 | Symphony、Multica、Antfarm | Issue 业务追踪 + Thread 自由协作 + WorkflowRun 执行 + Claim 调度 |
| 团队 | Clowder、OpenCrew、Multica Squad、Agno Team | **多 Team 一等** |
| 协作 | OpenTeams 双模式、Archon DAG、CCG 策略 | Thread 与独立 WorkflowRun + 确定性 gate |
| Swarm | **ClawTeam** | M5 worktree + Daemon 邮局 |
| 记忆 | Hermes、OpenHuman、OpenWiki、OpenCrew KO | `memory/` + 队 `knowledge/` + Skills 文本 |
| 人生 | OpenHuman、LifeOS 切片 | 可选 Telos + life-ops 队 |
| 内环 | GenericAgent、Pi | LoopState 契约，不绑实现 |
| 隔离预留 | NanoClaw、Hermes backend | ExecutionBackend M5 |
| 设计语言 | agent-design-patterns | 评审坐标，非 runtime |
| **多引擎工作台** | **Codeg** | 委托、worktree 自动化、HUD；**不**改账本中心 |
| **本机 App Builder** | **Dyad** | apply 人审、turn_mode、意图保护、path；**不**改产物中心 |
| **Agent 终端多路** | **Herdr** | attention、detach、wait；**不**用 TUI 取代 Home/画廊 |
| **浏览器聊天工作区** | **Neo Chat** | Skills≠Tools、错误分离、budget、risk、doctor；**不**改 Daemon 真相 |

官方术语：**Team / Member / Project / Issue / Thread / Session / Claim / Approval / Artifact / Workspace / WorkflowDefinition / WorkflowRun / Step / Handoff / Acceptance / Daemon / Provider / Inbox / loop_policy**。  
LoopState = Session 值对象（非聚合根）。Brain = 记忆产品名（路径 `memory/`）。

---

## 1.1 与 Codeg 的边界

> 底稿：[`analysis/codeg-分析.md`](../../analysis/codeg-分析.md)  
> Codeg：**多 Agent 编码工作台**（Folder + Conversation + 委托）  
> Hearth：**个人 Agent OS**（Project + Artifact + Thread + Issue + Team/Posting；主入口所有 Projects，进入默认 Chat）

### 可学（机制）

| 点 | Hearth 落点 |
|----|-------------|
| Folder = cwd 轴 | **Project.root_path** + Session.cwd |
| worktree 子 Folder | `Session.worktree_path`；Automation `isolation=worktree_per_run` |
| `delegate_to_agent` + codeg-mcp | 可选 **hearth-mcp** + Session 父子字段；v1 one-shot |
| Automation + fire_lock | **AutomationRecipe**（非根）；fire → 必建/绑定 Thread，可选关联 Issue |
| SessionStats HUD | Pulse Live tokens / duration / context% |
| 多引擎 transcript 导入 | 可选只读索引，不自动变 Thread / Issue |
| 技能×Agent 矩阵 | Member.tools + skills 挂载 UI |
| Transport 双模 `_core` | CLI 与 Pulse 共用 Daemon API |

### 不学（产品中心）

| 点 | 原因 |
|----|------|
| 全局 Conversation 列表为唯一主轴 | Hearth 以 **Project** 为容器，进入才落 Chat；Board / Artifacts / Workspace / Team 均留在项目内 |
| AgentType 写死枚举 | Provider **注册表**开放 |
| Pets / 全量 Office 脚手架 | 非 Hearth 产品域 |
| 用工作台取代审批账本 | 硬门仍在 Daemon 账本，并投影到 Inbox/对话流 |

---

## 1.2 与 Dyad 的边界

> 底稿：[`analysis/dyad-分析.md`](../../analysis/dyad-分析.md)  
> Dyad：**本机 AI App Builder**（chat → 写码 → live preview）  
> Hearth：**个人 Agent OS**（Project + Artifact + Thread + Issue + Team/Posting；主入口所有 Projects，进入默认 Chat）

### 可学（机制 / UX）

| 点 | Hearth 落点 |
|----|-------------|
| Message `approvalState` 后落盘 | **apply_batch** Approval；卡内 Grant |
| plan / ask 过滤写工具 | Session **`turn_mode`** |
| Protect the moment of intent | 中断流 resume 原 Thread/prompt；禁止死胡同 |
| path realpath + 保护路径清单 | Project/Member **path_deny 默认集** |
| versions ↔ commit | Closeout / Artifact **commit_hash** |
| MCP tool consent | 工具同意 + 仍受 path policy |
| 控制 agent 深度控成本 | loop_policy + budget；勿无界 tool 环 |
| Never a dead end | 所有 Projects / Project empty·error 一主 CTA |

### 不学（产品中心）

| 点 | 原因 |
|----|------|
| Chat + iframe 吞掉整个产品 | Hearth 以 Project 为容器，Chat 是默认主舞台，其他 section 仍独立可达 |
| 默认每请求塞整仓 | 隐私/成本；按 Project 策略 |
| 非技术 builder 唯一画像 | Hearth CVO 可脚本化、多队 |
| fork `src/pro` FSL local-agent | 许可与内核边界 |

---

## 1.3 与 Herdr 的边界

> 底稿：[`analysis/herdr-分析.md`](../../analysis/herdr-分析.md)  
> Herdr：**终端 Agent 多路复用器 / 工作区管理器**（PTY + 态势 + socket）  
> Hearth：**个人 Agent OS**（Project + Artifact + Thread + Issue + Team/Posting；主入口所有 Projects，进入默认 Chat）

### 可学（机制）

| 点 | Hearth 落点 |
|----|-------------|
| blocked / working / **done(未见)** / idle | **Session.attention** + Home 新产物 / 硬门 rollup |
| 状态单权威（hooks XOR screen） | Adapter **一条**状态链 |
| detach 进程保活 | **Detach ≠ stop**；异步 CVO |
| `wait agent-status` | **`hearth wait`** issue/thread/session/gates |
| Socket API + SKILL | Daemon API + CLI + 可选 agent 说明 |
| worktree API | Project + Session.worktree_path |
| native session resume | **provider_session_ref** |
| Server 拥有真相 | hearthd 权威；Pulse/CLI 为 client |

### 不学（产品中心）

| 点 | 原因 |
|----|------|
| TUI 多路为唯一壳 | Hearth 主轴是 **所有 Projects → Project Chat**（Inbox 为注意力抽屉） |
| screen-scrape 作为主状态源 | 脆；优先结构化事件 |
| fork AGPL 进内核 | 许可；默认互操作 spawn |
| 用终端完成定义取代 Acceptance | Issue + Acceptance 仍定义业务「完成」 |

---

## 1.4 与 Neo Chat 的边界

> 底稿：[`analysis/neo-chat-分析.md`](../../analysis/neo-chat-分析.md)  
> Neo Chat：**浏览器 local-first 聊天工作区**（多模型 + skills + plugins + RAG）  
> Hearth：**本机 Daemon OS**（Project + Artifact + Thread + Issue + Team/Posting；主入口所有 Projects，进入默认 Chat）

### 可学（机制）

| 点 | Hearth 落点 |
|----|-------------|
| Skills 纯文本 / Plugins 可执行 | **Skill 规范** vs Member tools |
| `generationError` 不进正文 | **run_error** 结构化 + UI 块 |
| 集中 contextBudget | Session **context planner** |
| tool risk 元数据 | ToolSpec.**risk** |
| 有界 tool 环 | **max_tool_rounds** |
| `/api/health` | **`hearth doctor`** |
| 记忆进模型即出本机 | 隐私诚实文案 |
| hosted URL 收紧 | 出口策略 dual-mode（后段） |

### 不学（产品中心）

| 点 | 原因 |
|----|------|
| 浏览器为真相库 | Hearth 真相在 **hearthd** |
| 全局聊天列表为唯一主轴 | 主轴是 **所有 Projects → Project Chat**；Chat 归属 Project |
| 启用插件即无 per-call 确认 | 保留 **L0 / apply_batch** |
| remote-MCP-only | 本机可 stdio MCP |

---

## 2. 与 LifeOS 的边界（短）

| 可借用 | 不借用 |
|--------|--------|
| Current→Ideal 叙事（可选） | 寄生单一 harness 为唯一心脏 |
| 有界热记忆 / 提案写身份 | E1–E5 与巨型 ISC 下限 |
| 安装/升级不毁个人区 | 刚性输出模板宪法 |
| 可见仪表灵感 | 50+ hooks 全矩阵 v1 |
| 外部智慧 report-only | 以 Claude hooks 为 always-on 唯一实现 |

LifeOS **不**主导 Daemon、Thread、Issue、Provider 模型。

---

## 3. 与 Clowder AI 的边界

> 底稿：`analysis/clowder-ai-分析.md`  
> Clowder：多模型 coding CLI 之上的**团队协作平台**  
> Hearth：**个人 Agent OS**（Daemon + 多 Team + Thread/Issue + Brain/人生）

### 相同点（可学）

| 点 | 说明 |
|----|------|
| 人不当路由器 | 平台/OS 做派活；人是 CVO |
| 不替代 coding CLI | 底层都是 Provider |
| 身份一等 | Member 持久人设与边界 |
| Thread + @ | 异步协作、点名唤醒与负责人接力 |
| 跨模型复核 | 实现 ≠ 验证 |
| 可验证完成 | Acceptance + Closeout |
| Hard rails | 权限在平台侧强制 |

### 不同点（产品与架构）

| 维度 | Clowder | Hearth |
|------|---------|--------|
| 定位 | 协作**平台层**（偏软件交付） | **个人 OS**（编码+人生+控制面） |
| 心脏 | API + Redis + Web Hub | 本机 **hearthd** + CLI/Pulse |
| 主对象 | Feature 线程 / Hub / 猫 | **Project + Issue + Thread/Session + 多 Team** |
| 团队数量 | 通常一套猫队共创 | **多支分域 Team** 默认隔离 |
| Lead | 强调无 Boss、对等 + SOP | 队内 **Lead 编排**；无独立 DA 实体 |
| SOP | 全生命周期门禁一等 | 轻：Acceptance + pipeline |
| 责任转移 | 产品级 A2A | Thread 显示负责人，并用接手/交回记录责任变化 |
| 记忆 | 项目 evidence + 教训 | 全局 memory + **队级**；可选 Telos |
| 人生/非编码 | 弱 | **一等**（life-ops） |
| 运维 | Redis、多端口 | 默认文件/SQLite，无强制 Redis |
| 体验 | 完整 Web Hub、IM、游戏 | **CLI + Project Chat/Inbox 双轨**；IM 后置 |
| 代码关系 | 可运行开源产品 | **设计稿**；不 fork 为底座 |

```text
Clowder:  CVO → 平台(身份/A2A/SOP/Hub) → 多 CLI
Hearth:   Principal → hearthd(队注册/Issue·Thread·Claim/审批/memory)
                        → Team A | Team B | Team C → Member×Provider
```

### 选用

| 你要… | 更合适 |
|-------|--------|
| 开箱多猫 coding UI + 严 SOP | **直接用 Clowder** |
| 自有本机 OS、多生活/工作域、Work 一等、可渐进实现 | **做 Hearth** |
| 两者叠加 | Clowder 作编码协作体验参考；Hearth 作总控与分域；**不必**整仓嵌入 |

### 明确不照搬

1. 整站 Cat Cafe 产品面与 Redis 默认拓扑  
2. 「无 Lead」为唯一哲学  
3. 单一工作区一套角色 = 全人生  
4. 狼人杀/像素猫等体验压测作为 v1 范围  

### 明确吸收

1. 身份注入抗压缩（Member SOUL 每 Session 加载）  
2. @ 路由 + 负责人接手/交回  
3. 跨 family review 纪律  
4. CVO：人定方向与门禁，不当人肉粘贴板  
5. Hard Rails：配置/数据/边界用策略强制  

（更长的功能矩阵与版本细节以 `analysis/clowder-ai-分析.md` 为准，避免设计规格随竞品 changelog 腐烂。）

---

## 4. 其余 27 源：短边界（无专节者）

> 已有专节：Codeg §1.1 · Dyad §1.2 · Herdr §1.3 · Neo §1.4 · LifeOS §2 · Clowder §3。  
> 全表见 [`analysis-synthesis.md`](./analysis-synthesis.md)。

### 4.1 ClawTeam（M5 swarm 主参考）

| 可学 | 不学 |
|------|------|
| worktree 真隔离并行 | 默认 `skip_permissions` / YOLO |
| 文件 mailbox 语义 → **Daemon 邮局** | 文件状态机当跨机强一致总线 |
| agent-native CLI（`--json`、skill 教用法） | 用 swarm CLI 取代 Thread 执行账本与 Issue 业务真相 |
| leader/worker 模板 + 成本板 | 把研究 demo 当生产交易系统 |

### 4.2 OpenWiki（知识侧车）

| 可学 | 不学 |
|------|------|
| 仓/队 **knowledge 约定目录** | 当作编排/Mission 引擎 |
| git 增量 + **内容 no-op** 省 token | 每次 Closeout 强制全量重写 Wiki |
| `AGENTS.md` / 入口文件「先读哪」 | 替代 Member SOUL / Acceptance |
| 子读主写（调研并行） | 与 pipeline 角色模型混为一谈 |

### 4.3 Omnigent / acpx（执行腰）

| 可学 | 不学 |
|------|------|
| Harness **capabilities 矩阵** | Meta-harness 唯一 runtime |
| **单一 Policy evaluate** 契约 | 适配器内私自放行工具 |
| Conformance / bench 思想 | 为每个上游复制完整 UI |
| ACP 稳定边界（acpx） | 用 acpx 队列取代 hearthd Claim/Thread 调度 |

### 4.4 Archon / CCG / Antfarm（流水线）

| 可学 | 不学 |
|------|------|
| DAG + **确定性 command gate** + AI 步（Archon） | 单 agent DAG = 全部协作 |
| Intent→策略偏轻（CCG） | 绑死 Claude Code hooks 宇宙 |
| 角色削权、独立验证、Medic（Antfarm） | 强制 OpenClaw 宿主 |

### 4.5 LangGraph / Deep Agents

| 可学 | 不学 |
|------|------|
| checkpoint / interrupt 映射 Approval | StateGraph 节点 = Member |
| middleware 上下文管理思想 | messages reducer = Ledger |
| 可选 WorkflowRun 执行后端 | 取代 Team / Issue / Thread / Inbox |

### 4.6 Hermes / OpenHuman / GenericAgent / NanoClaw

| 可学 | 不学 |
|------|------|
| 热冷记忆、Skills 程序性、冻结快照、honest OS 边界（Hermes） | fork 巨型宿主为 Hearth 内核 |
| 可读 Brain / Wiki（OpenHuman） | GPL 分发义务拖进默认栈 |
| checkpoint、goal 预算、技能树（GA） | 默认无沙箱全能本机 |
| 容器隔离后端（NanoClaw） | v1 强制 Docker |

### 4.7 Symphony / Multica / OpenTeams / OpenCrew / Agno / Paseo / Pi

与主轴 §1.3 / §3 一致：工单脊、Squad/Issue、双模式、L0–L3 治理、控制面、薄 harness — **A 级吸收**，细节以 analysis 底稿为准，合同以主轴为准。

### 4.8 agent-design-patterns

**设计时坐标**（Context Triage、Guardrail Sandwich、Failure Journals、Complexity Routing）。  
**不**作为 pip/npm 运行时依赖；评审与命名对齐即可。
