# Antfarm 项目深度分析

> 分析对象：[`snarktank/antfarm`](https://github.com/snarktank/antfarm)  
> 包版本：`0.5.1`（`package.json` / GitHub Latest Release **v0.5.1**，2026-02-15）  
> 维护方：Ryan Carson（[ryancarson.com](https://ryancarson.com)）  
> 许可证：**MIT**  
> 仓库状态：约 **2.5k★ / 454 forks**，创建于 2026-02-06，代码推送至 2026-02-26；~127 open issues  
> 定位一句话：用一条命令在 **OpenClaw** 上安装「可重复的多 Agent 工作流团队」  
> 分析日期：2026-07-10

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**Antfarm 是 OpenClaw 生态的「Agent 团队安装器 + 工作流运行时」：用 YAML 定义角色与步骤，用 SQLite 记 run/step/story，用 OpenClaw cron 做分布式轮询领取工作，把 planner / developer / verifier / tester / reviewer 编成确定性流水线——一键安装，零额外基础设施。**

README 口号：

> *Build your agent team in OpenClaw with one command.*  
> *You don't need to hire a dev team. You need to define one.*

### 1.2 它解决什么问题

| 痛点 | Antfarm 做法 |
|------|--------------|
| 单 Agent 长会话上下文膨胀、忘了测/忘了 PR | **每步/每 story 新会话**（Ralph loop），状态走 git + progress 文件 + SQLite |
| 「希望 Agent 记得走流程」 | **YAML 固化步骤顺序** + `expects: "STATUS: done"` 硬门控 |
| 开发者自己给自己打分 | **独立 verifier 角色**（无写权限），按验收标准打回 |
| 失败静默消失 | **max_retries + on_fail escalate_to human**；Medic 看门狗复位卡死步骤 |
| 搭团队要 Docker/队列/编排引擎 | **YAML + SQLite + OpenClaw cron**，运行时依赖仅 `yaml` + `json5` |

### 1.3 是 / 不是

| Antfarm **是** | Antfarm **不是** |
|----------------|------------------|
| OpenClaw **上的**工作流层 | 独立 Agent 宿主（它依赖 OpenClaw 已在跑） |
| 预置 + 可自定义的 **流水线产品** | 通用图编排框架（LangGraph 类） |
| **声明式**角色团队（YAML + AGENTS.md） | 任意 CLI Agent 的 swarm 协调层（那是 ClawTeam） |
| **安装/配置/状态机** + 轻量 Dashboard | 完整 IDE、云端多租户 SaaS |
| 同源 Ralph loop 的多 Agent 扩展 | 容器隔离的个人助手（那是 NanoClaw） |

### 1.4 与 Ralph 的关系

作者另有 [`snarktank/ralph`](https://github.com/snarktank/ralph)：单 Agent 循环「新会话 + 进度文件 + git 记忆」。Antfarm 把同一哲学 **横向扩展为团队流水线**：

```txt
Ralph:  同一 Agent × 多次 fresh session × progress.txt
Antfarm: 多角色 Agent × 有序 steps × stories 循环 × SQLite 状态
          记忆仍靠 git 历史 + progress-{{run_id}}.txt + KEY:value 上下文
```

### 1.5 分发与命名陷阱

- **不在 npm 上分发**（`package.json` 为 `"private": true`）。官方安装：`curl …/scripts/install.sh | bash`，或对 OpenClaw 说 *「install github.com/snarktank/antfarm」*。
- npm 上有 **无关** 包名 `antfarm`——文档反复警告 `npm install antfarm` 装错。
- **Node.js ≥ 22** 硬依赖：`node:sqlite`（`DatabaseSync`）。Bun 的 node 包装器会踩 `#54`。

---

## 2. 整体架构

### 2.1 三层叠加上 OpenClaw

```txt
┌─────────────────────────────────────────────────────────────┐
│  Human / Main OpenClaw Agent                                │
│  antfarm workflow run | Skill 触发 | Dashboard :3333          │
└────────────────────────────┬────────────────────────────────┘
                             │ 写 runs / steps / stories
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Antfarm CLI (TypeScript, Node ≥22)                         │
│  install · workflow · step claim/complete · medic · logs    │
│  SQLite: ~/.openclaw/antfarm/antfarm.db (WAL)               │
└────────────────────────────┬────────────────────────────────┘
                             │ 改 openclaw.json · 建 agent workspace
                             │ 注册 cron · subagent allowlist
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  OpenClaw Gateway                                           │
│  每 workflow agent: cron 轮询 (peek → claim → sessions_spawn)│
│  隔离 session + 按 role 的 tool deny 策略                   │
│  可选 sessions_spawn 把重活交给更强 model 会话              │
└─────────────────────────────────────────────────────────────┘
```

核心设计选择：**没有中央常驻 orchestrator 进程**。状态在 SQLite；推进靠各 agent 的 cron 心跳自己 claim 步骤。Medic 是可选的健康检查 singleton（v0.4.0+）。

### 2.2 路径布局

| 路径 | 用途 |
|------|------|
| `~/.openclaw/workspace/antfarm` | 克隆源码 + `npm run build` 后的 CLI |
| `~/.openclaw/antfarm/` | 状态根：`antfarm.db`、`workflows/`、`runs/` |
| `~/.openclaw/workspaces/workflows/<id>/` | 各 agent 工作区（AGENTS/SOUL/IDENTITY） |
| `~/.openclaw/openclaw.json` | 注册 agents、tool 策略、cron、agentToAgent allow |

`OPENCLAW_STATE_DIR` / `OPENCLAW_CONFIG_PATH` 可覆盖默认 `~/.openclaw`。

### 2.3 源码模块地图

| 区域 | 职责 |
|------|------|
| `src/cli/` | `antfarm` 入口：install/uninstall、workflow、step、dashboard、medic、logs |
| `src/db.ts` | SQLite schema、迁移、`getDb()` 短生命周期连接 |
| `src/installer/` | 工作流拉取/校验、agent 供给、cron、OpenClaw 配置、step 状态机 |
| `src/medic/` | Workflow Medic 健康检查与自动修复 |
| `src/server/` | Dashboard daemon（默认 3333） |
| `src/lib/` | logger、frontend 变更检测（驱动视觉验收） |
| `workflows/*` | 捆绑流水线 YAML + 角色 persona |
| `agents/shared/*` | setup / verifier / pr 共享人格 |
| `skills/antfarm-workflows/` | 给主 Agent 用的 SKILL.md |
| `tests/*` | 大量 polling / cron / role / 前端相关测试 |

运行时 **npm 依赖仅两个**：`yaml`、`json5`。SQLite 走 Node 内置 `node:sqlite`。

### 2.4 两阶段 Cron（关键机制）

为降低成本与超时风险，agent cron 通常是 **轻量轮询 + 重活分发**：

1. **Polling session**（可便宜 model、短超时，默认 ~120s）  
   - `step peek <workflowId_agentId>` → `NO_WORK` 则 `HEARTBEAT_OK` 立刻结束  
   - `HAS_WORK` → `step claim` → `sessions_spawn` 启动工作会话  
2. **Work session**（按 agent 配置 model / 角色超时 20–30 分钟）  
   - 读已解析的 `input` 模板做事  
   - **强制** `step complete`（stdin 管道）或 `step fail`——否则流水线永久卡住  

`agent-cron.ts` 的 prompt 用大段警告强调这一点：*session ending without reporting = broken pipeline*。

### 2.5 步骤推进与上下文传递

```txt
workflow run "task..."
    → 创建 run (status=running) + 有序 steps (waiting/pending)
    → planner 完成输出:
         STATUS: done
         REPO: ...
         BRANCH: ...
         STORIES_JSON: [...]
    → KEY:value 解析进 run.context（小写键）
    → 后续步骤模板 {{repo}} {{branch}} {{task}} ...
    → loop 步骤: stories 表驱动 implement ↔ verify
    → 全部完成 → run completed；失败尽则 escalate
```

**成功判定**靠步骤的 `expects` 子串（如 `"STATUS: done"`），不是 LLM 自评。  
**循环步骤** `type: loop`：`over: stories`、`completion: all_done`、`fresh_session: true`、`verify_each` + `verify_step`。

### 2.6 SQLite 模型

`~/.openclaw/antfarm/antfarm.db`（WAL + foreign_keys）：

| 表 | 关键字段 |
|----|----------|
| **runs** | id, workflow_id, task, status, context(JSON), run_number, notify_url, timestamps |
| **steps** | id, run_id, step_id, agent_id, step_index, input_template, expects, status, output, retry_count, type, loop_config, current_story_id, abandoned_count |
| **stories** | id, run_id, story_index, story_id, title, description, acceptance_criteria, status, output, retry_count |

v0.5.1 起 **顺序 run 号**（`#1`, `#2`）便于 status/resume/logs，而不只靠 UUID。

---

## 3. 捆绑工作流

### 3.1 总览

| Workflow | Agents | 流水线 | 典型输入 |
|----------|--------|--------|----------|
| **feature-dev** | 7（planner, setup, developer, verifier, tester, reviewer + developer 兼 PR） | plan → setup → implement↻verify → test → PR → review | 功能需求描述 |
| **security-audit** | 7 | scan → prioritize → setup → fix↻verify → test → PR | 指向仓库的审计任务 |
| **bug-fix** | 6 | triage → investigate → setup → fix↻verify → PR | Bug 报告 |

共享角色目录：`agents/shared/{setup,verifier,pr}/`（AGENTS + SOUL + IDENTITY）。

### 3.2 feature-dev（旗舰流水线，workflow version 5）

```txt
plan (analysis)
  → setup (coding)          建分支、发现 BUILD/TEST、基线
  → implement (coding, loop over stories, fresh_session)
       ↕ verify_each
    verify (verification)   可 agent-browser 做前端视觉验收
  → test (testing)          全量集成 / E2E
  → pr (coding/developer)   gh pr create
  → review (analysis)       PR 质量审查
```

**Planner 硬约束（AGENTS.md）：**

- 最多 **20** 个 story；每个必须 **一会话可完成**  
- 依赖序：schema → backend → frontend → integration  
- 验收标准必须 **可机械检查**；每 story 含测试准则 + 「Typecheck passes」  
- 输出 `STORIES_JSON` 供引擎落库  

**Developer（Ralph 式）：**

- 只做当前 story；读 `progress-{{run_id}}.txt` 的 Codebase Patterns  
- 写测、typecheck、commit、`feat: story-id - title`  
- **重写** progress 文件（不 edit 局部）；可沉淀可复用模式到文件顶部  

**Verifier 独立性：**

- 以 `git diff main..branch` 为真相，不以上游「宣称 CHANGES」为准  
- 空 diff / 敏感文件 / 缺 .gitignore → 直接 reject  
- 角色 **禁止 write**——不能自己改代码通过验收  
- 前端时可用 agent-browser：`has_frontend_changes` 驱动视觉检查  

**Tester 失败** 可 `retry_step: implement`（与 verify 类似的回环）。

### 3.3 bug-fix

强调 **根因 + 回归测试**：

1. **triager**：复现、分级 severity、problem statement  
2. **investigator**：root cause + fix approach（分析角色）  
3. **setup** → **fixer** → **verifier**（max_retries 3，打回 fix）  
4. **pr** 角色专用（`role: pr`），结构化 PR body（Bug / Root Cause / Fix / Regression Test）  

Verifier 额外要求：回归测试必须针对该 bug 场景；diff 必须非空且与 CHANGES 一致。

### 3.4 security-audit

1. **scanner**（`role: scanning`）：npm audit、密钥扫描、注入类模式、CVE 相关 web 查阅  
2. **prioritizer**：去重、分级、打成可循环的 fix 计划（stories 类结构）  
3. setup → **fixer 循环 + verify** → **tester** 再审计/集成 → **pr**  

与 feature-dev 同构的「计划 → 循环修复 → 验证 → 交付」形状，领域换成安全。

---

## 4. 角色与工具权限（安全模型的工程化）

### 4.1 AgentRole 六类

安装时 `ROLE_POLICIES` 基于 OpenClaw `profile: coding` 再 **deny 削权**：

| Role | 意图 | 典型 deny | 默认超时 |
|------|------|-----------|----------|
| `analysis` | 只读探索/规划/审查 | write/edit/apply_patch、browser/UI | 20 min |
| `coding` | 实现与 setup | UI/image 等非必要 | 30 min |
| `verification` | **无写**验收 | write/edit；保留 exec 跑测 | 20–30 min |
| `testing` | 集成/E2E，无写 | write；**允许 browser/web** | 30 min |
| `pr` | `gh pr create` | 写应用代码的路径收紧 | 较短 |
| `scanning` | 扫描 + web/CVE | 无写；允许 web | 中等 |

**全局 ALWAYS_DENY（工作流 agent 不可碰）：**  
`gateway`, `cron`, `message`, `nodes`, `canvas`, `sessions_send`  

注意：`sessions_spawn` **允许**——两阶段轮询要靠它拉起工作会话。

### 4.2 其他安全主张（SECURITY.md）

| 措施 | 说明 |
|------|------|
| **仅官方仓库** | 安装源锁 `snarktank/antfarm`，无任意远程 workflow URL |
| **PR 安全审查** | 社区 workflow 合并前查 prompt injection、恶意 skill、越权、外泄 |
| **透明** | 纯 YAML + Markdown，可审可读 |
| **会话隔离** | 每 agent 独立 OpenClaw session + 专属 workspace |
| **披露** | Ryan@ryancarson.com，48h 确认 |

### 4.3 现实边界（需清醒认识）

- 安全边界主要是 **OpenClaw tool policy + prompt 纪律**，不是容器/OS 沙箱。  
- `coding` 角色在宿主机上仍有 **读/写/exec**——等同信任本机 Agent。  
- Verifier 无写不能防止 **coding agent 已经写坏磁盘**；它防止的是「未经验收就前进」。  
- 与 NanoClaw 的 Docker 隔离相比，Antfarm 选择 **依赖宿主 OpenClaw 的既有信任模型**。

### 4.4 安装时对「主 Agent」的保护

`install.ts` 显式处理 issue #41：向 `agents.list` 注入 workflow agents 时，若无人 `default: true`，会保证 **main 保持 default**，避免第一个 workflow agent 劫持用户主会话。

---

## 5. CLI、Skill 与 Dashboard

### 5.1 命令面

| 类别 | 命令 |
|------|------|
| 生命周期 | `install` · `uninstall [--force]` · `update` · `version` |
| 工作流 | `workflow list/install/uninstall/run/status/runs/resume`（及文档中的 stop / ensure-crons） |
| 步骤（给 cron agent） | `step peek/claim/complete/fail/stories` |
| 观测 | `logs` · `dashboard [start\|stop\|status]` |
| 健康 | `medic install/uninstall/run/status/log`（v0.4.0） |

### 5.2 Skill：`skills/antfarm-workflows/SKILL.md`

- 描述触发词：antfarm、多步 workflow、feature/bug/security  
- 强调用 **绝对路径** 调 CLI，避免 PATH 问题  
- 指导主 Agent：任务字符串必须含 **具体目标 + 约束 + 验收勾选**，先与用户确认再 `workflow run`  
- 说明 cron 名形如 `antfarm/<workflow-id>/<agent-id>`，可用 cron `run` 强制触发跳过等待  

### 5.3 Dashboard

- 默认 `localhost:3333`  
- 实时 run / step / agent 输出  
- Medic 状态灯（绿/黄/红）与检查历史（v0.4）  
- 实现：`src/server/dashboard.ts` + 静态 `index.html`，daemon 化启停  

### 5.4 Workflow Medic（v0.4.0）

| 检查 | 动作 |
|------|------|
| Stuck steps（超时仍 running） | 重置为 pending 供 re-claim |
| Stalled runs | 标记长时间无进展 |
| Dead/zombie runs | 全部 step 终态但 run 仍 running → fail + 清 cron |
| Orphaned crons | 无活跃 run 仍在轮询 → 拆除 |
| 无法自愈的严重问题 | 告警到 main session |

默认约 **每 5 分钟**、便宜 model——运营向「看门狗」，不是业务编排器。

---

## 6. 自定义工作流

### 6.1 目录约定

```txt
workflows/my-workflow/
  workflow.yml
  agents/
    agent-a/{AGENTS.md,SOUL.md,IDENTITY.md}
    ...
```

可引用 `../../agents/shared/...` 复用 setup/verifier/pr。

### 6.2 workflow.yml 要素

- 顶层：`id`（禁止 `_`——保留为命名空间分隔）、`name`、`version`、`description`、`agents`、`steps`  
- 可选：`polling.model` / `polling.timeoutSeconds`  
- Agent：`role`、`timeoutSeconds`、`workspace.files`、`workspace.skills`  
- Step：`input` 模板、`expects`、`max_retries`、`on_fail`（`escalate_to: human` 或 `retry_step`）  
- Loop：仅支持 `over: stories` + `completion: all_done`（当前实现约束写死在 `workflow-spec.ts`）  

### 6.3 模板变量

- 全局：`{{task}}`、`{{run_id}}`、`{{progress}}`  
- 上游 KEY:value → 小写 `{{repo}}` 等  
- Loop 注入：`{{current_story}}`、`{{completed_stories}}`、`{{stories_remaining}}`、`{{verify_feedback}}`  
- 前端：`{{has_frontend_changes}}`（`frontend-detect`）  

### 6.4 Persona 三文件

| 文件 | 作用 |
|------|------|
| **AGENTS.md** | 流程、输出格式、禁止事项、安全检查清单 |
| **SOUL.md** | 语气与价值观 |
| **IDENTITY.md** | 名称与角色一句话 |

质量高度依赖这些 Markdown——引擎只负责调度与门控字符串，**不理解领域语义**。

---

## 7. 版本演进要点

| 版本 | 要点 |
|------|------|
| **v0.1.0** | 三捆绑 workflow、story 执行、SQLite、Dashboard、CLI |
| **v0.2.0** | step 输出改 **stdin**（修 shell 转义导致 STORIES_JSON 丢失）；`version`/`update` |
| **v0.2.1–0.2.2** | 状态机硬化；`timeoutSeconds`；abandoned-step 时间戳修复 |
| **v0.4.0** | **Workflow Medic** |
| **v0.5.1** | 顺序 run 号；agent ID 分隔符 **hyphen → underscore**（`bug-fix_setup`）；CLI cron fallback 修复 |

**破坏性：** v0.5.x agent 命名空间变更，旧安装需 `antfarm uninstall && antfarm install`。

CHANGELOG 文件本身只写到 v0.2.2；更高版本细节以 **GitHub Releases** 为准。

---

## 8. 与同类项目对比

结合本仓库 `analysis/` 内已有结论：

| 维度 | **Antfarm** | **Symphony** | **ClawTeam** | **Clowder** | **NanoClaw** | **GenericAgent** |
|------|--------------|--------------|--------------|-------------|--------------|------------------|
| 层级 | OpenClaw **插件式工作流** | 工单调度 daemon | 任意 CLI **swarm 协调** | 多 CLI 平台 | 容器化个人宿主 | 自演化内核 |
| 编排形态 | **固定 YAML 流水线** | Linear issue → workspace | Leader spawn 动态 | 平台任务 | 通道路由 | 代码/策略自改 |
| 状态 | SQLite | SPEC 实现自定 | `~/.clawteam` JSON | 平台 DB | 双 SQLite 桥 | 自有 |
| 隔离 | OpenClaw session + tool deny | 每 issue workspace | git worktree + tmux | 视后端 | **Docker** | 视部署 |
| 验证哲学 | **独立 verifier 角色** | CI/PR/Review 证明 | 靠 Leader/人类 | 视配置 | 应用层+容器 | 自评估 |
| 安装体感 | 一条 curl / 对 Agent 说 install | 自托管 SPEC 实现 | `pip` + CLI | 平台安装 | fork + Docker | 研究向 |
| 依赖宿主 | **强依赖 OpenClaw v2026.2.9+** | Codex App Server | 多 CLI | 多 | Claude SDK 等 | 独立 |

**选型直觉：**

- 已在用 **OpenClaw**，要「功能/修 bug/安全审计」**可重复团队流水线** → **Antfarm**  
- 要从 **Linear 工单** 规模化 Codex 落地 → **Symphony**  
- 要在 **Claude/Codex/…** 之间临时组 swarm、不绑 OpenClaw → **ClawTeam**  
- 要 **个人助手 + 强隔离** → **NanoClaw**  
- 要 **研究级自演化** → **GenericAgent**  

Antfarm 的差异化一句话：**把「软件团队流水线」产品化装进 OpenClaw，而不是再做一个 Agent 框架。**

---

## 9. 设计模式提炼

可直接映射到 `agent-design-patterns` 一类清单：

1. **Deterministic Pipeline** — 步骤顺序与 expects 门控，非自由 ReAct 闲聊  
2. **Separation of Powers** — 实现 vs 验证工具权限分离  
3. **Fresh Context / Ralph Loop** — 每 story 新会话，防上下文污染  
4. **Externalized Memory** — progress 文件 + git + SQLite context  
5. **Story Decomposition** — 规划器强制小粒度、可验证 AC  
6. **Retry with Feedback** — verify fail → `retry_step` + `ISSUES`/`verify_feedback`  
7. **Human Escalation** — 重试耗尽不装死  
8. **Two-Phase Polling** — 便宜心跳 + 贵重工作会话  
9. **Role-Based Tool Policy** — 安装时固化 deny 列表  
10. **Watchdog (Medic)** — 编排层之外的运行时自愈  
11. **Curated Supply Chain** — workflow 仅官方仓，防远程投毒  
12. **Structured Hand-off** — `KEY: value` 协议而非自由散文  

---

## 10. 风险、局限与适用场景

### 10.1 风险与局限

| 项 | 说明 |
|----|------|
| **OpenClaw 绑定** | 非通用；版本需 v2026.2.9+（cron `/tools/invoke`） |
| **无 OS 沙箱** | coding agent ≈ 本机全权（在 tool 策略内） |
| **Cron 延迟** | 默认数分钟级轮询；可 force-run，但仍是异步模型 |
| **卡死类故障** | 依赖 agent 必须 complete/fail；Medic 缓解但不能消灭语义错误 |
| **任务质量敏感** | 模糊 task → 烂 plan → 烂 story；Skill 要求写清 AC |
| **Loop 表达力** | `loop.over` 目前仅 `stories`，不是通用 for-each |
| **生态年轻** | 2 月创建，3 周内冲到 0.5.x，随后 push 趋缓；127 open issues |
| **文档/CHANGELOG 滞后** | 根 CHANGELOG 停在 0.2.2，需读 Releases |
| **npm 同名陷阱** | 错误安装路径高发 |

### 10.2 适合

- 已部署 OpenClaw，希望 **标准软件工程流水线** 自动化  
- 需要 **可审计、可重复** 的 feature / bugfix / 安全修复路径  
- 愿意用 Markdown 精心写角色，而不是只丢一句 prompt  
- 本机/`gh` 已具备，接受 Agent 在仓库里开分支提 PR  

### 10.3 不适合

- 无 OpenClaw、或不想绑其配置模型  
- 需要强多租户、强容器隔离、合规审计 OS 边界  
- 高度动态、非流水线的 swarm 协商（更偏 ClawTeam）  
- 纯云端托管、不想维护本机 cron/agent 舰队  

---

## 11. 快速上手（摘录）

**要求：** Node ≥ 22、OpenClaw v2026.2.9+、`gh` CLI（PR 步骤）。

```bash
# 官方一键
curl -fsSL https://raw.githubusercontent.com/snarktank/antfarm/v0.5.1/scripts/install.sh | bash

# 或手动（AGENTS.md）
git clone https://github.com/snarktank/antfarm.git ~/.openclaw/workspace/antfarm
cd ~/.openclaw/workspace/antfarm && npm install && npm run build && npm link
antfarm install

antfarm workflow list
antfarm workflow run feature-dev "Add OAuth login; AC: [ ] login page [ ] callback [ ] tests pass"
antfarm workflow status "OAuth"
antfarm dashboard          # :3333
antfarm medic install      # 推荐生产向使用
```

对主 Agent：*「install github.com/snarktank/antfarm」* 亦可，Skill 装入后由主 Agent 代跑 CLI。

---

## 12. 结论

**Antfarm 是 OpenClaw 生态里「把软件团队编成可安装流水线」的务实答案：**

- **产品层**：三条开箱工作流覆盖 feature / bug / security 高频场景  
- **工程层**：极简依赖、SQLite 状态、cron 自治推进、角色削权、独立验证、Ralph 式新鲜上下文  
- **运维层**：Dashboard + Medic + resume/logs，正从 demo 走向可值守  
- **生态位**：不做通用 Agent OS，只做 **OpenClaw 上的 deterministic agent-team package**

若你的栈已经是 OpenClaw，Antfarm 是把「多 Agent 协作」从聊天约定升级为 **可版本化、可卸载、可审查的 workflow 资产** 的最短路径之一。若你需要跨 CLI、跨宿主或强隔离，应组合或改选 ClawTeam / Symphony / NanoClaw，而不是指望 Antfarm 覆盖全部 harness 形态。

---

## 参考链接

- 仓库：https://github.com/snarktank/antfarm  
- 文档：`docs/creating-workflows.md`、`SECURITY.md`、`AGENTS.md`  
- Ralph：https://github.com/snarktank/ralph  
- OpenClaw：https://docs.openclaw.ai · https://github.com/openclaw/openclaw  
- 作者：https://ryancarson.com  
- 本目录对照：`symphony-分析.md`、`ClawTeam-分析.md`、`nanoclaw-分析.md`、`clowder-ai-分析.md`、`genericagent-分析.md`
