# Dyad 项目深度分析

> 分析对象：[`dyad-sh/dyad`](https://github.com/dyad-sh/dyad)  
> 官网：https://dyad.sh  
> 维护方：**Dyad Tech / Will Chen**（`dyad-sh` org）  
> 许可证：**双轨** — 仓库主体 **Apache-2.0**；`src/pro/**` **FSL-1.1-ALv2**（fair source，未来转 ALv2）  
> 状态：活跃产品；Releases ~118；分析时点 **v1.6.2**（2026-07-09）/ `package.json` **1.7.0-beta.1**  
> 仓库：约 **20.9k★ / 2.5k forks**，推送至 2026-07-11  
> 语言：**TypeScript ~95%**（Electron + React + Vite）  
> 分析日期：2026-07-11  
> 一手材料：`PRODUCT.md` · `AGENTS.md` · `docs/{architecture,agent_architecture,security}.md` · `src/db/schema.ts` · `src/paths` · `src/prompts/system_prompt.ts` · `src/ipc/processors/response_processor.ts` · `rules/*` · GitHub API  

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**Dyad 是本机运行的「AI App Builder」：用户用自然语言描述应用，本地 LLM（BYOK / Ollama 等）生成并修改代码，右侧 iframe 实时预览 — 对位 Lovable / v0 / Bolt / Replit 类产品，但数据与预览默认留在本机。**

官方表述：

> *Local, open-source AI app builder for power users — v0 / Lovable / Replit / Bolt alternative.*

### 1.2 用户与成功标准（`PRODUCT.md`）

| | |
|--|--|
| **主用户** | 非技术 builder：有想法、没编码背景；常来自 Lovable/v0；**首小时**体验极关键 |
| **次用户** | 半技术 tinkerer：自带 API key、本地模型 |
| **成功** | 从打出想法 → **看到可运行预览**，决策/绕路/怀疑感最少 |
| **差异化** | Local-first（快、私、无锁） |
| **商业** | Dyad Pro 变现，但 **不得**让 free/BYOK 路径感觉二等 |

### 1.3 是 / 不是

| Dyad **是** | Dyad **不是** |
|-------------|---------------|
| 本机 **AI 建站/建 App 工作台**（生成+预览+部署） | 多 Agent 协作 OS / 工单调度（≠ Hearth / Symphony） |
| **App 为中心** 的 chat → apply → preview 闭环 | 通用 coding IDE 全能力（虽有 Monaco/终端） |
| Electron 单机产品 + 可选云服务（Engine / Pro） | 纯云端 builder |
| BYOK 多 LLM Provider + 本地模型 | 单一托管模型锁死 |
| 双轨许可（开源壳 + FSL 的 local agent 等 Pro 能力） | 完全无差别 OSS |

### 1.4 与 Hearth / Codeg 坐标

```text
Dyad     App builder：chat → 写码 → live preview → deploy
Codeg    多引擎 coding 工作台：会话聚合 + 委托
Symphony 工单 → 隔离 workspace 实现
Hearth   个人 Agent OS：Project + WorkItem 账本 + Team + Pulse
```

**Dyad 强在「意图保护 + 人审后落盘 + 预览闭环 + 版本快照」；弱在「组织层任务账本 / 多队 / 异步 CVO」。**  
Hearth 应从 **产品原则与 apply 门闩、版本/预览、plan 模式** 汲取，而非改成 builder 产品。

---

## 2. 系统架构

### 2.1 进程模型（Electron）

```text
Renderer (React + TanStack Router + Query + Jotai)
        │  IPC（类似 HTTP）
        ▼
Main (Node 特权：fs / git / spawn preview / SQLite)
        │
   apps on disk  ·  drizzle SQLite  ·  LLM providers  ·  workers
```

- **安全边界：** renderer 沙箱；写盘 / 网络 / git 只在 main。  
- **IPC 纪律：** 契约化 channel；React Query 碰 IPC 数据；错误用 `DyadError` / `DyadErrorKind` 过滤遥测。  
- **Workers：** 重计算（code-explorer、tsc 等）可下沉 `worker_threads` / utilityProcess，防 main OOM。

### 2.2 核心请求生命周期（经典 Build 路径）

文档 `docs/architecture.md`：

```text
1. 构造 LLM 请求
   = 用户 prompt + 系统提示 +（默认）整仓上下文 或 Smart Context 筛选
2. 流式响应 → UI
   DyadMarkdownParser 解析 <dyad-*> 标签，卡片化展示
3. 用户批准后
   response_processor 在 main 落盘：write / rename / delete / add-dependency / SQL …
4. Preview iframe 刷新
   用户感知「App 活了」
```

**关键设计选择：伪 tool-call（XML 标签）作为第一代 apply 协议**，理由：

1. 多工具并行；部分模型不支持并行 function call  
2. 强制 JSON 包裹代码可能降质量（Aider 证据链）  
3. 现已演进 **Local Agent**（Pro）走正式 tool calling + 多步循环  

### 2.3 为何「不那么 Agentic」（产品经济）

Dyad **刻意**限制复杂 agent 环：

- 昂贵：一次用户请求 → 底层几十次 LLM 调用很常见  
- 默认偏 **单轮生成 + 可选 Auto-fix TS**  
- 与 Cursor/Claude Code 的「搜-跑-修」形成 **成本/可控性** 权衡  

Hearth 对照：`loop_policy` + 预算门 + quiet 正是为 **可付的自主** 设界；Dyad 从另一侧验证了「无限 agentic 会烧钱」。

### 2.4 双轨：Build 模式 vs Local Agent（Pro）

| 模式 | 位置 | 机制 |
|------|------|------|
| **Build / Chat 流** | 开源主路径 | XML `<dyad-*>` + 人批 apply |
| **Local Agent** | `src/pro/.../local_agent`（**FSL**） | 标准 tool loop，`max steps`，`modifiesState` 过滤 |
| **Plan / Ask** | prompt + tool flags | 只读工具集；禁止写盘工具 |

工具示例（Pro tools 目录，节选）：  
`write` 类、`grep`、`explore_code`（+ **subagent**）、`code_search`、`execute_sql`、`execute_sandbox_script`、`add_dependency`、`exit_plan`、`generate_image`、MCP 桥接等。

---

## 3. 域模型（schema 一手）

### 3.1 核心表

| 表 | 含义 | Hearth 近似 |
|----|------|-------------|
| **apps** | 用户建的应用：path、gitHub、DB/deploy 绑定、preview 命令 | **Project**（更「产品应用」向） |
| **app_collections** | App 分组 | 可选 Project 标签/集合 |
| **chats** | 某 App 下的对话线程 | Session 线程 / 非 WorkItem |
| **messages** | user/assistant；**approvalState**；commit 锚定；aiMessagesJson | Timeline + Approval + Session 内容 |
| **versions** | App 在某 **commitHash** 的快照 + note/favorite | Artifact/版本时间线 |
| **language_model_providers / language_models** | BYOK 模型注册 | **Provider** 注册表 |
| **mcp_servers / mcp_tool_consents** | MCP + **工具级同意** | Member tools + L0 同意矩阵 |
| **prompts** | 可复用提示 | 配方/Automation 片段 |
| **custom_themes** | 设计系统主题 | 非 OS 核心 |

### 3.2 App 字段（产品集成面）

```text
apps {
  name, path,
  githubOrg/Repo/Branch,
  supabase* / neon* / vercel*,
  installCommand, startCommand,
  chatContext (json),
  needsAppBlueprint, testingEnabled,
  collectionId, themeId, isFavorite
}
```

App = **磁盘路径 + 预览生命周期 + 可选云后端/部署绑定**。  
崩溃可恢复：Neon test branch / Supabase test user id 持久化以便 orphan 清理。

### 3.3 Message 与人审

```text
messages.approvalState: approved | rejected
messages.sourceCommitHash / commitHash   # 对话与代码版本对齐
messages.aiMessagesJson                  # Agent 模式保留 tool 轨迹
messages.isCompactionSummary             # 上下文压缩摘要
chats.compactedAt / compactionBackupPath # 压缩备份
```

**人审门闩在消息层**：AI 提议 → UI 展示 → 批准后 processor 写盘。  
这与 Hearth **Approval（L0 硬门）** 同族，但作用域是 **代码 diff apply**，不是任意 tool。

### 3.4 路径布局

```text
~/dyad-apps/          # 默认 App 根（可 settings 改）
  <app>/              # 实际代码
    .dyad/            # 附件、manifest、本地元数据（受 path policy 保护）
```

`getDyadAppsBaseDirectory()`：自定义 folder > 默认 `~/dyad-apps`；可访问性检查（目录可写）。

---

## 4. 安全模型（可直接抄原则）

### 4.1 沙箱 path policy（`docs/security.md` + capabilities）

MustardScript / 附件检查 **只读**；硬边界在：

- 拒绝绝对路径、`..`、UNC、home 逃逸  
- realpath 后必须在 **当前 app 根**内  
- 拒绝 `.env*`、`.git/`、`node_modules/`、`.ssh`、`.aws`、key/pem 等  
- 允许 app 内 `.dyad/`  
- 限制单次读与总输出体积  

**结论：** 同意「always allow」后，**path policy 仍是唯一运行时护栏** — 与 Hearth「L0 硬门 + path_allow」一致，且更可操作。

### 4.2 MCP 同意

`mcpToolConsents` + `requireMcpToolConsent`；SQL 自动批准分类器 **保守**（不可解析 / 动态 SQL / EXPLAIN ANALYZE 等需同意）。  
Agent 模式与 Build 全局 auto-approve **不得绕过** SQL 安全规则。

### 4.3 密钥

Electron `safeStorage` / Keychain；禁止把 token 写进 git remote URL。

---

## 5. 产品原则（`PRODUCT.md` + `rules/product-principles.md`）

### 5.1 五条设计原则

1. **Never a dead end** — 每个状态都有说明 + **唯一**下一步  
2. **Protect the moment of intent** — 用户想法/prompt 是重心；安装 Node 等 **绕道后要能恢复意图**  
3. **Translate, don't expose** — 技术债用「为了跑预览」语言翻译  
4. **Calm confidence** — 一屏一主行动；upsell 安静  
5. **Motion explains** — 动效服务状态，不抢戏  

### 5.2 架构原则

| 原则 | 含义 |
|------|------|
| **Backend-Flexible** | LLM / DB / Deploy 可换；测：拿掉一个第三方不应炸核心 |
| **Productionizable** | 从原型到生产（真部署、真 env、真分支） |
| **Delightful** | 预览即时、微交互、克制温暖（非 confetti） |

### 5.3 反面参照

企业 SaaS 堆叠横幅、玩具感 confetti、纯终端恐吓、通用 AI 紫光 slop。

---

## 6. 工程与质量

| 项 | 实践 |
|----|------|
| 测试 | Unit + Vitest integration（IPC/sqlite/git 假 LLM）+ Playwright E2E（需 package 构建） |
| 规则库 | `rules/*.md` 按域索引（IPC、tools、drizzle、jotai…）— **agent 写代码前必读** |
| 格式 | oxlint / oxfmt；`npm run ts` 用 tsgo |
| 遥测 | PostHog；**非 bug 错误**不进 exception（DyadErrorKind） |
| Eval | `vitest.eval` 配置存在（提示/行为评测） |
| 蓝图 | `needsAppBlueprint` — 未批准蓝图前限制写类能力 |

---

## 7. 与 Hearth 差异总表

| 维度 | Dyad | Hearth |
|------|------|--------|
| 主对象 | **App**（可预览产品） | **Project + WorkItem**（承诺任务） |
| 中心隐喻 | Chat + Preview | Board + Pulse |
| 写盘 | **人批 apply**（或 Agent 工具 + consent） | Session 工具 + L0 硬门 |
| 自主 | 故意浅环（成本） | loop_policy + 预算 + quiet |
| 多引擎 | LLM Provider 抽象（AI SDK） | Provider/Adapter（CLI Agent 引擎） |
| 版本 | git commit + versions 表 | Timeline + Artifact |
| 团队 | 无 | 多 Team 一等 |
| 异步 CVO | 弱（交互式 builder） | 强（离开再回来） |
| 许可 | 双轨 FSL Pro | 设计期未绑 |

---

## 8. 可汲取智慧（给 Hearth，按优先级）

### P0 — 合同级

1. **Apply 门闩（人在环写盘）**  
   - Build 模式：AI 提议 → 结构化变更列表 → **grant 后**写盘（Dyad messages.approvalState）。  
   - 映射：非 L0 tool 默认可 auto；**批量文件写 / 依赖安装** 可配置为「变更包审批」模式（`apply_batch` Approval kind）。

2. **保护意图（Protect intent）**  
   - 安装依赖、选 Provider、绑 Project 等 **中断流必须带回原 Work/prompt**。  
   - Pulse / onboarding：死胡同非法；每个 empty/error 一个主 CTA。

3. **Versions 与代码状态对齐**  
   - Session 出口 / apply 后记 `commit_hash` 到 Closeout 或 Artifact。  
   - Work 详情「时光机」：commit 锚定对话消息（Dyad messages.commitHash）。

4. **Plan / Ask 只读模式**  
   - 对齐 Member tools：`modifiesState` 过滤；plan 模式禁止写工具（Dyad local agent flags）。  
   - 合同：`loop_policy` 旁增加 **turn mode**：`build | plan | ask`（UI/CLI）。

5. **Path policy 可操作清单**  
   - 抄 dyad protected paths 默认集进 Member/Project path_deny。  
   - realpath 双边规范化（macOS `/var` → `/private/var`）。

### P1 — 架构

6. **Preview 作为 Artifact kind**  
   - `Artifact.kind=preview_url`（本地 dev server）；Work Files 显示「打开预览」。  
   - 非 M1 必做，但 App 类 Project 高价值。

7. **Context 策略分级**  
   - full codebase / manual paths / Smart Context（小模型筛文件）— 对照 Hearth 长任务预算与 context window HUD。

8. **MCP tool consent 矩阵**  
   - 与 L0 硬门并列：同意可记忆，但仍受 path policy。

9. **Compaction**  
   - 长 Session 摘要 + 备份路径（chats.compaction*）→ Session 附属，防无限 transcript。

10. **错误分类**  
    - 用户错误 vs 系统 bug 分流（DyadErrorKind）— 影响日志与是否打扰 CVO。

### P2 — 明确不抄

11. 不以 **App Builder chat+iframe** 取代 Board/WorkItem 账本。  
12. 不默认「每请求塞整仓」进所有 Provider（成本/隐私）；按 Project 规模策略。  
13. 不把 FSL Pro local-agent 整段 fork 进 Hearth 内核。  
14. 不为「非技术 builder」牺牲 CLI/Daemon 可脚本性。

---

## 9. 对 Hearth 域映射（一图）

```text
Dyad App          ≈  Hearth Project（+ preview 生命周期）
Dyad Chat         ≈  Session 线程 / 某 Work 下多轮
Dyad Message+apply≈  Session 输出 + Approval(apply_batch) + Artifact
Dyad Version      ≈  git commit 锚定 + Closeout.paths
Dyad Plan/Ask     ≈  turn mode 只读工具面
Dyad MCP consent  ≈  tool consent + L0
Dyad Preview      ≈  Artifact.preview / 工程面板
```

---

## 10. 风险与边界（Dyad 自身）

| 风险 | 说明 |
|------|------|
| 双许可 | Pro 能力 FSL，二次商业分发需读条款 |
| 整仓上下文 | 大仓成本/隐私；依赖 Smart Context / 手选 |
| 浅 agent 环 | 复杂修 bug 可能不如 Cursor 深环 |
| 非技术用户 vs 系统复杂度 | Node/API key 仍是摩擦；靠 onboarding 原则缓解 |
| 云集成面广 | Vercel/Neon/Supabase 运维面进入本机 App |

---

## 11. 参考路径

| 路径 | 内容 |
|------|------|
| `PRODUCT.md` | 用户、原则、品牌 |
| `docs/architecture.md` | 请求生命周期、伪 tool、成本立场 |
| `docs/agent_architecture.md` | Local Agent 工具环 |
| `docs/security.md` | path policy |
| `src/db/schema.ts` | App/Chat/Message/Version/MCP |
| `src/paths/paths.ts` | dyad-apps 根 |
| `src/prompts/system_prompt.ts` | `<dyad-write>` 等协议 |
| `src/ipc/processors/response_processor.ts` | apply 落盘 |
| `src/pro/.../local_agent/tools/*` | 正式工具集（FSL） |
| `rules/local-agent-tools.md` | modifiesState / plan-only |
| `rules/product-principles.md` | Backend-Flexible 等 |

---

## 12. 一句话收束

**Dyad 证明：本地 AI 建站的核心不是「更 agentic」，而是「意图不丢 + 变更可预览 + 人批后落盘 + 版本可回滚 + 路径硬护栏」；Hearth 应把这些门闩与体验原则挂到 Project/Work/Session/Approval 上，并继续以 Board 账本为中心，而不是变成 Lovable 克隆。**
