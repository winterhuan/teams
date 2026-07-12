# 附录 — Analysis 全量综合（M0.2.14 · M0.3.0 产品中心注记）

> **隶属：** 主轴 §3 / 附录 B；边界短文见 [`open-source.md`](./open-source.md)  
> **底稿：** `analysis/*` 共 **27** 份  
> **原则：** 多源装配、无单一上游；**机制可学、产品中心不可被竞品替换**  
> **状态：** 设计综合矩阵（非竞品 changelog 镜像）  
> **历史模型提示：** 本矩阵最初按 M0.3.0 的 WorkItem 模型与 M1/M2/M3 排期写成，保留用于追溯分析来源；这些边界已被 M0.5.0 取代。当前模型以 [`../../CONTEXT.md`](../../CONTEXT.md)、ADR [0001](../../docs/adr/0001-remove-workitem-thread-as-execution.md)/[0002](../../docs/adr/0002-issue-status-vs-claim-lifecycle.md)/[0003](../../docs/adr/0003-workflow-run-independent-from-thread.md) 与 [`ui.md`](./ui.md) 为准：Thread 承载自由协作，WorkflowRun 承载受控执行，Issue 承载业务追踪，Claim 管调度。

---

## 1. 综合结论（给实现者的一页）

| 层 | Hearth 定案 | 主参考簇 | 刻意不采用 |
|----|-------------|----------|------------|
| **心脏** | 本机 **hearthd** 账本 + 调度 | Paseo、Agno AgentOS | LifeOS 寄生 hooks；浏览器为真相（Neo） |
| **工作真相（当前）** | **Project + Artifact + Thread（自由协作）+ WorkflowRun（受控执行）+ Issue（业务追踪）+ Claim（调度）** | Symphony、Multica、Antfarm | 完整 PM SaaS；把对话、Run 或看板任一方当唯一主轴 |
| **编制** | **多 Team × Member** 分域 | Clowder、OpenCrew、Multica Squad、Agno Team | 单万能队；强制 Slack 为唯一载体 |
| **执行** | **Provider 注册表 + 薄 Adapter** | Pi、acpx、Omnigent harness 矩阵 | v1 自研完整 ReAct；写死 AgentType 枚举 |
| **内环** | Session.**LoopState** 契约 | GenericAgent、Pi loop、Deep Agents middleware 思想 | 绑死某一 harness 实现 |
| **外环协作（当前）** | Thread 自由协作 + 独立 WorkflowRun；M5 swarm 是 Run 执行策略 | OpenTeams 双模式、Archon DAG、ClawTeam worktree swarm | 把 Team 当模式；无 Acceptance 的「聊完即完」 |
| **治理** | 单一 autonomy 谓词 + L0 硬门 + Approval | OpenCrew / patterns C7、Hermes 诚实威胁模型、Dyad path | 默认 skip-permissions（ClawTeam 开发默认） |
| **记忆** | 可读 `memory/` + 队 `knowledge/` + Skills 文本 | Hermes、OpenHuman、OpenWiki | 纯黑盒向量脑；可执行「技能」伪装 |
| **注意力** | **Home 新产物优先** + Pulse 硬门条 + detach + unseen | LifeOS Pulse 灵感、Herdr 态势 | TUI 多路 / Board 顶栏取代产物主入口 |
| **人生** | 可选 Telos + life-ops 队 | OpenHuman、LifeOS **切片** | Algorithm 教义 / 巨型 ISC 下限 |
| **产品节奏** | **异步 CVO**（派活→静默→新产物→小本本→Bundle→验收） | 产品自创 + Symphony 无人值守 + Herdr detach | 每轮等你点继续的陪聊默认 |
| **产品中心（M0.3.0）** | **Project 拥有 Artifact**；Home→画廊→预览器；Board=进展子页 | 自创（多形态产物） | Board/WorkItem 当唯一宇宙 |

**一句话装配：**  
Hearth = **Paseo/Agno 控制面** + **Project/Artifact 产物脊** + **Symphony/Multica 工单脊** + **Clowder/OpenCrew 编制** + **Pi/acpx/Omnigent 执行腰** + **Hermes/OpenHuman/OpenWiki 记忆** + **GenericAgent 内环契约** + **Herdr/Neo/Dyad/Codeg 机制切片** — 中心永远是 **Daemon 账本 + 可预览产物**，不是聊天、不是 TUI、不是 App Builder、不是任务看板 alone。

---

## 2. 全量吸收矩阵（27）

图例：

| 标记 | 含义 |
|------|------|
| **A** | 已进主轴/annex 合同（可实现） |
| **P** | 原则/阶段预留（later 明确） |
| **R** | 明确拒绝或仅对照 |

