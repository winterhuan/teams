# OpenHuman 项目深度分析

> 分析对象：[`tinyhumansai/openhuman`](https://github.com/tinyhumansai/openhuman)  
> 核心版本：`0.58.14`（根 `Cargo.toml`）；GitHub Latest Release：**v0.58.7**（2026-06-30）  
> 组织 / 产品：tinyhumansai · [tinyhumans.ai/openhuman](https://tinyhumans.ai/openhuman)  
> 许可证：**GPL-3.0**（强 copyleft）  
> 仓库状态：约 **34.6k★ / 3.4k forks**，创建于 2026-02-18，活跃推送至 2026-07；~183 open issues；~3.6k commits  
> 成熟度：**Early Beta**（README 自标）  
> 分析日期：2026-07-10

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**OpenHuman 是面向「个人」的本地优先 AI Super-Assistant：用持久记忆大脑 + 可检查点的多 Agent 图编排 + 深度研究/行动工具栈，把「聊天机器人」做成能持续认识你、替你办事、可被看见的工作流的桌面 harness。**

README 三件套：

| 支柱 | 产品表述 |
|------|----------|
| **🧠 Brain** | 本地 Memory Tree + Obsidian 风格 Wiki；Auto-fetch 把邮箱/日历/仓库等压成可编辑 Markdown 记忆 |
| **🕸️ Orchestrator** | tinyagents 图执行 + tinyflows 可视化工作流 + 子代理舰队 + Signal 协议 A2A（tiny.place） |
| **🔬 Researcher & Doer** | SuperContext 预检索、浏览器/语音/媒体生成、会议 Agent、多消息通道 |

自我定位（非 AGI，但）：

> *OpenHuman is not AGI. But it is a meaningful architectural step closer, with better memory, better orchestration, and better tooling.*

### 1.2 核心哲学

| 原则 | 含义 |
|------|------|
| **Human-in-the-loop 默认** | UI 优先、审批门、可视化 workflow 画布；不是「终端里让模型全自动」 |
| **Local-first 记忆** | 数据与压缩记忆落盘本机（SQLite + Markdown vault）；拒绝「只有向量黑盒」叙事 |
| **Orchestrator ≠ Chat loop** | 图 + checkpoint + 子代理 + 工作流，而不是单会话 tool loop |
| **规则在 Rust 核心** | 业务逻辑、安全、隐私模式、工具执行以 `openhuman-core` 为准；React 只呈现与编排 UX |
| **成本可控** | TokenJuice 工具输出压缩、模型路由、burst 廉价 worker 层、逐 call 计费/回放 |
| **一站式订阅叙事** | 对比 BYOK 多厂商：产品侧强调 one sub + 内建路由（云仍存在；Privacy Mode 可切断） |

### 1.3 解决什么「冷启动」问题

相对 Claude Code / OpenClaw / Hermes 等「会用工具的编码/代理」：

- **Hermes**：靠观察使用自学，需要时间  
- **OpenClaw**：依赖插件把上下文运进来  
- **OpenHuman**：OAuth 连接 + **20 分钟 Auto-fetch** + Memory Tree 压缩 → **一次同步后即有 inbox/calendar/repos/docs 的压缩全景**

灵感显式对齐 Karpathy「LLM Knowledgebase / Obsidian wiki」方向（可读、可编辑的知识库，而非纯向量 RAG）。

### 1.4 与本 `analysis/` 项目对照

| 项目 | 层次 | 关系 |
|------|------|------|
| **Deep Agents / Pi** | L1 单 Agent harness | OpenHuman 内建更完整的「个人 OS」；可把外部 CLI Agent 当 A2A 对端 |
| **ClawTeam** | L2 多 CLI swarm 协调（worktree/tmux） | ClawTeam 协调外部 coding CLI；OpenHuman 是**自有 harness + 记忆 + UI 产品** |
| **Clowder** | L4 多 Agent 协作平台 | Clowder 偏团队/身份/SOP；OpenHuman 偏**个人超级助手 + 桌面** |
| **LangGraph** | 图运行时库 | OpenHuman 用自研 **tinyagents**（LangGraph 风格图 + harness），非直接依赖 LangGraph |
| **Agent Design Patterns** | 设计词汇 | Memory Tree / Guardrail / Fan-out / Hierarchical Delegation / Approval 等均有产品实现 |

---

## 2. 整体架构

### 2.1 运行时拓扑

```txt
┌─────────────────────────────────────────────┐
│  React 前端 (Vite · Redux · HashRouter)     │
│  Socket / MCP client · ChatRuntime · UI     │
└──────────────────┬──────────────────────────┘
                   │ Tauri IPC (core_rpc_relay, windows, …)
┌──────────────────▼──────────────────────────┐
│  Tauri v2 Shell (app/src-tauri)             │
│  CEF/WebView · CDP · 会议/屏幕 · 嵌入 Core  │
│  CoreProcessHandle：in-process tokio 任务   │
└──────────────────┬──────────────────────────┘
                   │ HTTP JSON-RPC 127.0.0.1:<port>/rpc
                   │ (启动时 in-memory bearer；CLI 可用 OPENHUMAN_CORE_TOKEN)
┌──────────────────▼──────────────────────────┐
│  openhuman-core (Rust)                      │
│  agent harness (tinyagents) · memory        │
│  tools · channels · security · workflows    │
│  SQLite · OS keyring · Whisper · …          │
└─────────────────────────────────────────────┘
```

**关键演进：** sidecar 进程已移除（PR #1061）；Core **进程内嵌**在 Tauri 宿主，降低 IPC/生命周期复杂度。

### 2.2 仓库布局（Monorepo）

| 路径 | 角色 |
|------|------|
| **`app/`** | `openhuman-app`：Vite + React UI、Vitest、Playwright/WDIO E2E、`src-tauri` 桌面壳 |
| **根 `src/`** | `openhuman_core` lib + `openhuman-core` CLI；`src/core/` 传输层，`src/openhuman/*` 领域 |
| **`vendor/`** | git submodule：tinyagents / tinyflows / tinycortex / tinyjuice / tinychannels / tinyplace |
| **`app/src-tauri/vendor/tauri-cef`** | 定制 CEF 的 Tauri CLI（官方 CLI 打包 Chromium 路径不完整） |
| **`gitbooks/`** | 公共文档源（GitBook） |
| **`docs/`** | 更深的内部计划/范围文档 |
| **`packages/`** | 发行包（deb/homebrew/arch/npm）、iOS PTT 插件 |
| **`scripts/`** | CI、mock API、debug、release、agent-batch 等 |

规模量级：全仓约 **5300+ blob**；Rust 领域目录 **130+** 个 `src/openhuman/<domain>`；语言占比约 **Rust 60% / TypeScript 37%**。

### 2.3 技术栈摘要

| 层 | 技术 |
|----|------|
| UI | React 19、TypeScript、Redux Toolkit + Persist、Tailwind、Vite 7 |
| 桌面 | Tauri v2 + **vendored CEF** |
| 核心 | Rust 2021、Tokio、rusqlite 0.40 bundled、axum JSON-RPC、tracing/Sentry/OTel |
| 图/Agent | **tinyagents** 1.7（sqlite + repl） |
| 工作流 | **tinyflows** 0.5 |
| 记忆引擎 | **tinycortex** 0.1（经 adapter seam） |
| 压缩 | **tinyjuice**（TokenJuice） |
| 通道 | **tinychannels**（含 WhatsApp Web 等 feature） |
| A2A 经济 | **tinyplace** SDK + x402 USDC |
| 语音 | whisper-rs（macOS Metal）、Piper TTS |
| 安全 | OS keyring、AES-GCM、Argon2、Landlock/AppContainer/bwrap 等沙箱后端 |

### 2.4 官方 SDK 家族（可组合生态）

OpenHuman 刻意把「引擎」拆成可发布 crate，再 **submodule + path patch** 到本仓：

```txt
tinyagents   → 图 + AgentHarness 循环 + Rhai REPL
tinyflows    → 可视化/可验证工作流图
tinycortex   → 记忆树/分块/检索核心
tinyjuice    → TokenJuice 压缩
tinychannels → 消息通道适配
tinyplace    → Agent 社交网络 / Signal-E2E A2A / bounty
```

Host 侧 adapter 约定：引擎逻辑进 crate；**RPC、安全门闩、计费、单例、产品控制器** 留在 `openhuman`。

---

## 3. 三大支柱深度拆解

### 3.1 Brain：Memory Tree + Obsidian Wiki

**形态：** 不是「只存 embedding 的黑盒」，而是：

1. 多源数据（邮件、聊天、文档、集成）→ 叶子写入  
2. **bucket-seal 级联**：L0 桶满 → LLM 摘要成 L1 → 再向上  
3. 打分 / 嵌入 / 实体抽取异步进行  
4. 镜像为 **可打开编辑的 Markdown vault**（Obsidian 友好）  
5. Agent 通过 `walk` / `drill_down` / `fetch_leaves` / `query_source` / `search_entities` 读取  

架构分层（文档）：

```txt
memory (orchestrator) → memory_tree (generic mechanics) → memory_store::trees (SQLite)
```

**产品节奏：** Auto-fetch 约 **每 20 分钟** 拉取连接账户，持续喂脑。

**可选后端：** `memory.backend = "agentmemory"` 可代理到 [agentmemory](https://github.com/rohitg00/agentmemory)，与 Claude Code / Cursor / Codex / OpenCode 共享记忆存储。

**演进：** 曾有 Global/Topic 树，已删除，改为 Source 树 + 实体索引遍历。

### 3.2 Orchestrator：图、舰队、工作流、分裂脑

#### (1) Graphs, not loops

- 每轮对话经 **tinyagents AgentHarness**（issue #4249 完成迁移，自研 turn loop 已移除）  
- 多 Agent 编排用 **StateGraph**：delegation `plan → execute ⇄ review → finalize`、workflow phase DAG、map-reduce fan-out、agent-teams 条件路由  
- **Checkpoint / resume**：中断、审批、进程重启可从检查点继续  
- 可回放 **run journal** + 逐 call 成本  

#### (2) Sub-agent fleets

- 内置大量 archetype（orchestrator / planner / researcher / code_executor / critic / archivist / integrations_agent / morning_briefing / …）  
- 用户可用 workspace TOML 覆盖/扩展  
- **层级：** Chat → Reasoning → Worker；`MAX_SPAWN_DEPTH = 3`  
- 兼容 worker **复用**（idle 注入新任务 vs 新开 session）  
- 卡住：no-progress breaker → Nudge → Halt + root-cause；子代理可 `AwaitingUser` checkpoint  

#### (3) Visual workflows（tinyflows）

- 用户自然语言描述自动化 → Agent **提案** typed graph  
- 用户在 **canvas 上审阅保存**  
- 触发：schedule / webhook / channel；副作用 **approval-gated**；可 dry-run（mock capabilities）  

#### (4) Split brain + Subconscious

- **Reflex**：快速分流入站流量  
- **Reasoning core**：重任务 + 委派 worker  
- **Subconscious**：后台循环 diff 世界状态、推进 goals、写 morning briefing；你停止输入后仍思考  

#### (5) tiny.place / A2A

- Signal 协议 E2E 会话；密钥设备侧、不落盘叙事  
- 可指挥 Claude Code / Codex / OpenClaw / Hermes 等「能持会话」的外部 Agent  
- x402 USDC bounties / 交易（agent economy）  

### 3.3 Researcher & Doer：工具与通道

| 能力 | 说明 |
|------|------|
| **SuperContext** | 用户消息前，scout 先扫记忆/文件，减少冷启动 |
| 搜索 / 爬虫 / 编码工具集 | 原生工具族 |
| Browser & computer | CDP / 浏览器控制（含 CEF 配方） |
| Voice | 进程内 Whisper STT + Piper TTS |
| Media gen | Seedream/SeedEdit、Seedance/Veo 等（订阅叙事） |
| Meeting agents | Meet / Zoom / Teams / Webex：日历自动加入、实时转写、发言、摘要与 action items |
| Channels | 宣称 **17** 条（Telegram、Discord、Slack、WhatsApp、Signal、iMessage…）+ **原生 email**（IMAP IDLE + SMTP） |
| Integrations | 宣称 **100+ OAuth · 5k+ MCP · 90k+ Skills**（产品营销数字，以实际连接器与目录为准） |

---

## 4. Agent Harness 运行时（工程内核）

### 4.1 单轮生命周期

```txt
inbound (chat / channel / webhook / cron)
  → (外部触发) trigger triage: drop | notify | reactor | orchestrator
  → Agent::turn
       resume transcript
       system prompt (仅首轮，保护 KV-cache)
       inject memory
       tinyagents tool loop (middleware 栈)
       final text
  → async post-turn: archivist · learning · cost · episodic index
```

### 4.2 Middleware 栈（OpenHuman 横切）

Approval/Security · ToolPolicy · CLI/RPC-only denial · Arg recovery · Cost budget · Repeated-tool-failure breaker · Context trim / TokenJuice · Stop hooks（预算/迭代/目标）

### 4.3 TokenJuice

工具输出按类型（JSON/code/log/search/diff/HTML/text）**内容感知压缩**，宣称最高约 **80% token 节省**；有损压缩经 CCR 哈希可 `tokenjuice_retrieve` 取回原文。编码向 agent 可 `light` 模式避免丢 build/diff 细节。

### 4.4 Rhai language workflows

固定 graph 表达不了的 ad-hoc 控制流：orchestrator 通过 `rhai_workflows` 写/跑 `.ragsh` 单元；能力只经 `tool_call` / `agent_query` 等桥；审批门在 bridge 重放；受 autonomy 与超时硬顶约束。方向是 **RLM / CodeAct 式「模型写编排程序」**。

### 4.5 模型路由

Workload 路由：`chat` / `reasoning` / `agentic` / `coding` / **`burst`** / `summarization` / `vision` 等；burst 服务 SuperContext 类低上下文高扇出。支持托管云 + BYO + **Local AI**（Ollama / LM Studio / MLX）。

---

## 5. 安全、隐私与自治

### 5.1 双轴模型

| 轴 | 控制什么 | 机制 |
|----|----------|------|
| **Privacy Mode** | 推理是否出机 | `standard` / **`local_only`** / `sensitive`(预留)；**在 provider factory 拒绝构造云 provider**，非靠 prompt |
| **Autonomy** | Agent 能做什么 | `readonly` / `supervised` / `full` × workspace_only × trusted_roots × allow_tool_install |

### 5.2 路径与命令

- **`action_dir`**：Agent 可读写的项目根（默认 `~/OpenHuman/projects`）  
- **`workspace_dir`**：内部状态（`~/.openhuman/users/<id>/workspace`）— **工具禁止写**，fail-closed  
- 命令分类：Read / Write / Network / Install / Destructive → Allow / Prompt / Block  
- **Approval gate 默认开**（`OPENHUMAN_APPROVAL_GATE=0` 可关）；交互轮阻塞等用户确认  

### 5.3 沙箱与密钥

- 沙箱后端：Docker / Bubblewrap / Firejail / Landlock / Windows AppContainer / Noop  
- 凭据：OS Keyring；记忆 AES-256-GCM + Argon2id  
- Prompt injection：规范化打分 allow/review/block  

### 5.4 产品对标（README 表，需自行验证时效）

相对 Claude Cowork / OpenClaw / Hermes：OpenHuman 强调 UI 易用、记忆与 auto-fetch、图编排与 workflow、会议、多通道、一键 Privacy Mode、可回放 journal。

**注意：** 表中写 OpenHuman 许可证为 “GNU”，仓库确认为 **GPL-3.0**——对闭源二次分发约束远强于 MIT。

---

## 6. 前端与桌面壳

### 6.1 前端

- Provider 链：Sentry → Redux → PersistGate → BootCheck → CoreState → Socket → ChatRuntime → HashRouter…  
- 路由：`/home` `/chat` `/skills` `/channels` `/settings/*` 等（无独立 `/agents` 历史路由）  
- 规则：**无动态 import**（生产路径）；i18n 多语言强制（`pnpm i18n:check`）  
- 吉祥物：Rive mascot，会说话、反应、会议出场  

### 6.2 Tauri 壳职责

薄宿主：core 生命周期、RPC relay、CEF 预检、屏幕/会议、webview 账号 recipes（Gmail/Slack/Meet/Zoom…）、深链。

**CEF 约束：** 禁止新增 webview JS injection；行为进 CEF handler / CDP / Rust IPC。打包必须用 **vendored tauri-cli**，否则 Chromium 捆绑错误。

### 6.3 平台支持

| 目标 | 状态 |
|------|------|
| Windows / macOS / Linux 桌面 | **正式出货**（dmg/msi/AppImage/deb 等） |
| iOS companion | **实验**：无设备上 core；LAN/Tunnel/Cloud 连桌面 core；PTT 插件 |
| Android / 独立 Web | 仓库有路径，文档称 **非产品就绪** |

---

## 7. 工程实践与质量门

| 项 | 内容 |
|----|------|
| 包管理 | pnpm 10.10 · Node 24+ · Rust 1.93（文档要求） |
| 测试 | Vitest · cargo test · mock API · Playwright · WDIO 桌面 E2E（Linux tauri-driver / macOS Appium） |
| 覆盖率 | PR **变更行 ≥ 80%**（diff-cover：Vitest + llvm-cov） |
| CI 双车道 | **CI Lite**（main / 变更聚焦）· **CI Full**（release 分支全量） |
| 发布 | `release` 长线分支；staging/production workflow；版本回并 main |
| 文档 | `pnpm docs:generate/check` 防架构文档漂移 |
| Agent 协作 | 极厚 `AGENTS.md` / `CLAUDE.md`、内置多 subagent 定义、debug/review/rabbit 脚本 |

领域模块规范：`mod.rs` 只做导出；`types` / `store` / `ops` / `schemas` / `tools` / `bus` 分层；RPC 经 controller registry。

---

## 8. 商业与社区信号

- 启动后宣称 **GitHub 连续 9 天 #1 Trending**  
- Product Hunt 徽章、Discord / Reddit / X  
- 贡献者 Hall of Fame、多语言 README  
- 产品路径：**安装器优先**（[INSTALL.md](https://github.com/tinyhumansai/openhuman/INSTALL.md) / 官网），源码构建门槛高（Rust + pnpm + CEF submodule + 平台依赖）  
- 存在 **billing / referral / rewards / wallet / web3** 等领域：个人助手与订阅经济、甚至链上能力交织  

---

## 9. 优势、局限与风险

### 9.1 优势

1. **产品完整度极高**：记忆 + 编排 + 通道 + 会议 + UI + 隐私开关，不是 demo harness。  
2. **记忆可解释**：Markdown 树 + vault，对齐「人可读知识库」趋势。  
3. **编排工程化**：tinyagents 图、checkpoint、journal、成本、breaker、子代理层级——接近生产级「不会静默死掉」的目标。  
4. **安全设计认真**：路径双根、命令分类、审批默认开、Privacy Mode **代码层阻断**云推理。  
5. **引擎模块化**：tiny* 家族可独立演进与复用。  
6. **Token 经济学**：TokenJuice + 路由 + burst，支撑「大记忆」可负担。  
7. **工程文化**：领域拆分、80% diff 覆盖、双 CI、文档生成检查——适合大规模协作。  

### 9.2 局限

1. **复杂度与维护成本**：130+ 领域、双 Cargo 世界（root core vs Tauri）、vendored CEF——贡献与自托管成本高。  
2. **Early Beta + 体量**：功能面广，边缘粗糙与文档/代码局部漂移（如 architecture.md 中历史段落与 skills 运行时叙述）不可避免。  
3. **GPL-3.0**：闭源产品吸收需谨慎；对比 OpenClaw/Hermes 的 MIT。  
4. **「一订阅」与开源自托管张力**：完整能力可能依赖其后端/计费/托管路由；纯本地需自己拼模型与集成。  
5. **营销数字**（5k MCP、90k Skills、17 channels）需当**上限叙事**，实际可用集合随配置与地区变化。  
6. **移动端未一等公民**：iOS 仅为 companion。  
7. **安全默认仍依赖用户**：`full` 自治 + 关审批 = 高风险；沙箱 opt-in 粒度需运维自觉。  
8. **会议/媒体/OAuth 生态**强绑定第三方服务与桌面环境，CI 难全覆盖。  

### 9.3 使用与集成风险

| 风险 | 说明 |
|------|------|
| 数据面 | 连接邮箱/聊天后记忆库含高度敏感 PII；需配合 Privacy Mode / 密钥链 / 备份策略 |
| 供应链 | 多 submodule + patch crates；构建需 `git submodule update --init --recursive` |
| 许可合规 | 分发修改版需 GPL 义务；与 MIT 组件混用时注意边界 |
| 与 ClawTeam 类工具重叠 | 都做多 Agent，但一层是产品 harness，一层是 CLI swarm OS——选型勿混 |

---

## 10. 设计模式映射（简表）

| OpenHuman 机制 | 近似模式坐标 |
|----------------|--------------|
| Memory Tree + SuperContext | Hierarchical Retention / Progressive Discovery / RAG Pipeline |
| TokenJuice | Semantic Compaction |
| Trigger triage + model routing | Complexity Routing |
| Delegation graph / agent-teams | Hierarchical Delegation + Plan-and-Execute |
| Map-reduce workers | Fan-Out/Gather |
| Approval gate + autonomy | Approval Gate / Guardrail Sandwich（程序化门闩） |
| Subconscious + goals | Progress Tracking + 后台 Loop |
| Workflow canvas | 可视化 Composition / Orchestrate |
| Failure handback + journals | 部分 Failure Journal + Observability Harness |
| tiny.place A2A | Collaboration 跨机扩展 |

---

## 11. 何时选用 OpenHuman

| 场景 | 建议 |
|------|------|
| 要「认识我」的个人桌面 AI（邮件/日历/知识库） | **强匹配** |
| 要可视化 durable 工作流 + 审批 | **强匹配** |
| 要严格本地推理、可证明不出网 | Privacy Mode + Local AI |
| 只要轻量多 CLI 并行写代码 | 更看 **ClawTeam / Claude Code teams** |
| 要嵌入闭源 SaaS 内核 | **GPL 与复杂度** 可能不合适；可关注 tinyagents 等独立 MIT/更宽松组件（需各自核验） |
| 要研究 Agent 编排与 harness 实现 | **极佳参考仓**（尤其 `tinyagents` seam 与 memory_tree） |

---

## 12. 快速入口

```bash
# 终端用户：官网或 GitHub Releases 安装包（推荐）
# https://tinyhumans.ai/openhuman
# https://github.com/tinyhumansai/openhuman/releases/latest

# 源码贡献（门槛高）
git clone --recurse-submodules https://github.com/tinyhumansai/openhuman.git
cd openhuman
pnpm install
pnpm dev              # 仅 Web UI
pnpm dev:app          # 完整桌面
cargo check -p openhuman --lib
```

文档：https://tinyhumans.gitbook.io/openhuman/  
架构：`gitbooks/developing/architecture.md` · Agent Harness · Memory Tree  

---

## 13. 总结

**OpenHuman 是 2026 年个人 Agent 赛道里少数把「记忆产品化 + 图编排生产化 + 桌面体验完整化」绑在同一仓库的巨型项目。**

- **产品层**：本地大脑、分裂脑编排、工作流画布、会议与全通道触达  
- **引擎层**：tinyagents / tinyflows / tinycortex / tinyjuice 组成可拆分栈  
- **工程层**：Rust 权威核心、React 呈现、严格安全与隐私 chokepoint、重 CI  

它不是「又一个 ReAct demo」，而是尝试成为 **个人级 AI 操作系统**；代价是 **GPL、构建复杂度与 beta 广度**。若你的 `teams` 语境要评估「个人 harness 天花板长什么样」，OpenHuman 是当前最值得对标的开源参考之一；若目标是团队编码 swarm 或薄控制面，应与 ClawTeam / Paseo / Deep Agents **分层组合**，而非互相替代。

---

## 14. 关键链接

| 资源 | URL |
|------|-----|
| GitHub | https://github.com/tinyhumansai/openhuman |
| 官网 | https://tinyhumans.ai/openhuman |
| Docs | https://tinyhumans.gitbook.io/openhuman/ |
| Release | https://github.com/tinyhumansai/openhuman/releases |
| tinyagents | https://github.com/tinyhumansai/tinyagents |
| tinyflows | https://github.com/tinyhumansai/tinyflows |
| tiny.place | https://tiny.place |
| 创建者 | [@senamakel](https://x.com/senamakel) |
| Discord | https://discord.tinyhumans.ai/ |

---

*本分析基于 README、AGENTS.md、根 Cargo.toml/package.json、gitbooks 架构与 harness/memory/orchestration/privacy 文档、submodule 列表、领域目录盘点与仓库元数据；未完整审阅全部 130+ 领域实现与全部 E2E 矩阵。部分 marketing 指标与历史文档段落可能与最新代码存在漂移。*
