# LifeOS 项目深度分析

> 分析对象：[`danielmiessler/LifeOS`](https://github.com/danielmiessler/LifeOS)  
> 本地源码树：`/tmp/LifeOS`（shallow clone of `main`，与 **v6.0.5** 对齐）  
> 最新 Release：**v6.0.5**（2026-07-04/05，GitHub Latest）  
> 内部版本戳：`LifeOS/install/LIFEOS/VERSION` = **6.0.5**；Algorithm **v6.24.0**（`ALGORITHM/LATEST` → `v6.24.0.md`）  
> 维护方：**Daniel Miessler** + 社区  
> 许可证：**MIT**（Copyright 2025 Daniel Miessler）  
> 仓库状态：约 **16.6k★ / 2.3k forks**，约 **6 open issues**；创建约 2025-09；推送至 2026-07-09  
> 官网 / 文档：https://ourlifeos.ai · https://docs.ourlifeos.ai · 安装页 https://ourlifeos.ai/install  
> 定位一句话：**在既有 coding harness 上安装的「人生操作系统」——用 TELOS 定义理想态，用 Algorithm/ISA 把任意任务变成可验证的 Current→Ideal 攀登，用 Memory/Skills/Hooks/Pulse 把 DA 做成长期陪跑层**  
> 分析日期：2026-07-10

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**LifeOS 是 General Purpose AI Harness 之上的人生操作系统层：捕获「你是谁、在意什么、要去哪」，再以「Current State → Ideal State」为唯一主循环，通过 Algorithm、ISA、Skills、Hooks、Memory 与 Pulse Dashboard，让 Digital Assistant（DA）持续缩小差距。**

README 核心句：

> *LifeOS is a General Purpose AI Harness for doing anything you want to do in life and work with AI.*  
> *… moving from your Current State to your Ideal State in pursuit of Euphoric Surprise.*

### 1.2 命名与谱系（必读）

| 阶段 | 名称 | 形态 |
|------|------|------|
| 早期–v5 | **PAI**（Personal AI Infrastructure） | 常以完整 `~/.claude` 树 / 发布目录拷贝安装 |
| **v6.0.0+** | **LifeOS** | **单 Skill 分发**：`LifeOS/` 目录即整个发行包 |
| **v6.0.5** | 代码标识符完成 PAI→LifeOS rename | 运行时关键路径刻意保持兼容，避免盲替换炸系统 |

公开仓库是 **sanitized public instance**；作者本机私有实例（历史称 PAI_DIRECTORY）与公开仓分离——`SECURITY.md` 强调绝不把个人密钥/上下文拷进 public。

> 注意：本机若仍有 `Personal_AI_Infrastructure` 克隆且 remote 指向旧名、Releases 止于 v5，**不能**代表当前 v6 架构。

### 1.3 它解决什么问题

| 痛点 | LifeOS 做法 |
|------|-------------|
| 每次会话从零教 AI | **USER/**（Principal / DA / TELOS）+ **MEMORY/** + 钩子注入 |
| 只有聊天，没有「人生操作系统」语义 | **Current→Ideal** 主循环；TELOS 持人生理想态 |
| 任务「做完了吗」不可验证 | **ISA + ISC**（Ideal State Artifact / Criteria）当测试面 |
| 简单问题与深度任务同一套重流程 | **Router**：MINIMAL / NATIVE / ALGORITHM + E1–E5 |
| 能力靠口头约定 | **~50 Skills** + Hook 生命周期 + 有界委托 |
| 系统在跑但看不见 | **Pulse**（`:31337`）统一 daemon + Life Dashboard |
| 升级抹掉个人配置 | **USER 永不被升级覆盖**；安装 additive、permission-gated |

### 1.4 是 / 不是

| LifeOS **是** | LifeOS **不是** |
|---------------|-----------------|
| 装在 **既有 AI coding harness** 上的人生 OS / 上下文基础设施 | 自研 LLM 推理运行时 / 独立 agent loop 产品 |
| **Skill + Hooks + 系统提示「宪法」** 驱动的行为层 | 多租户 SaaS 控制面 |
| 以 **Claude Code 为主测路径** 的 harness-agnostic 设计 | 对 Cursor/Codex 等已有完整 always-on hooks  parity |
| **文件/Markdown 优先** 的记忆与人格系统 | 纯向量黑盒记忆 |
| 个人单租户、Principal+DA 双身份 | 团队工单调度平台（Symphony 类）或 CLI swarm（ClawTeam 类） |

### 1.5 三层心智模型（Thesis）

```text
┌─────────────────────────────────────────┐
│  DA — Digital Assistant（人格/声音/对话面）│
├─────────────────────────────────────────┤
│  Pulse — Life Dashboard（可见与自动化面）  │
├─────────────────────────────────────────┤
│  LifeOS 本体 — Memory / Skills / Hooks /  │
│  Algorithm / ISA / TELOS / Router …       │
└─────────────────────────────────────────┘
```

- **LifeOS** = OS（资源与过程）  
- **Pulse** = 看见 OS 在跑的窗口  
- **DA** = 你交谈的那张脸（每人命名自己的 DA）

---

## 2. 整体架构

### 2.1 分发形态（v6 关键变化）

```text
GitHub Release (tag v6.0.5)
        │
        ▼
   LifeOS/          ← 整个发行物 = 一个 Skill
   ├── SKILL.md     ← 安装/升级/卸载/面试 路由
   ├── INSTALL.md   ← AI-native 安装说明书（ourlifeos.ai/install）
   ├── Workflows/   ← Setup | Interview | Update | Uninstall
   ├── Tools/       ← DetectEnv / DeployCore / InstallHooks / …
   └── install/     ← 运行时载荷
       ├── LIFEOS/  ← 系统：Algorithm, Pulse, TOOLS, 文档, 系统提示
       ├── skills/  ← ~50 能力 skill
       ├── hooks/   ← ~50 lifecycle hooks
       ├── agents/  ← 跨厂商研究/构建 agent 定义
       └── USER/    ← 空模板（个人数据脚手架）
```

**安装主路径（AI-native）：**

```text
“Read https://ourlifeos.ai/install and install LifeOS for me.”
  → 能力门 → bun 工具链 → DeployCore → ScaffoldUser →
    （许可后）InstallHooks / 启动别名 → Setup → Interview
```

终端捷径：`curl -fsSL https://ourlifeos.ai/install.sh | bash`（Claude Code / macOS·Linux 友好）。

**宪法加载关键点：** 普通 `claude` **不会**加载 `LIFEOS_SYSTEM_PROMPT.md`；必须经 `lifeos` 启动器（`bun …/lifeos.ts -s …/LIFEOS_SYSTEM_PROMPT.md`，即 `--append-system-prompt-file`）。缺这一步 = 只剩 CLAUDE.md，没有操作系统契约。

### 2.2 双层安装模型

| 层 | 内容 | 同意方式 |
|----|------|----------|
| **Core** | Skill 库 + LIFEOS 运行时 + USER 树 + 系统提示 + `lifeos` 启动 | 一体安装 |
| **Enhancements（自选）** | hooks、statusline、tooltips、spinner verbs、agents、**Pulse**、worksweep/derivedsync 等 | 逐项许可 |

Pulse / launchd 后台任务在文档中标明 **macOS 优先**；Linux/Windows 需诚实降级。

### 2.3 运行时落盘直觉（Claude Code 路径）

安装后典型布局（`DetectEnv` 解析 config root，常见为 `~/.claude`）：

| 路径 | 角色 |
|------|------|
| `~/.claude/LIFEOS/` | 系统：Algorithm、Pulse、TOOLS、文档、系统提示 |
| `~/.claude/skills/` | 公共 Skills + LifeOS 安装 skill |
| `~/.claude/hooks/` | 生命周期钩子 |
| `~/.claude/settings.json` + `settings.system.json` | hooks 合并；SessionStart 再生成时需双写保护 |
| `USER/`（link 进树） | Principal / DA / TELOS / WORK / CONFIG… **升级不碰** |
| `~/.claude/LIFEOS/MEMORY/` | 结构化记忆树 |
| Claude `projects/` | 原生 transcript（火hose，~30 天） |

### 2.4 技术栈摘要

| 维度 | 选择 |
|------|------|
| 主语言 | TypeScript（Bun 运行） |
| 宿主 | Claude Code 最完整；宣称可装 Cursor/Cline/Codex/Gemini/Hermes/OpenClaw（hooks 能力不等） |
| 配置 | TOML（`LifeosConfig.ts`；YAML 模板已弃） |
| Dashboard | Pulse 单进程 HTTP **:31337** + 可选菜单栏 App |
| 跨厂商 | Forge（Codex/GPT 构建+审计）、多 Research agents |
| 语音 | ElevenLabs 等（Pulse Voice） |

---

## 3. 核心子系统

### 3.1 Thesis：Current → Ideal + Euphoric Surprise

- **Current State**：记忆、观察、工作中、健康/日程等信号  
- **Ideal State**：TELOS（人生）+ ISA（任务/项目）  
- **Hill-climb**：每一步缩小差距  
- **Euphoric Surprise**：体验度量——答案「说不出但认得出」的惊喜感  
- **认识论**：David Deutsch **hard-to-vary explanation**；ISC = 可证伪的「完成」原子

### 3.2 TELOS（人生理想态）

`USER/TELOS/` 脚手架（公开模板）包括：

`PRINCIPAL_TELOS.md`、`MISSION.md`、`GOALS.md`、`BELIEFS.md`、`WISDOM.md`、`CHALLENGES.md`、`STRATEGIES.md`、`NARRATIVES.md`、`PROBLEMS.md`、`CURRENT_STATE/`、`IDEAL_STATE/`、`HEALTH/`、`FINANCES/` 等。

**Interview 工作流**在安装后采集：DA 命名 → Principal 身份 → Current/Ideal → 外部笔记导入 → 播种 Pulse。

### 3.3 Algorithm（任务级主引擎）

**七阶段：**

| 阶段 | 作用 |
|------|------|
| **OBSERVE** | 逆工程请求、定 tier、脚手架/加载 ISA、密度门与上下文充分性 |
| **THINK** | 风险/假设、查 MEMORY、硬性 thinking 能力下限 |
| **PLAN** | 范围策略、并行隔离、特性拆解 |
| **BUILD** | 调用能力准备（权威写入推迟到 LEARN） |
| **EXECUTE** | 干活并勾选 ISC |
| **VERIFY** | 证据驱动验证（Verification Doctrine） |
| **LEARN** | 反思、学习路由、ISA Append / 沉淀 |

**三种输出模式（与 Router 联动）：**

| MODE | 含义 |
|------|------|
| **MINIMAL** | 问候/评分/确认 |
| **NATIVE** | 理想态一行可说清；模板紧，能力仍可满开 |
| **ALGORITHM** | 理想态需 ISC 才能说清；走七阶段 |

**努力档 E1–E5：** 时间预算、ISC 软/硬下限、thinking 硬下限、委托软下限、密度门阈值不同。E4/E5 引入 Advisor、Forge audit 跨厂商验证等重仪式。

**Verification Doctrine 要点：**

1. 证据闭合（含 v6.24 **运动/交互**须 frame-scrub gallery，禁止单张静帧冒充）  
2. Advisor / 跨厂商（Forge **audit** 模式；builder≠auditor）  
3. Class-Sweep：同类缺陷扫全再关 ISC  

### 3.4 ISA（Ideal State Artifact）

**一个原语的五种身份：** 理想态表述 / 测试面 / 构建验证 / Done 条件 / 系统记录。

**固定十二节（非空才出现）：**  
Problem → Vision → Out of Scope → Principles → Constraints → Goal → Criteria → Test Strategy → Features → Decisions → Changelog → Verification。

**两栖家：**

- 项目：`<project>/ISA.md`（长期）  
- 任务：`MEMORY/WORK/{slug}/ISA.md`  

**六工作流（ISA skill）：** Scaffold / Interview / CheckCompleteness / Reconcile / Seed / Append。  
**Ephemeral feature 文件**支持 Ralph-loop 式隔离执行再 Reconcile（稳定 ISC ID）。

### 3.5 Router（姿势决策层）

文档明确把「如何处理 prompt」收成 **Router** 子系统，与 Algorithm 的「在姿势内执行」正交：

1. **Classify** — `TheRouter.hook.ts`（fast-path → cache → Opus-level 分类；fail-safe 偏上）  
2. **Route effort** — E 档 → effort level  
3. **Select model** — 唯一映射表 `EFFORT_MODEL`（max/high/medium/low → 具体模型）  
4. **Dispatch** — 子 agent 的 `model` 参数  

**动态范围哲学：** 问候毫秒级；教义改造走满七阶段 + 跨厂商。避免「万事中庸」。

**Harness 限制诚实声明：** 主会话模型在 turn 开始后不可改；动态范围主要落在 **被 dispatch 的子 agent**。

### 3.6 Skills

- 公开库约 **50–51** 个 TitleCase skill（Research、Council、RedTeam、ISA、Telos、Harvest、Browser、CreateSkill…）  
- **公/私边界：** `TitleCase` 可进 public；`_ALLCAPS` 私有 skill **不进** public release（containment）  
- 标准形：`SKILL.md` + `Workflows/` + 可选 `Tools/` + Gotchas  
- **Harvest（v6.0.5）：** 对单一 URL/视频/文章做「对系统是否有用」的 **report-only** 挖掘；采纳须另批

### 3.7 Hooks

约 **49** 个 `.hook.ts`，覆盖：

- 路由与模式（TheRouter、PromptProcessing）  
- 记忆（LoadMemory、MemoryReview*、MemoryHealthGate、MemoryDeltaSurface）  
- 安全与外发（Safety、EgressClassGuard、SystemFileGuard）  
- 成功宣称与证据（SuccessClaimGate）  
- 输出格式（OutputFormatGate、DriftReminder）  
- 关系与满意度（RelationshipMemory、SatisfactionCapture）  
- ISA 同步与相位（ISASync、Algo 相关）  

钩子经 **显式许可** 写入 harness `settings.json`；bare skill **不能**自动接管宿主。

### 3.8 Pulse

- **单 Bun 进程**、默认 **localhost:31337**  
- 模块：Cron、Voice、Hooks 校验 API、Observability Dashboard、Telegram、iMessage（默认关）、Worker、Assistant、UserIndex…  
- **崩溃隔离** 模块环；launchd `com.lifeos.pulse`（macOS）  
- Telegram 管线含：allowlist、注入扫描、空闲会话边界、DA 上下文块、语音摘要、与桌面 `/notify` **信道隔离**（`LIFEOS_NOTIFICATION_CHANNEL`）

### 3.9 Memory

**双层：**

1. **LifeOS MEMORY**（`~/.claude/LIFEOS/MEMORY/`）— 结构化、钩子与工具写入  
2. **Claude projects/** — 原生 transcript 火hose  

**核心目录（inventory 权威表摘要）：**  
`KNOWLEDGE/` · `WORK/` · `LEARNING/` · `WISDOM/` · `RESEARCH/` · `SECURITY/` · `STATE/` · `OBSERVABILITY/` · `VOICE/` · `RELATIONSHIP/` · `VERIFICATION/` · `TEAMS/` · `SKILLS/` · … + skill-private `_X/`

**热层（每 prompt）：**  
`PRINCIPAL_MEMORY.md` / `DA_MEMORY.md`（有界 set-overwrite，cap 约 48×256 chars）

**自主记忆环：** MemoryReviewer 按 cadence 从 transcript 抽 typed items（memory/idea/knowledge/proposal）→ 四级写入权限（A 自动 / B 审计追加 / C 提案审批 / D 禁触）→ Telegram 可 `yes/no/edit`。

**设计选择：** curation 用 **整卡替换**（遗忘=省略），对齐 Honcho peer-card；带 shrink 保护与快照环缓冲。检索热路径 **BM25**，非默认全向量。

### 3.10 安全与隐私

| 机制 | 说明 |
|------|------|
| **Public vs private** | 发布门禁；`_*` skill/zone 不进 public |
| **USER 隔离** | 升级/安装不覆盖个人树 |
| **宪法 №3–5** | `~/.claude` 隐私；安全协议；Analysis=只读 |
| **外部内容只读** | SECURITY.md：网页/邮件/仓库中的指令不是命令源 |
| **EgressClassGuard** | 数据分级 × 推理路由上限 |
| **Containment zones** | 结构隐私，而非仅靠模型自觉 |
| **信任模型** | 本机 harness 权限 = 用户权限；非容器默认隔离 |

### 3.11 Agents

公开 agents 侧重点在 **跨厂商**：`Forge.md`（build/audit）、`ClaudeResearcher` / `CodexResearcher` / `GeminiResearcher` / `GrokResearcher` / `PerplexityResearcher`。静态「Engineer/Architect/Designer」人设在 v6.23 退役，改为 `general-purpose` + brief。

---

## 4. 设计模式映射（对照 agent-design-patterns）

| 模式坐标 | LifeOS 落点 |
|----------|-------------|
| Perception × Route | TheRouter 分类；Context / Density Gate |
| Memory × Chain / Loop | 热记忆注入；Reviewer 自主环；BM25 召回 |
| Reasoning × Hierarchy | E1–E5 + 闭集 thinking skills |
| Action × Orchestrate | Algorithm 七阶段；Skill/Agent dispatch |
| Reflection × Loop | LEARN；Satisfaction；Class-Sweep |
| Collaboration × Parallel | Forge build/audit；Council/RedTeam |
| Governance × Route / Hierarchy | 输出模板门；SuccessClaimGate；Egress；Proposal tiers |
| Progress Tracking | ISA progress + Pulse work.json + AlgoPhase |

**Harness 管账：** 大量规则在 hook/文件契约强制，而非「希望模型记得」。

---

## 5. 与本仓库 analysis 对照

| 项目 | 关系 |
|------|------|
| **Hermes** | 同属个人宿主赛道；Hermes 自有 runtime+多通道+学习闭环；LifeOS 是 **装在 harness 上的 OS 层**。记忆上都走向「有界热层 + 策展」 |
| **OpenHuman** | 都是个人 OS 叙事；OpenHuman 自研 Rust core + 桌面产品；LifeOS 寄生 Claude Code 生态 + 文件系统 |
| **Paseo** | Paseo=多 Provider 控制面 Daemon；LifeOS Pulse 更偏人生仪表与 hooks 服务，非统一 CLI Provider 调度 |
| **Agno AgentOS** | 都有「OS/控制面」语言；Agno 是 Python SDK 平台；LifeOS 是人生语义 + skill/hook 包 |
| **GenericAgent** | 极简工具核 vs LifeOS 厚 doctrine；二者都强调工作记忆与技能生长 |
| **OpenCrew** | Autonomy/Closeout/知识岗 vs LifeOS ISA/LEARN/MEMORY 树——可对照「结构化收尾」 |
| **Symphony / Antfarm / Multica** | 工单/流水线中心；LifeOS 中心是 **理想态与人生上下文**，编码只是域之一 |
| **OpenWiki** | 证据驱动文档 vs LifeOS ISA 作 SoR——都强调可验证、可维护 |
| **Fabric** | 作者明确：Fabric=「问什么」patterns；LifeOS=「DA 如何运转」；可组合 |

**选型直觉：**

- 要 **人生语义 + Claude Code 深度一体化** → LifeOS  
- 要 **自有多通道 runtime / 容器默认** → Hermes / NanoClaw  
- 要 **多 CLI 编码控制面** → Paseo / ClawTeam  
- 要 **工单自治实现** → Symphony / Antfarm  

---

## 6. 可借鉴点 / 不可照搬 / 风险

### 6.1 强烈可借鉴

1. **单一主循环叙事**：Current→Ideal；人生（TELOS）与任务（ISA）同构不同尺度  
2. **ISA 五身份 + 十二节**：避免 acceptance.yaml / 测试清单碎片化  
3. **Router 动态范围**：MINIMAL/NATIVE/ALGORITHM + 失败偏上  
4. **模型路由两编辑点**：`EFFORT_MODEL` 与版本 CURRENT 分离  
5. **热记忆有界 + 策展替换 + 提案分级写入**  
6. **安装哲学**：additive、许可突变、USER 永不覆盖、AI-native install 文档即程序  
7. **宪法加载显式化**：独立 launch 命令加载 system prompt  
8. **Harvest 报告-only**：外部智慧摄入与采纳门分离  
9. **公/私 skill 命名边界** 与发布 containment  
10. **验证即攀登机制**（非附加 QA）

### 6.2 不宜原样照搬

| 项 | 原因 |
|----|------|
| 全量 Algorithm 教义体积 | v6.24 单文件数百行 + 钩子矩阵，个人 OS v1 会噎死 |
| Claude Code hooks 强绑定 | 其他 harness always-on 仍 roadmap |
| E4/E5 ISC 数量下限 | 对小任务仪式过重（虽有 NATIVE 分流） |
| ElevenLabs / Telegram 全家桶 | 依赖与隐私面扩大 |
| 把「输出模板门」做成过度刚性 UX | 适合作者审美，未必适合所有 Principal |

### 6.3 风险与局限

- **安装与认知门槛**仍高（社区讨论：非终端用户 vs「人人可用」愿景落差）  
- **主路径 Claude 亲和** → 多 harness 诚实降级需心理预期  
- **本机信任模型** → 等同把生活权限交给 harness  
- **settings.json 并发写** 曾导致钩子静默丢失（文档自述 liveness 事故）  
- **公开仓 sanitize 纪律** 依赖流程；泄漏面仍在  
- 体量大：技能+钩子+Pulse+教义，**可理解性**低于 NanoClaw 哲学  

---

## 7. 版本与演进要点

| 版本 | 要点 |
|------|------|
| **v2.x** | Algorithm 成型、Euphoric Surprise |
| **v3–v4** | 安装器、技能层级、精简 |
| **v5.0** | 「Life OS」产品化：Pulse 统一 daemon、DA、Algorithm 现代化、Memory 分型 |
| **v6.0.0** | **单 Skill 分发**；正式 **LifeOS** 名；install-by-prompt |
| **v6.0.3** | Core+Enhancements 菜单；`lifeos` 启动加载宪法 |
| **v6.0.5** | 代码 rename 收尾；**Harvest**；Algorithm **v6.24** motion 验证 |

---

## 8. 对「个人 Agent OS」设计的直接启示

若从零设计自己的个人 Agent OS（编码 + 人生 + 控制面），LifeOS 最值得抽成 **语义层** 而非 **实现层**：

| 抽什么 | 落到自己的系统 |
|--------|----------------|
| Current→Ideal 主叙事 | 人生层与任务层统一语言 |
| TELOS / ISA 尺度分离 | 长期身份 vs 单次 WorkItem 验收 |
| Router 动态范围 | 策略路由：小修不走重流程 |
| 有界热记忆 + 提案写身份 | 防错误偏好固化 |
| Pulse 可见性 | Daemon 仪表 ≠ 聊天窗口 |
| 安装/升级不毁 USER | 配置与人格数据分区 |
| Harvest 式摄入 | 研究→系统改进的审批门 |

**刻意差异化建议（相对 LifeOS）：**

- **自有 Daemon/CLI 为心脏**，Provider（含 Claude Code）可插拔，而非以单一 harness hooks 为唯一 always-on  
- **WorkItem / WorkflowRun** 一等（Symphony/OpenTeams），补 LifeOS 偏弱的「工单 OS」面  
- 治理默认 **Autonomy L0–L3** 显式表，而非仅靠 skill 与 hook 散落规则  
- v1 **薄核心**：先 Brain + Workbench + 审批 + 单 Provider，Algorithm 全教义后置  

---

## 9. 结论

**LifeOS 是 2025–2026 开源界把「个人 AI」提升到「人生操作系统」叙事最完整、教义最硬、与 Claude Code 结合最深的代表作之一。**

- **产品层：** DA + Pulse + TELOS，目标是 magnify human life，不限于写码  
- **智能层：** Algorithm/ISA/Router 把「完成」变成可验证攀登  
- **工程层：** Skill 单包分发、hooks 矩阵、文件记忆、跨厂商审计  
- **生态位：** **Harness 上的 OS 层**，不是又一个 agent runtime，也不是团队工单平台  

若你的目标是设计自己的个人 Agent OS：应 **汲取 LifeOS 的人生语义、验证纪律与记忆/安装哲学**，同时用 analysis 中其他系统补 **多 Provider 控制面、工单与双模式协作、隔离与学习闭环工程**——而不是 fork 整仓当底座。

---

## 10. 关键路径索引（基于 `/tmp/LifeOS`）

| 主题 | 路径 |
|------|------|
| 根 README | `README.md` |
| 安装 skill | `LifeOS/SKILL.md` |
| 安装说明书 | `LifeOS/INSTALL.md` |
| 安装工具 | `LifeOS/Tools/*.ts` |
| 工作流 | `LifeOS/Workflows/{Setup,Interview,Update,Uninstall}.md` |
| 系统提示（宪法） | `LifeOS/install/LIFEOS/LIFEOS_SYSTEM_PROMPT.md` |
| Algorithm 规范 | `LifeOS/install/LIFEOS/ALGORITHM/v6.24.0.md`（`LATEST`） |
| Thesis | `LifeOS/install/LIFEOS/DOCUMENTATION/LifeOs/LifeOsThesis.md` |
| Memory | `…/DOCUMENTATION/Memory/MemorySystem.md` |
| Pulse | `…/DOCUMENTATION/Pulse/PulseSystem.md` |
| Router | `…/DOCUMENTATION/Router/RouterSystem.md` |
| ISA | `…/DOCUMENTATION/Isa/IsaSystem.md` |
| Skills 规范 | `…/DOCUMENTATION/Skills/SkillSystem.md` |
| 公开技能库 | `LifeOS/install/skills/` |
| Hooks | `LifeOS/install/hooks/` |
| USER 模板 | `LifeOS/install/USER/` |
| Release 索引 | `Releases/releases.json`、`Releases/v6.0.5/README.md` |
| 安全 | `SECURITY.md` |

---

## 11. 参考链接

- GitHub：https://github.com/danielmiessler/LifeOS  
- 官网：https://ourlifeos.ai  
- 文档：https://docs.ourlifeos.ai  
- 安装：https://ourlifeos.ai/install  
- 相关博文：Building a Personal AI Infrastructure；The Real Internet of Things（作者站点）  
- 姊妹项目：[fabric](https://github.com/danielmiessler/fabric)  

---

*本分析基于 `/tmp/LifeOS` 源码树（v6.0.5 对齐）、`LifeOS/install/**` 文档与工具清单、Release notes 与 GitHub 元数据。未完整审计全部 50+ skill 实现与 Pulse 全量 UI 代码；教义文件与部分 DOCUMENTATION 摘要版本号存在轻微漂移（如 AlgorithmSystem.md 摘要仍写 v6.19），以 `ALGORITHM/LATEST` 与 `VERSION` 为准。*