| # | analysis | 一句话定位 | 吸收（Hearth 锚点） | 状态 | 拒绝 |
|---|----------|------------|---------------------|------|------|
| 1 | `paseo-分析.md` | 多 Provider Daemon + Timeline + 多端 | hearthd；Provider Registry；Timeline epoch；Skills 编排旁路 | **A** | 整站 Expo 产品面作 v1 必交 |
| 2 | `pi-分析.md` | 薄 harness；双层 loop；RPC | 默认 Provider 形态；steering≈nudge；follow-up≈出口后再喂；渐进 Skill 披露 | **A** | 内核做 sub-agent 宇宙 |
| 3 | `acpx-分析.md` | ACP 统一 CLI/session/queue | transport=`acp`；conformance 思想；不自建完整 session 队列抢职责 | **A** | acpx 变唯一心脏 |
| 4 | `agno-分析.md` | Python Agent OS；TeamMode | Team 语义；HITL；事件流；Learning 多 store 思路 | **A** | 强制 Python 唯一栈 |
| 5 | `langgraph-分析.md` | 有状态图执行 + checkpoint | WorkflowRun **可选引擎**；interrupt≈Approval | **A/P** | StateGraph = Team 模型 |
| 6 | `deepagents-分析.md` | middleware 栈；subagent；backend | 上下文/技能中间件思想；ExecutionBackend 预留；subagent≠Member | **P** | 用 DA 取代 Team/WorkItem |
| 7 | `omnigent-分析.md` | Meta-harness；Policy；能力矩阵 | Provider **capabilities 声明**；**单一 policy evaluate**；adapter conformance | **A**（合同） | Omnigent 作唯一 runtime |
| 8 | `symphony-分析.md` | 看板驱动无人值守；WORKFLOW.md | WorkItem 一等；claim≠tracker 可分；quiet 长跑；Acceptance | **A** | 绑定 Linear/Codex only |
| 9 | `multica-分析.md` | Issue+Squad+本地 daemon | Board；Squad≈Team；@ 唤醒；技能复利 | **A** | 云多租户 PM 全家桶 |
| 10 | `antfarm-分析.md` | OpenClaw 上可装流水线 + Medic | pipeline 模板；角色削权；Ralph 新鲜上下文；**Medic M5** | **P/A** | 绑 OpenClaw 为唯一宿主 |
| 11 | `openteams-分析.md` | Thread + Workflow 双模式 | orchestration=thread\|pipeline；promote 显式 | **A** | — |
| 12 | `Archon-分析.md` | YAML DAG；AI+确定性节点混合 | WorkflowRun：**bash gate + AI step**；worktree per run | **A**（完整闭环） | 单 agent DAG 取代多 Member |
| 13 | `ccg-workflow-分析.md` | Intent→Strategy 矩阵 | QAPS/路由偏轻；phase HARD STOP≈计划门 | **A** | 只做 Claude Code 插件 |
| 14 | `clowder-ai-分析.md` | 多猫协作平台；CVO；Hard Rails | 身份抗压缩；实现≠验证；人不当路由器 | **A** | Redis CatCafe 整站；无 Lead 唯一哲学 |
| 15 | `ClawTeam-分析.md` | CLI swarm + worktree + mailbox | **M5 swarm** 主参考：worktree 隔离、Daemon 邮局、agent-native CLI | **P** | 默认 skip-permissions；文件状态机当分布式总线 |
| 16 | `opencrew-分析.md` | Markdown 治理 + KO + L0–L3 | 自主等级；知识沉淀；A2A 可移植思想 | **A** | 强制 Slack |
| 17 | `hermes-agent-分析.md` | 自改进宿主；热冷记忆；skill | 热冷分层；程序性 Skills；**Session 记忆冻结**；学习写回审批；honest OS 边界 | **A** | 巨型宿主 fork 为底座 |
| 18 | `openhuman-分析.md` | 可读 Brain + 编排 | Brain 产品名；Wiki 可读优先 | **A** | GPL 全家桶 fork |
| 19 | `openwiki-分析.md` | 仓内 Agent Wiki + git 增量 | **Project/队 knowledge 刷新配方**；AGENTS 入口；no-op 省 token | **A**（M0.2.14） | Wiki CLI 当编排核心 |
| 20 | `genericagent-分析.md` | 极简内环 + checkpoint + skill 树 | LoopState；goal 预算；checkpoint；技能沉淀 | **A** | 裸奔无治理当生产默认 |
| 21 | `nanoclaw-分析.md` | 小宿主 + Docker 默认隔离 | ExecutionBackend 预留；通道隔离思想 | **P** | v1 强制 Docker |
| 22 | `LifeOS-分析.md` | Claude hooks 人生 OS | Pulse 名灵感；Telos 切片；安装不毁个人区；Harvest report-only | **A**（切片） | E1–E5/ISC 宪法；hooks 唯一心脏 |
| 23 | `agent-design-patterns-分析.md` | 28 模式坐标 + 五定律 | 设计评审语言；Context Triage；Guardrail；Failure Journals→Closeout/scars | **A**（设计时） | 当 runtime 依赖 |
| 24 | `codeg-分析.md` | 多引擎工作台 + 委托 + worktree 自动化 | Automation isolation；委托字段；HUD；导入 | **A** | 对话中心取代 Board |
| 25 | `dyad-分析.md` | 本机 App Builder + apply 人审 | turn_mode；apply_batch；意图保护；path_deny | **A** | App-builder 中心 |
| 26 | `herdr-分析.md` | 终端多路 + 态势 + wait | attention/unseen；detach；wait；状态单权威 | **A** | TUI 取代 Board；AGPL fork |
| 27 | `neo-chat-分析.md` | 浏览器 local-first 聊天 | Skills≠Tools；run_error；context budget；risk；doctor | **A** | 浏览器为真相库 |

