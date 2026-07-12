# Clowder AI 项目深度分析

> 分析对象：[`zts212653/clowder-ai`](https://github.com/zts212653/clowder-ai)  
> 根包名（历史）：`cat-cafe`（`package.json`）· 对外品牌：**Clowder AI**  
> 最新 Release：**v0.11.1**（2026-06-29）  
> 许可证：**MIT**（代码）· 名称/Logo/猫角色设计见 `TRADEMARKS.md`  
> 仓库状态：约 **2.1k★ / 564 forks**，创建于 2026-03-12，活跃至 2026-07；~237 open issues；~396 commits；仓库体积极大（~800MB 量级）  
> 分析日期：2026-07-10

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**Clowder AI 是「多模型 Agent CLI 之上的团队协作平台层」——不替代 Claude Code / Codex / Gemini / opencode 的推理与工具，而是补齐身份、A2A 路由、共享记忆、SOP 纪律与人类 CVO 体验，让孤立 agent 变成真正团队。**

口号：

- **Hard Rails. Soft Power. Shared Mission.**
- *Build AI teams, not just agents.*
- *Every idea deserves a team of souls who take it seriously.*

### 1.2 核心问题

当你同时拥有 Claude、GPT、Gemini 等强模型时，默认用法会把人变成 **人肉路由器**：

- 在多个聊天窗口复制粘贴上下文  
- 手动追踪「谁说了什么」  
- 跨模型 review 靠意志力而不是流程  

Clowder 的回答：**你不当路由器，平台来当。**

### 1.3 品牌叙事：Cats & U / Cat Cafe 起源

产品从生产工作空间 **Cat Cafe** 提炼开源。角色不是营销贴纸，而是「从真实对话长出名字」的人格化团队：

| 角色 | 品种隐喻 | 默认 CLI / 模型族 | 职责 |
|------|----------|-------------------|------|
| **宪宪 (XianXian)** | 布偶猫 | Claude Code | 主架构 / 核心开发 |
| **砚砚 (YanYan)** | 缅因猫 | Codex / GPT | 安全与代码审查 |
| **烁烁 (ShuoShuo)** | 暹罗猫 | Gemini / Antigravity | 视觉与创意 |
| **金哥 (金渐层)** | 英短金渐层 | opencode | 多模型编码 / provider-agnostic |
| **斑斑 (孟加拉)** | 孟加拉猫 | Antigravity | 浏览器自动化、截图、多模型切换 |

`cat-template.json` 中还有完整 `roleTemplates`（颜色、性格、teamStrengths）——身份是**一等数据**，不是 system prompt 里随手写的一句。

愿景文档（`docs/VISION.md`）进一步表述：

- 卡点不是想法，是**实现力**；coding 是当代最直接的实现力  
- 养的是**团队**不是工具；人是作者，猫是共创放大器  
- **没有 Boss Agent**——对等协作 + 结构化交付（TDD / Review / 门禁 / 愿景守护）  
- **Cats & U**：陪伴是共创的副产品，不是独立聊天产品口号  

### 1.4 CVO（Chief Vision Officer）

人的新角色定位：

| CVO 做什么 | 不做什么 |
|------------|----------|
| 表达愿景与体验目标 | 当人肉任务路由器 |
| 关键门禁决策（设计、优先级、冲突） | 替模型写每一行实现细节 |
| 用反馈塑造团队文化 | 当「唯一会用 CLI 的人」 |
| 共创 / 陪伴 / 语音在场 | 必须是专业程序员才可用 |

**CVO Bootcamp**：引导式 onboarding，走完完整 feature 生命周期（愿景 → 上线）。

### 1.5 哲学：Hard Rails + Soft Power

| 概念 | 含义 |
|------|------|
| **Hard Rails** | 法律/安全底线：铁律、端口隔离、配置只读、数据不删 |
| **Soft Power** | 底线之上的文化：自协调、互审、自进化、@mention 传球 |

五条第一性原理（P1–P5）：面向终态 · 共创非木偶 · 方向>速度 · 单一真相源 · 可验证才算完成。

---

## 2. 架构总览

### 2.1 三层原则

```txt
┌────────────────────────────────────────┐
│  你（CVO）愿景 · 决策 · 反馈             │
└──────────────────┬─────────────────────┘
                   │
┌──────────────────▼─────────────────────┐
│  Clowder 平台层                         │
│  身份 · A2A · Skills · Memory · SOP    │
│  MCP Callback Bridge · Mission Hub      │
└────┬──────────┬──────────┬─────────┬───┘
     │          │          │         │
  Claude    GPT/Codex   Gemini    opencode
  (CLI)      (CLI)      (CLI/…)    (CLI)
```

| 层 | 负责 | 不负责 |
|----|------|--------|
| **模型** | 推理、生成 | 长期记忆、纪律 |
| **Agent CLI** | 工具、文件、命令 | 团队协作、跨角色 review |
| **平台 (Clowder)** | 身份、路由、SOP、审计、记忆 | 推理本身 |

> *模型给能力上限，平台给行为下限。* 层与层是**乘数**，不是加法。

### 2.2 Monorepo 布局

| 路径 | 角色 |
|------|------|
| **`packages/api`** | `@cat-cafe/api` — Fastify 后端（编排内核） |
| **`packages/web`** | Next.js 前端（Chat / Hub / Mission Hub） |
| **`packages/shared`** | 类型、schemas、registry、command parser 等 |
| **`packages/mcp-server`** | MCP 工具服务（含 callback bridge 能力） |
| **`packages/finance`** | 费用 / 配额相关 |
| **`cat-cafe-skills/`** | 一等 skill 库（feat-lifecycle、quality-gate、merge-gate…） |
| **`assets/prompt-hooks` + `prompt-templates`** | 会话注入片段（身份、路由、铁律、SOP 阶段…） |
| **`sop-definitions/`** | SOP 机器真相源（如 `development.yaml`） |
| **`desktop/`** | Electron 桌面安装包宿主（Node+Redis 捆绑叙事） |
| **`scripts/`** | start/runtime worktree、Redis、sync 开源、门禁 |
| **`docs/`** | SOP、VISION、features、architecture、TIPS |

`pnpm-workspace.yaml`：`packages/*`。根脚本仍大量使用 `cat-cafe` / `CAT_CAFE_*` 历史命名。

### 2.3 运行时拓扑

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| Frontend (Next) | **3003** | Web UI |
| API (Fastify) | **3004** | 业务 + WebSocket |
| Redis | **6399** | 线程/消息/任务/状态；`--memory` 可跳过 |
| MCP Server | **3011** | 工具暴露给 agent CLI |
| ASR / TTS / embed | 9876 / 9879 / 9880 | 可选语音与语义检索 |

**Runtime worktree 架构（重要）：**

```txt
your-projects/
├── clowder-ai/           # 开发/检出
└── cat-cafe-runtime/     # pnpm start 自动创建，跟踪 origin/main
```

- `pnpm start`：init → sync main → build → Redis + API + Frontend（**会拉最新**）  
- `pnpm start:direct`：当前检出直接跑（**不自动更新**，适合钉 release）  
- Alpha worktree：`3011/3012` 隔离验收通道，不干扰 runtime  

数据默认落 `~/.cat-cafe/`（Redis dump、embed venv、daemon.pid 等）。

### 2.4 API 包内部切分（`packages/api/src`）

从目录可见的主干：

```txt
agent-hooks / config / domains / infrastructure
marketplace / mcp / plugins / routes / services
skill-security / skills / types / utils
```

`@cat-cafe/shared` 提供：`registry`、`schemas`、`command-parser`、`dossier`、`concierge`、`capability-tips` 等跨端契约。

---

## 3. 核心能力拆解

### 3.1 Multi-Agent Orchestration & A2A

| 机制 | 含义 |
|------|------|
| **@mention 路由** | `@opus` / `@codex` / `@gemini` 等到指定猫 |
| **Thread 隔离** | 一 feature 一线程，上下文不串味 |
| **串行 / 并行 / solo 模式** | prompt hook `d7-mode-*`、`r1/r2` 路由组装 |
| **球权 / handoff** | `a2a-ball-check`、handoff decision tree、乒乓警告 |
| **Rich blocks** | diff、清单、交互决策卡片（非纯文本墙） |

Agent 适配表（README）：

| CLI | 输出 | MCP | 状态 |
|-----|------|-----|------|
| Claude Code | stream-json | Yes | Shipped |
| Codex CLI | json | Yes | Shipped |
| Antigravity CLI | plain text | CLI-managed | **非 ACP Gemini 默认** |
| Gemini CLI | stream-json / ACP | Yes | ACP 配置时；否则 fallback |
| Antigravity Desktop | cdp-bridge | Callback | Legacy opt-in |
| opencode | ndjson | Yes | Shipped |

背景：Google consumer Gemini CLI 个人请求在 **2026-06-18** 停止服务 → 平台把默认 Gemini 路径切到 Antigravity。

### 3.2 Persistent Identity（抗压缩）

每次会话通过 **prompt hooks / templates** 注入：

- 身份锚定 `d1` / `s1`  
- 队友花名册 `s5` / `d6`  
- 铁律 `l4`  
- 协作哲学 `l7`、护栏 `s10`  
- MCP 工具索引 `l5`  

目标：上下文被压缩后，角色、签名、边界**仍可恢复**——这是「团队」相对「无状态子 agent」的关键差异。

### 3.3 Cross-Model Review

硬规则（SOP + 铁律扩展）：

- **同一 catId 不能 review 自己的代码**  
- **跨 family 优先**（Claude 写 → GPT 审）  
- 发现必须带严重度 P1 / P2 / P3  
- 共享 GitHub 账号 `zts212653` 时，「个体」按 **catId** 判定，不按 GitHub login  

### 3.4 Shared Memory & Evidence

- 每项目 **SQLite `evidence.sqlite` + FTS5**（本地）  
- MCP：`search_evidence`、`reflect` 等  
- 可选 **Embedding sidecar**（MLX / sentence-transformers，`EMBED_MODE`）  
- 证据、教训、决策日志构成「机构记忆」  

与 OpenHuman Memory Tree 对比：Clowder 更偏 **团队协作记忆与证据门禁**，不是个人全生活 Wiki。

### 3.5 Skills Framework

`cat-cafe-skills/` 体量大，典型一等 skill：

| 类别 | 示例 |
|------|------|
| 生命周期 | `feat-lifecycle`、`merge-gate`、`quality-gate` |
| 协作 | `cross-cat-handoff`、`receive-handoff-grounding`、`collaborative-thinking` |
| 工程 | `debugging`、`tdd` 相关 refs、`code-as-harness` |
| 体验 | `bootcamp-guide`、`hyperfocus-brake`（防沉迷式钩子） |
| 研究 | `deep-research`、`open-source-teardown` |

Skills **按需加载**；manifest 有 CI 检查（`check:skills:manifest` / surfaces）。

### 3.6 MCP Integration + Callback Bridge

- 标准 MCP 给 Claude 等原生支持方  
- **Callback Bridge**：让非 Claude 模型也能走统一工具/回调语义（跨 CLI 工具共享的关键工程）  
- `pnpm mcp:doctor` 诊断就绪态  

### 3.7 SOP Auto-Guardian（协作纪律）

`docs/SOP.md` + `sop-definitions/development.yaml` 机器源：

```txt
⓪ Design Gate → ① impl (plan/worktree/TDD) → ② quality-gate
→ ②½ fresh-context-review（可选）→ ③ peer review 循环
→ ④ merge-gate → ⑤ 愿景守护 → close
```

要点：

- **愿景驱动**：没达成愿景 ≠ 完成；禁止半路问「要不要继续」  
- **大 feature 分 Phase 碰头**（方向确认，不是流程确认）  
- Runtime 单实例保护：禁止猫擅自 `pnpm start` 重启线上 runtime  
- Artifact-only PR 九条硬条件（证据归档 PR 猫自 merge）  

### 3.8 Mission Hub / Need Audit / Bulletin

- Feature 生命周期：idea → spec → in-progress → review → done  
- **Need Audit**：粘贴 PRD → 意图卡、风险检测（空洞动词、缺 actor、AI 编造具体性）、切片计划  
- **Bulletin Board**：谁持球、什么阶段、什么阻塞  

### 3.9 多平台与周边体验

| 能力 | 状态 |
|------|------|
| 飞书 (Lark) | Shipped |
| Telegram | In Progress |
| 企业微信 env | 有配置面 |
| GitHub PR Review IMAP 路由 | Shipped（注册 / 标题标签 / triage） |
| Voice Companion（每猫声线） | Shipped（ASR/TTS 可选本地服务） |
| Signals 研究流 + 播客 | Shipped |
| 狼人杀 / 像素猫 | 游戏既是产品又是 A2A 压力测试 |
| 桌面安装包 Win/macOS | 有 release 流水线；Linux 源码/脚本 |

---

## 4. 四条铁律（Hard Rails 产品化）

双重执行：**prompt（l4）+ 代码/策略**。

| # | 铁律 | 工程含义 |
|---|------|----------|
| 1 | 不删自己的数据库 | Redis/SQLite/证据库是记忆不是垃圾 |
| 2 | 不杀父进程 | 存在基础；禁止乱 kill 宿主 |
| 3 | 运行时配置只读 | 改 config 需人类；敏感 env 写需 owner |
| 4 | 不碰彼此的端口 | 服务边界；多猫/多 worktree 端口偏移 |

扩展纪律（模板层）：跨个体 review、验收通道隔离、用户数据默认 TTL=0 持久化等。

LAN 部署时：`API_SERVER_HOST=0.0.0.0` + `DEFAULT_OWNER_USER_ID` + 可选 `CORS_ALLOW_PRIVATE_NETWORK`——特权写有显式护栏。

---

## 5. 工程实践与开源运维

### 5.1 质量门

根 `package.json` 的 `pnpm check` 极重：Biome、feature 真相源、SOP 定义、skills manifest、env-port/registry/example 漂移、start profile isolation、guides、ASCII-only scripts 等。另有：

- `pnpm gate` / pre-merge  
- `dependency-cruiser`  
- API `test` / `test:public` / Redis 隔离测试  
- Desktop CI：Windows / macOS 构建与 smoke  

### 5.2 内部 Cat Cafe ↔ 公开 Clowder 同步

文档显示 **双仓运维** 心智：

- 内部生产仓（文档称 `cat-cafe`）高强度实战  
- 公开仓 `clowder-ai` 经 `sync-to-opensource`、temp target public gate、release provenance 三点映射  
- Hotfix lane：worktree → `sync-hotfix.sh` → 公开 PR → cherry-pick 回内部  
- Full sync 禁止把真实公开仓当第一轮验收场  

这解释了：为何公开仓仍带 `cat-cafe` 包名、daemon 日志名、runtime 目录名，同时 README 全面品牌化为 Clowder。

### 5.3 启动体验分层

| 用户 | 路径 |
|------|------|
| 普通用户 | Releases 桌面安装包 → UI 配账号 |
| Linux / 开发者 | `scripts/install.sh` 或 `pnpm install && build && start` |
| 钉版本 | `git checkout vX.Y.Z && pnpm start:direct` |

---

## 6. 与同类项目对比（本 monorepo 语境）

| 维度 | **Clowder AI** | **ClawTeam** | **OpenHuman** | **Deep Agents** |
|------|----------------|--------------|---------------|-----------------|
| 层次 | L4 协作平台 | L2 swarm CLI 协调 | L1–L3 个人 Super-Assistant | L1 opinionated harness |
| 是否替代 CLI | 否，**之上** | 否，spawn 外部 CLI | 自有 harness 为主 | LangGraph 上 harness |
| 身份 | 强（猫人格 + 模板） | 弱（agent name） | 用户个人记忆 | 无团队人格 |
| 记忆 | 团队 evidence / lessons | 任务板/inbox 文件 | Memory Tree + Wiki | 中间件级 |
| SOP / 门禁 | 一等公民 | 弱 | 审批/隐私轴 | 中间件 |
| 人设角色 | **CVO** | 观察者 | 用户本人 | 开发者 |
| 许可 | MIT | MIT | GPL-3.0 | MIT |
| 默认数据 | Redis (+SQLite evidence) | `~/.clawteam` 文件 | SQLite/本地 vault | 调用方状态 |
| 体量 | 产品级 monorepo | 轻量 CLI 库 | 巨型 Rust+Tauri | SDK monorepo |

**选用建议：**

- 要 **多模型团队 + 产品 UI + 流程纪律** → Clowder  
- 要 **同仓多 worktree 编码 swarm、agent 自己 spawn** → ClawTeam  
- 要 **个人全生活大脑 + 桌面本地优先** → OpenHuman  
- 要 **可编程 agent 运行时库** → Deep Agents / LangGraph  

三者可叠加：Clowder 做「团队与人类体验」，ClawTeam 做「进程级并行编码」，OpenHuman 做「个人记忆 OS」——职责不同。

### 设计模式映射（Agent Design Patterns 视角）

| Clowder 机制 | 近似坐标 |
|--------------|----------|
| @mention + 串/并行模式 | Hierarchical Delegation / Fan-Out / Route |
| 跨模型 review | Adversarial Review + Generator-Critic |
| SOP stages + merge-gate | Plan-and-Execute + Approval Gate |
| Evidence / reflect | Failure Journals + Progress Tracking 的协作版 |
| 铁律 + 端口边界 | Blast Radius / Guardrail 的「社会契约」版 |
| Skills on-demand | Skill Package |
| Mission Hub | Observability + Composition |

---

## 7. 优势、局限与风险

### 7.1 优势

1. **正确的平台层抽象**：不重造 Claude Code，做团队 OS——与 ClawTeam「协调 CLI」、OpenHuman「个人 harness」形成清晰分层。  
2. **从生产提炼**：Cat Cafe 实战 → 开源；SOP/技能/铁律有证据链。  
3. **人格化但不空心**：身份注入 + review 铁律 + Mission Hub，把「软文化」做成可执行协议。  
4. **跨模型一等公民**：Adapter 矩阵覆盖主流 coding CLI，含 MCP 回调桥。  
5. **体验完整**：Chat / Hub / Mission / 飞书 / 语音 / Signals / Bootcamp / 游戏。  
6. **工程纪律极强**：check 脚本矩阵、SOP 机器源、双仓 sync 门禁、runtime/alpha 隔离。  
7. **MIT + 商标分离**：代码宽松，品牌受 TRADEMARKS 保护。  

### 7.2 局限

1. **复杂度与运维负担**：Redis、多端口、runtime worktree、可选 ASR/TTS/embed——非「单二进制」。  
2. **命名双轨**：`cat-cafe` / Clowder / `~/.cat-cafe` 并存，新贡献者认知税高。  
3. **公开仓与内部仓耦合**：完整「源仓真相」在同步管线外；外部贡献者不易复现全部内部流程。  
4. **`pnpm start` 默认追 main**：不了解 `start:direct` 的用户可能被自动更新打断稳定性。  
5. **依赖外部 CLI 订阅/API**：平台再强，没有 Claude/Codex/Gemini 账号仍「无爪」。  
6. **Issue 面大**（~237 open）：功能面广带来维护压力。  
7. **游戏/陪伴叙事**：对纯工程买家可能显得「不严肃」——实则 A2A 压测，但需产品沟通。  
8. **Telegram 等仍进行中**：多平台能力不均。  

### 7.3 风险

| 风险 | 缓解 |
|------|------|
| 多 agent 烧 token | Quota Board、路由策略、模型档位 |
| LAN 暴露 API | 默认 bind 127.0.0.1；owner id；CORS 私网 opt-in |
| Agent 改配置/杀进程 | 铁律 + 代码约束 + 敏感写 403 |
| 共享 GitHub 账号 review 语义混乱 | 以 catId 为准 + SOP 澄清 |
| 数据丢失 | Redis 备份脚本、默认 TTL=0、export threads |

---

## 8. 快速上手

```bash
# 源码路径
git clone https://github.com/zts212653/clowder-ai.git
cd clowder-ai
pnpm install && pnpm build
cp .env.example .env
pnpm start                 # 或 pnpm start --memory / pnpm start:direct

# UI
open http://localhost:3003
# Hub → 系统配置 → 账号配置：绑定 Claude/GPT/Gemini/Kimi/GLM/MiniMax…
```

桌面：Releases 的 `.exe` / `.dmg`。  
完整配置：`SETUP.md` / `SETUP.zh-CN.md`。  
教程仓：https://github.com/zts212653/cat-cafe-tutorials  

---

## 9. 路线图摘要（README）

| 域 | 已发 | 进行中 / 规划 |
|----|------|----------------|
| 核心 | 编排、身份、A2A、互审、Skills、记忆、MCP 桥、SOP、自进化 | — |
| 集成 | 飞书、GitHub PR 路由、opencode | Telegram、外部 A2A onboarding、Qwen Omni 感知 |
| 体验 | Hub、Bootcamp、语音 | 游戏模式深化 |
| 治理 | 多用户 OAuth Phase1、Mission Hub Phase2 | Cold-Start Verifier |

---

## 10. 总结

**Clowder AI = 给「多模型 Coding Agent」用的协作操作系统与 CVO 产品界面。**

- **平台层**提供身份、传球、记忆、SOP、审计  
- **执行层**仍是各家 Agent CLI  
- **人类层**被重新定义为愿景官而非路由器  

它与 ClawTeam（swarm 进程协调）、OpenHuman（个人本地超级助手）共同构成 2026 年 agent 栈的不同高度。若你的目标是 **一支有性格、有纪律、可跨模型互审的 AI 开发团队 + 人类共创体验**，Clowder 是当前开源侧最完整的参考实现之一；若目标是极简 CLI 或单人本地大脑，应选更薄/更偏个人的栈。

---

## 11. 关键链接

| 资源 | URL |
|------|-----|
| GitHub | https://github.com/zts212653/clowder-ai |
| Releases | https://github.com/zts212653/clowder-ai/releases |
| 中文 README | https://github.com/zts212653/clowder-ai/blob/main/README.zh-CN.md |
| SETUP | https://github.com/zts212653/clowder-ai/blob/main/SETUP.md |
| Tutorials | https://github.com/zts212653/cat-cafe-tutorials |
| docs/ | https://github.com/zts212653/clowder-ai/tree/main/docs |

---

*本分析基于公开仓库 README（EN/ZH）、SETUP、AGENTS.md、docs/SOP.md、docs/VISION.md、package.json、pnpm-workspace、.env.example、cat-template.json、packages 目录盘点与 release 元数据；未完整审计全部 skill 与 API 测试套件。历史本地文档 `references/clowder-ai` 与本公开仓同源（Cat Cafe → Clowder），本文件以 GitHub `zts212653/clowder-ai` 为准更新。*
