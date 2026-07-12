# NanoClaw 项目深度分析

> 分析对象：[`nanocoai/nanoclaw`](https://github.com/nanocoai/nanoclaw)  
> 包版本：`2.1.41`（`package.json`）；GitHub Latest Release：**v2.1.17**（2026-06-17，changelog 上主线已更超前）  
> 许可证：**MIT**（Copyright 2026 Gavriel）  
> 仓库状态：约 **30.2k★ / 12.9k forks**，创建于 2026-01-31，活跃至 2026-07；~842 open issues  
> 官网 / 文档：https://nanoclaw.dev · https://docs.nanoclaw.dev  
> 定位一句话：轻量、**容器隔离**的个人 AI 助手，对标 OpenClaw，默认跑在 **Anthropic Claude Agent SDK** 上  
> 分析日期：2026-07-10

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**NanoClaw 是「小到能看懂、可整仓 fork 定制」的多通道个人 Agent 宿主：主机进程做路由与交付，每会话 Agent 在独立 Docker 容器中运行 Claude Agent SDK，经双 SQLite 消息桥通信，凭据经 OneCLI 代理注入，通道与替代 Provider 用 Skills 按需拷贝进 fork。**

### 1.2 为什么存在（相对 OpenClaw）

作者明确动机：OpenClaw 体量大（近 50 万行、大量配置与依赖）、安全偏应用层 allowlist，单 Node 进程共享内存——**不敢把整机生活权限交给看不懂的软件**。

NanoClaw 反其道：

| 维度 | OpenClaw（作者叙事） | NanoClaw |
|------|---------------------|----------|
| 体量 | 庞大、多配置 | 少文件、一进程 + 容器 |
| 安全 | 应用层权限 | **OS 级容器隔离** |
| 定制 | 配置膨胀 | **改代码 / Skills**，无配置蔓延 |
| 依赖 | 重 | 宿主 Node 依赖极少；Agent 在容器内 |

### 1.3 哲学六条

1. **Small enough to understand** — 能让 Claude Code 带你走完代码  
2. **Secure by isolation** — Bash 在容器内，只见挂载  
3. **Built for the individual** — 每人一个 fork，做 bespoke 软件  
4. **Customization = code changes** — 不要配置宇宙  
5. **AI-native, hybrid setup** — 脚本确定性路径 + 失败时 Claude Code 接手  
6. **Skills over features** — trunk 只做 registry/infra；通道与 provider 在旁支，经 `/add-*` 拷入  

### 1.4 产品能力摘要

- **多通道**：WhatsApp、Telegram、Discord、Slack、Teams、iMessage、Matrix、GChat、Webex、Linear、GitHub、WeChat、Resend 邮件等（**按需 skill 安装**）  
- **三级隔离**：独立 agent / 同 agent 分会话 / 共享会话（见 §4）  
- **每 agent 组**：独立 `CLAUDE.md`、记忆、容器、挂载  
- **定时任务**：`ncl tasks`（已从 MCP 迁出）  
- **Web 访问**、**Agent 模板**（`ncl groups create --template`）  
- **凭据**：容器永不持有 raw key → [OneCLI Agent Vault](https://github.com/onecli/onecli)  

默认触发词：`@Andy`（可改）。

---

## 2. 整体架构

### 2.1 数据流总览

```txt
Messaging apps
      │
      ▼
┌─────────────────────────────────────┐
│  Host (Node.js)                     │
│  channels → router → session DBs    │
│  delivery polls · host-sweep 60s    │
│  OneCLI vault · ncl socket          │
└──────────┬──────────────────────────┘
           │  write inbound.db (host only)
           │  wake container
           ▼
┌─────────────────────────────────────┐
│  Docker container (Bun)             │
│  agent-runner: poll inbound.db      │
│  Claude Agent SDK / other providers │
│  MCP tools → outbound.db            │
└──────────┬──────────────────────────┘
           │  write outbound.db (container only)
           ▼
      Host delivery → channel adapters → apps
```

**核心设计：每会话一对 SQLite 文件是主机↔容器的唯一 IO。** 无 stdin 管道、无跨挂载 IPC 文件、无共享写者。

### 2.2 为什么拆成两个 DB

| 文件 | 写者 | 读者 | 主要内容 |
|------|------|------|----------|
| **`inbound.db`** | Host | Container RO | `messages_in`、destinations、routing、delivered… |
| **`outbound.db`** | Container | Host RO | `messages_out`、`processing_ack`、session_state… |

- 每文件单写者 → 避免跨进程锁竞争  
- **`journal_mode=DELETE` 而非 WAL**：WAL 的 mmap `-shm` 在 **VirtioFS 上不跨 guest 一致**，容器会冻在旧快照  
- 读者侧（容器 poll）对 `inbound.db` 设 `mmap_size=0` 以尽快看到主机写入  

**seq 奇偶约定：** 主机写偶数、容器写奇数，形成跨表单调消息 id。

### 2.3 两级存储

| 层级 | 位置 | 内容 |
|------|------|------|
| **Central DB** | `data/v2.db` | users、roles、agent_groups、messaging_groups、wirings、sessions、container_configs… |
| **Session DBs** | `data/v2-sessions/<group>/<session>/` | inbound/outbound.db、outbox、.claude、.heartbeat |

Agent 组文件系统：`groups/<folder>/`（persona、local CLAUDE、skills 片段等）。

### 2.4 主机进程（`src/index.ts`）

薄编排顺序：

1. 启动退避（circuit breaker）  
2. **Upgrade tripwire**（禁止裸 `git pull` 升级后直接起服务）  
3. 初始化 central DB + migrations  
4. 回填 container_configs / CLAUDE.local 迁移  
5. 确保 Docker、清理孤儿容器  
6. 初始化 channel adapters（`onInbound` → `routeInbound`）  
7. Delivery poll（active ~1s + sweep）  
8. Host sweep ~60s  
9. `ncl` Unix socket  

Channel / modules 通过 **import 副作用自注册**（barrel 模式），便于 skill 只改一行 import。

### 2.5 容器内 agent-runner（Bun）

依赖：`@anthropic-ai/claude-agent-sdk`、MCP SDK、zod。

职责：

- 轮询 `messages_in` → 批格式化 → Provider query  
- 解析 `<message to="…">` 信封写 `messages_out`（无信封的文本当 scratchpad）  
- MCP：`send_message` / `send_file` / cards / ask_user / 自修改系统 action  
- 触摸 `.heartbeat`；长 Bash 时放宽 stale 阈值  
- 共享 agent-runner **只读挂载**（v2：不再每组一份可改 runner 源码树）  

输出：**不流式打到用户**；完整 messages_out 行再投递。打字指示由 host 在容器活跃时设置。

### 2.6 挂载布局（容器视角）

```txt
/workspace/                    ← session 目录 RW
  inbound.db / outbound.db
  outbox/  .heartbeat  .claude/
  agent/                       ← groups/<folder> RW
    CLAUDE.local.md …
    CLAUDE.md (RO, 每次 compose)
    container.json (RO)
/app/src                       ← agent-runner RO
/app/skills                    ← 共享 skills RO
/home/node/.claude             ← 组级 shared state RW
/workspace/extra/<name>        ← allowlist 额外挂载
```

**项目根、.env、host 源码永不挂载。**

---

## 3. 实体与路由模型

### 3.1 实体

```txt
users ── user_roles (owner/admin) ── agent_group_members
                │
agent_groups (workspace · persona · provider · container_config)
                │ many-to-many
messaging_group_agents (engage · session_mode · priority · …)
                │
messaging_groups (platform_id · channel_type · instance)
                │
            sessions (per thread/shared · container_status)
```

- **Owner**：全局唯一（首位配对用户）  
- **Admin**：全局或 scoped 到 agent_group  
- 特权写 / 审批：`pickApprover` → DM 投递  

### 3.2 入站路径

```txt
Adapter filter (trigger / mention / allowlist)
  → { platformId, threadId, message }
  → Host stamps instance
  → resolve messaging_group + agent_group + session
  → write messages_in
  → wakeUpAgent(session)
```

Adapters **不感知** agent_group/session id；只产出平台 ID。  
**去重** 归 adapter（Chat SDK 内置或原生实现）。

### 3.3 Engage / Session 轴（wiring）

`messaging_group_agents` 关键轴：

| 轴 | 取值 | 含义 |
|----|------|------|
| engage_mode | pattern / mention / mention-sticky | 何时转发 |
| engage_pattern | regex | pattern 模式 |
| sender_scope | all / known | 发送者过滤 |
| ignored_message_policy | drop / accumulate | 未触发消息 |
| session_mode | shared / per-thread / **agent-shared** | 会话隔离 |
| priority | int | 多 agent 同频道竞争 |

---

## 4. 三级通道隔离（产品核心）

| 级别 | session_mode | 共享什么 | 典型场景 |
|------|--------------|----------|----------|
| **1. Shared Session** | `agent-shared` | 一切含同一对话线程 | GitHub webhook + Slack 讨论同一会话 |
| **2. Same Agent, Separate Sessions** | `shared` / `per-thread` | 人格/记忆/工作区；**对话独立** | 同一人多平台 / 多群 |
| **3. Separate Agent Groups** | 不同 agent_group | **无共享** | 朋友 vs 工作；隐私边界 |

决策口诀：  
「是否接受任意一侧信息出现在另一侧？」→ 否则 Level 3；要并流消息则 Level 1；否则 Level 2。

---

## 5. 调度、交付与系统动作

### 5.1 调度（无独立 scheduler 服务）

- 用 `messages_in.process_after` + `recurrence`（cron）  
- Host sweep：到期 wake、stale 退避、outbound 交付、recurrence 下一次  
- **v2.1 变更：** 任务管理迁到 **`ncl tasks`**，不再暴露 6 个 scheduling MCP 工具；任务在 **per-agent-group system session** 执行，不唤醒创建它的聊天会话  

### 5.2 消息生命周期

```txt
messages_in: pending → (ack processing) → completed | failed
processing_ack: processing → completed
```

- 容器从不写 `messages_in.status`  
- 失败重试：host 侧指数退避（5s…），有 outbound 已交付则不重试防重复  
- 预算/计费类 provider 错误：现在会投递错误文案，避免静默  

### 5.3 系统 action 与审批

容器通过 `kind: system` 的 messages_out 请求：`create_agent`、`install_packages`、`add_mcp_server` 等。  
Host 校验权限 → 常走 **审批卡片 → admin DM**。  
自修改审批通过后：**显式 restart + on_wake 消息**，避免旧容器抢消息。

### 5.4 Agent-to-Agent

`send_message(to=<agent destination>)` → `channel_type: agent` → host 校验权限 → 写入目标 session inbound，并记 `source_session_id` 回程路由。

---

## 6. 安全模型（五层）

| 层 | 机制 |
|----|------|
| **1. 容器隔离** | Docker、非 root、per-session 长生命周期、idle 后 `--rm` |
| **2. 挂载安全** | 固定挂载表 + 嵌套 RO config；额外挂载 **allowlist 文件**（默认无文件 = 无额外挂载）；阻拦 `.ssh/.env` 等模式；路径 `realpath` 防 symlink |
| **3. 会话隔离** | 不同 agent group 不可见彼此历史/文件 |
| **4. 凭据隔离** | OneCLI vault：请求时注入；容器 env/fs 无 raw key |
| **5. Egress 锁定（可选）** | `NANOCLAW_EGRESS_LOCKDOWN=true`：internal 网仅能到 OneCLI 网关；默认 **关闭** |

另：`CONTAINER_CPU_LIMIT` / `CONTAINER_MEMORY_LIMIT` 可选资源帽。  
供应链：pnpm `minimumReleaseAge` 3 天 + `onlyBuiltDependencies` 白名单。

**与 GenericAgent 对比：** NanoClaw 默认把「全能执行」关在容器 + 挂载 + vault 里；GA 是本机全权限 + 真实浏览器会话——信任模型完全不同。

---

## 7. Provider 与 Skills 生态

### 7.1 Provider

| Provider | 获取方式 | 备注 |
|----------|----------|------|
| **Claude** | trunk 默认 | Claude Agent SDK |
| **Codex** | `/add-codex` | OpenAI app-server；vault 认证 |
| **OpenCode** | `/add-opencode` | OpenRouter/Google/DeepSeek… |
| **Ollama** | `/add-ollama-provider` | 本地模型 |

Provider 是 **DB 属性 per agent group**，非全局默认。  
记忆迁移走 **`/migrate-memory` 显式流程**，不在运行时静默搬家。

### 7.2 通道 Skills

Trunk **不包含** Discord/Slack/Telegram/WhatsApp 实现代码；装在 `channels` 分支，由 `/add-telegram` 等拷贝 + 注册 + 钉依赖。  
宿主侧用 **`chat` SDK（钉 4.29.0）** 桥接 Chat SDK 类通道；Baileys 等原生通道实现 NanoClaw 接口。

### 7.3 贡献策略

**Don't add features. Add skills.**  
主干只收安全/ bug / 明确改进；其余走 skills 与 registry 分支。

---

## 8. 运维与安装

### 8.1 安装

```bash
git clone https://github.com/nanocoai/nanoclaw.git nanoclaw-v2
cd nanoclaw-v2
bash nanoclaw.sh
```

- 装 Node/pnpm/Docker（缺则装）  
- OneCLI 注册 Anthropic 凭据  
- 构建 agent 镜像  
- 配对首通道（Telegram/Discord/WhatsApp/local CLI）  
- 失败 → Claude Code 自动诊断续跑  

v1→v2：`bash migrate-v2.sh`（状态迁移 + Claude 收尾）。

### 8.2 CLI

- **`ncl`**：查改 central DB（groups/wirings/users/tasks/destinations…）；容器内走 session DB 传输，写操作常审批  
- 服务名 **per-install slug**（同机多副本）  

### 8.3 升级纪律

- 必须经 `/update-nanoclaw` / `/setup` 等路径打 **upgrade marker**  
- 裸 `git pull` 后 host **拒绝启动**（v2.1.0+）  

### 8.4 版本现实

- package.json **2.1.41** vs latest GitHub tag **v2.1.17**：主线快于 tag 节奏  
- CHANGELOG 记录大量 **BREAKING**（Chat SDK pin、OneCLI 2.x、tasks 迁 ncl、provider 模型…）  
- 高 star + **842 issues**：产品热、维护面大  

---

## 9. 与本 monorepo 项目对照

| 维度 | **NanoClaw** | **OpenClaw**（对标） | **GenericAgent** | **ClawTeam** | **OpenHuman** | **Symphony** |
|------|--------------|---------------------|------------------|--------------|---------------|--------------|
| 层次 | L1 个人助手宿主 | 重型个人助手 | L1 本机全控 | L2 multi-CLI | L1–L3 个人 OS | L4 工单调度 |
| 隔离 | **Docker 一会话一容器** | 应用层为主 | 本机权限 | worktree | 本地数据/沙箱可选 | issue workspace |
| 执行器 | Claude Agent SDK（+ 可选） | 自有栈 | 自有 9 工具 loop | 任意 CLI | 自有 harness | **Codex only** |
| 通道 | Skills 按需 | 内置多 | IM frontends | 无 | 多通道产品 | Linear |
| 定制 | fork + 改代码 + skills | 配置/插件 | memory SOP 进化 | TOML 模板 | UI 配置 | WORKFLOW.md |
| 凭据 | **OneCLI vault** | 视实现 | mykey.py | profile | OS keyring | host env |
| 许可 | MIT | MIT | MIT | MIT | GPL-3.0 | Apache-2.0 |

**选用 NanoClaw 当：** 要「消息进 → 安全容器 Agent 出」、可理解代码、多通道个人助理，且接受 Claude/Docker/OneCLI 生态。  
**不选用当：** 要多模型猫团队（Clowder）、看板无人值守落地 PR（Symphony）、本机无容器全能自动化（GA）、或完整个人 Wiki 大脑桌面（OpenHuman）。

### 设计模式映射

| NanoClaw | 模式坐标 |
|----------|----------|
| 双 DB 消息桥 | 受控 Action 边界 / Observability 管道 |
| 容器挂载 allowlist | Blast Radius + Guardrail |
| 审批 DM | Approval Gate |
| 三级隔离 | Hierarchical Retention of identity/context |
| Skills `/add-*` | Skill Package |
| agent-to-agent destinations | Handoff / 轻量 Collaboration |
| host-sweep + recurrence | Loop + Progress |

---

## 10. 优势、局限与风险

### 10.1 优势

1. **安全叙事可验证**：容器 + 单写者 SQLite + vault + 可选 egress lockdown，比「应用 allowlist」硬。  
2. **架构清晰可讲**：host 路由 / container agent 分工，文档虽标注 draft，源码与 CLAUDE.md 可对证。  
3. **小而可 fork**：定制路径明确，避免配置宇宙。  
4. **通道/Provider 插件化**：trunk 瘦身，fork 只装需要的。  
5. **个人多场景隔离模型**（三级 session）产品化得当。  
6. **AI-native 运维**：装失败、debug、customize 都走 Claude Code。  
7. **MIT + 高社区热度**（大量 fork/衍生 microclaw 等）。  

### 10.2 局限

1. **默认强绑定 Claude/Anthropic 生态**（虽可加 provider，心智与文档仍 Claude-first）。  
2. **Docker 与 OneCLI 是硬依赖**，运维成本高于「单二进制 agent」。  
3. **「小代码库」是相对 OpenClaw**；含容器 runner、模块、skills 后仍有可观体量。  
4. **主干不含通道实现**——新用户必装 skills，认知与版本对齐成本（Chat SDK 锁版本已踩坑）。  
5. **842 open issues + 频繁 BREAKING**——跟进 upstream 需严格走官方升级路径。  
6. **不流式输出**；交互卡片依赖平台能力降级。  
7. **Egress lockdown 默认关**——恶意 tool 若忽略 HTTPS_PROXY 仍可能直连（除非开启 lockdown）。  
8. **文档 architecture 自承 draft**，以代码为准。  

### 10.3 风险

| 风险 | 缓解 |
|------|------|
| 容器 RW 挂载 agent 组 → 数据被 agent 改写 | 最小挂载；敏感只读 extra |
| 共享 session 记忆串味 | 严格按三级隔离选型 |
| OneCLI 网关版本不匹配 | 按 `versions.json` + docs 升级网关 |
| Skill 拷贝过期 / 与 trunk 漂移 | `/update-nanoclaw` 重装通道 |
| 审批绕过 | 坚持 owner/admin 与 command-gate |

---

## 11. 快速上手

```bash
git clone https://github.com/nanocoai/nanoclaw.git nanoclaw-v2
cd nanoclaw-v2
bash nanoclaw.sh          # 交互安装 + 配对

# 开发
pnpm install && pnpm dev

# 运维 CLI
ncl help
ncl groups list
ncl tasks list

# 卸载
bash nanoclaw.sh --uninstall
```

要求：macOS / Linux / Windows WSL2 · Node 20+ · pnpm 10+ · Docker · Claude Code（定制与部分 setup）。

---

## 12. 总结

**NanoClaw 是 2026 年「OpenClaw 轻量安全替代」路线的标杆：**

- **Host** 做多通道路由、会话生命周期、审批与交付  
- **Container** 跑 Claude Agent SDK（及可选 provider），工具副作用经 outbound 回到 host  
- **安全** 建立在容器挂载 + OneCLI，而非巨型应用内权限矩阵  
- **扩展** 坚持 Skills over features，让 fork 保持瘦  

它在你本地 `analysis` 光谱中的位置是：**个人多通道 Agent 宿主（L1）+ 强隔离**，介于「本机全能 GA」与「团队平台 Clowder / 工单 Symphony」之间——做个人助理与消息面自动化时优先评估 NanoClaw；做研发团队编排或看板落地时选别家。

---

## 13. 关键链接

| 资源 | URL |
|------|-----|
| GitHub | https://github.com/nanocoai/nanoclaw |
| 官网 | https://nanoclaw.dev |
| 文档 | https://docs.nanoclaw.dev |
| 安全 | https://docs.nanoclaw.dev/concepts/security |
| 模板库 | https://github.com/nanocoai/nanoclaw-templates |
| OneCLI | https://github.com/onecli/onecli |
| Discord | https://discord.gg/VDdww8qS42 |
| 中文 README | https://github.com/nanocoai/nanoclaw/blob/main/README_zh.md |

---

*本分析基于 README、package.json、docs/architecture.md、docs/isolation-model.md、docs/SECURITY.md、src/index.ts、container/agent-runner/package.json、CHANGELOG 与仓库元数据；architecture 文档标注为 draft，细节以源码为准。未完整审计全部 channel skill 分支与全部 migrations。*