---

## 3. 问题域 → 最强样本（实现选型用）

| 问题域 | 首选样本 | 次选 | Hearth 落点 | 不做 |
|--------|----------|------|-------------|------|
| Daemon 生命周期 / 多客户端 | Paseo | Agno OS | hearthd + CLI/Pulse | — |
| Provider 适配 / ACP | Pi、acpx | Omnigent、Codeg | Registry + Adapter | 写死枚举 |
| 策略/权限单点评估 | Omnigent Policy | OpenCrew L0–L3、patterns C7 | `may_execute` 谓词 + action 表 | 多套公式 |
| 工单状态机 / 无人值守 | Symphony | Multica、Antfarm | WorkItem FSM | 完整 Linear 克隆 |
| Intent 路由轻重 | CCG | patterns Complexity Routing | QAPS 先验 + 偏轻 | 权重比大小第三轴 |
| 团队身份 / 抗压缩 | Clowder | OpenCrew SOUL | Member.soul 每 Session | 无身份临时 bot |
| 双模式协作 | OpenTeams | Archon（重）+ Thread | thread / pipeline | 频道=岗位唯一 |
| Swarm 并行工程 | ClawTeam | ClawTeam+git | M5 worktree swarm | 共享目录 prompt 假装并行 |
| 内环停止条件 | GenericAgent | Pi、Ralph | LoopState + budget | 无停止 while |
| 叠环 / 验证 | Loop Engineering + Antfarm verifier | Archon bash gate | Acceptance + builder≠verifier | 自审即完成 |
| 记忆学习 | Hermes | OpenHuman | memory 三档 + skills | 黑盒向量唯一 |
| 仓知识维护 | OpenWiki | OpenHuman Wiki | knowledge 刷新 Automation | 编排器 |
| 路径/写盘安全 | Dyad、Hermes | NanoClaw 容器 | path_deny + L0 + 后段 backend | 默认 YOLO |
| 工作台 cwd/委托 | Codeg | Paseo workspace | Project + Session.cwd | 对话宇宙 |
| 注意力 / 长跑 | Herdr | LifeOS Pulse | Pulse + detach + Return | 关 UI=杀进程 |
| 聊天 UX 细节 | Neo Chat | Dyad empty CTA | 错误块、budget、doctor | SaaS 聊天 |
| 人生语义 | OpenHuman / LifeOS 切片 | — | Telos 可选 | 教义 OS |
| 设计语言 | agent-design-patterns | — | 评审坐标 | 运行时库 |
| 图执行引擎 | LangGraph | Deep Agents | 完整闭环可选 Workflow 后端 | Team 本体 |

---

## 4. 本次综合（M0.2.14）相对 M0.2.13 的**合同增量**

此前 M0.2.10–13 已吸收 Codeg / Dyad / Herdr / Neo。本版补齐「分析有、合同薄」的项：

| # | 来源 | 合同增量 | 主轴/annex |
|---|------|----------|------------|
| 1 | OpenWiki | **Knowledge refresh**：可选 Automation/CLI 按 git 增量刷新 `knowledge/` 或 Project 文档树；**内容未变 no-op** | §6.11 · §8.6 |
| 2 | OpenWiki / Pi / Hermes | **入口约定**：Team/Project 可声明 `agents_entry`（如 `AGENTS.md` / 队 README）供 Context 规划优先读 | §6.11 |
| 3 | Hermes | **Session 记忆快照冻结**：Session.start 时固化注入的 memory/skills 集；中途学习写回**不**热改本 Session system 面（下一 Session 再生效） | §6.10 / §6.11 |
| 4 | Hermes / Neo | **学习写回默认 approve 档**（skill 提案、全局 promote）；与 Skills≠Tools 一致 | §6.11 · §8.5 |
| 5 | Omnigent / acpx | Adapter **conformance 清单**一等（health/events/cancel/gate）；capabilities 为路由真字段 | providers.md · §6.4.5 |
| 6 | Omnigent | **Policy 单点**：所有 tool 副作用前只走 Daemon 同一 evaluate（无适配器私自放行） | §6.7 · providers |
| 7 | Archon | pipeline 步骤类型：`ai` \| `command`（确定性 gate）\| `approval` | collab / 完整闭环 pipeline |
| 8 | ClawTeam | swarm 不变量：worktree 隔离、邮箱=Daemon、**禁止**默认 skip-permissions | §8.6 · M5 |
| 9 | Pi | **steering** = 运行中 nudge；**follow-up** = 环结束后新 user 输入（禁止混语义） | loops.md · §6.10 |
| 10 | Symphony | 内部调度 claim 可与 Board 展示态分离（实现细节）；人见 Board/Acceptance | 已有 FSM；§8.6 钉死措辞 |
| 11 | LangGraph / Deep Agents | 显式：**可选执行后端**，永不替代 Team/WorkItem | open-source · §5.5 |
| 12 | agent-design-patterns | Closeout/scars ≈ Failure Journals；交棒 Context Triage（已有 collab） | 索引对齐 |
| 13 | 全量 | 附录 B / 本文件 27 行索引；禁止再「只列一半 analysis」 | 附录 B |

**仍不升聚合根：** KnowledgeWiki、ConformanceSuite、ClaimRecord、SubAgent、StateGraph、Mailbox、Medic — 皆为能力或配置（M0.2.14 曾拒「再加一根」；**M0.3.0 仅将 Artifact 升为第 6 根**，上述对象仍不升）。

---

## 5. 反模式速查（综合否定表）

| 反模式 | 来自哪些诱惑 | Hearth 规定 |
|--------|--------------|-------------|
| 全局聊天/侧栏 = 唯一主轴 | Codeg、Dyad、Neo | **所有 Projects → Project Chat**；Chat 归属 Project，其他 section 保留 |
| 任务看板 = 唯一主轴 | Symphony 整站隐喻 | 产物画廊默认；Board 降 Project「进展」 |
| TUI 多路 = 唯一壳 | Herdr | 可选表面 |
| hooks 寄生单一 CLI = OS | LifeOS | 自有 Daemon |
| 图节点 = 队员身份 | LangGraph | Member 持久身份 |
| SubAgent 列表 = 多 Team | Deep Agents | Team 编制一等 |
| 浏览器 DB = 真相 | Neo | hearthd |
| 默认危险放行 | ClawTeam dev、GA | L0 + 诚实 OS 边界 |
| 可执行内容叫 Skill | 部分生态 | Skill 纯文本 |
| 共用 Session 换角色 | 省事 | 一 Member 一 Session |
| QAPS.P = Project 实体 | 命名碰撞 | 路由标签 ≠ 根 |
| 小本本 = 全局第二列表 | 早期草案 | Work comment |
| 完成 = 模型说 done | 陪聊产品 | Acceptance / 人审 |

---

## 6. 阶段映射（能力从哪家「长什么样」）

| 阶段 | 能力像谁（示意，非依赖） |
|------|--------------------------|
| **Project Chat 完整闭环** | Paseo 控制面 + Symphony/Multica Issue/Claim 派活 + Pi/acpx 多引擎 + GenericAgent 可观察环 + Neo 错误分离 + Dyad 意图保护 + Herdr detach + Clowder 多队隔离 + OpenWiki knowledge refresh + Codeg worktree/委托 + OpenTeams 双模式 + Archon 混合 DAG + builder≠verifier |
| **M4** | Hermes 学习闭环产品化 + Handoff + Telos 切片 + goal 预算 |
| **M5** | ClawTeam swarm + Antfarm Medic + NanoClaw/Hermes ExecutionBackend + 审计加固 |

---

## 7. 维护规则

1. 新增 `analysis/*` → 必须更新**本表一行** + 主轴附录 B +（若改合同）版本号。  
2. 竞品大版本变更：**先改 analysis 底稿**，再决定是否 bump 设计合同——禁止设计文直接追 changelog。  
3. 吸收新机制时写清：**锚点对象** + **不学的产品中心**（对照 open-source 边界段）。

---

*生成：M0.2.14 全量综合。底稿日期以 analysis 文件为准（约 2026-07）。*
