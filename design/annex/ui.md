# 附录 — 界面与体验（M0.5.0：Project 中心 · chat-first）

> **隶属：** [`../personal-agent-os.md`](../personal-agent-os.md) · **历史方案：** [`../conversation-turn.md`](../conversation-turn.md)
> **产物模型：** [`artifacts.md`](./artifacts.md) · **原型：** [`../prototype/project-chat/`](../prototype/project-chat/)
> **M0.5.0 转向：** Project 中心、进入默认落 Chat；**Runs 是独立受控执行工作面**。Chat 与 WorkflowRun 互相引用但生命周期独立。Board / Runs / Artifacts / Workspace / Team / 项目设置均为 Project 内竖排 section。

**为何再翻（M0.4.0 → M0.5.0）：** M0.4.0 以 Board 为落地页、issue 为唯一入口，把 chat 关在"点卡才进"的二级；但用户要的是 **chat-first + Project 为盒子 + 多团队按项目派驻**。M0.4.0 的「一个对象两张脸」在**单 issue 尺度**仍成立（issue 详情 = Linear 式，可编辑 + comment），但**顶层容器**从 issue 改回 Project，落地面从 Board 改成 Chat。

**演进脉络：** M0.2.7 小本本=comment · M0.2.11 意图保护 · M0.2.12 detach/attention · M0.2.13 错误块分离 · M0.3.0 产物中心（IA 被推翻）· M0.4.0 对话中心（Board 落地，容器仍 issue）· **M0.5.0 Project 中心 chat-first（本节）**。

---

## 0. 设计立场（M0.5.0，取代下方 M0.4.0 各节的 IA）

四条定调（来自 27 份 analysis 重梳 + 用户确认）：

1. **默认 Chat 骨架**：窄 Rail｜Project section 导航（+thread 列表）｜中 Chat｜右 inspector。Chat 是 Project 默认入口，但不强制成为所有对象的永久容器。
2. **Project 是中心容器**：装 Chat / Board / Runs / Artifacts / Workspace / Team / 项目设置。Runs 使用独立 Steps/Graph 工作台。Rail 管跨项目（切换/新建/Inbox/全局设置）。
3. **Posting（派驻）是一等关系实体**：Soul（全局身份）→ 属于某 Team（成员，不是独立库）→ 派驻到 Project = 一条 Posting（挂本项目 skill / 记忆切片 / role / autonomy）。同一 soul 派不同项目 = 不同 Posting（如烁在短剧队 L2 分镜主力、在电影队 L1 分镜执行）。Posting 由 Project 所有（是 Project 的关系实体，非独立聚合根）。**"不同项目不同队 skill 不同"由此成立**。
4. **Issue ↔ Thread/Run 松耦合 + 自动拉取**：随手可直接开 Thread（无 Issue）；Issue 可创建主 Thread，也可直接创建 WorkflowRun。Claim 生命周期独立于 Issue 业务状态；成功出口写 Thread/Run Closeout，由 Soul 用 tracker 把 Issue 推到 In Review（不必 Done）。

```text
所有 Project（落地：项目网格）
  → 点 Project = 进入，默认落 Chat
┌ Rail ┬ Project 导航 ┬────── 中 Chat（主舞台） ──────┬─ 右 活产物预览 ─┐
│ ⌂    │ ◆ Chat  ←默认 │  thread 对话流                  │ 预览/文件/       │
│ 项目 │ ☰ Board      │  多人接力 → 接力/对话流/轨道切   │ 产物/Workspace   │
│ 切换 │ ▶ Runs       │  Chat 只显示关联 Run 摘要         │                  │
│      │ ⬚ Artifacts  │  富消息 + apply门闩 + 错误块      │ (dyad 可折叠     │
│ +新建│ ⌥ Workspace  │  @接手/交回 · 跨模型复核         │  可折叠可分屏)   │
│ Inbox│ ⧉ Team       │                                  │                  │
│ ⚙全局│ ⚙ 项目设置    │  composer: @接手 build/plan/ask  │                  │
└──────┴──────────────┴──────────────────────────────────┴──────────────────┘
```

### session chain 三视图（多人接力时）
一条 issue thread 由多段 session 组成 chain（写→审→改）。三种呈现可切换（chat-head 右侧切换器，仅多人接力 sessions>1 时出现）：
- **接力**：每段一张可折叠卡（忠实"独立执行不共享上下文"），标"当前负责"。
- **对话流**：一条连续对话，交接是行内轻标记（最像 chat）。
- **轨道**：只看接力概览（谁→谁），手风琴就地展开某段（点段头就地展开，不切走视图）。

单人 / 无 issue 的随手 thread = 纯对话流（无切换器）。

术语（去游戏化）：**负责人**（= issue assignee，非"球权"）· **接手/交回**（非"传球"）· **跨模型复核**（非"跨模型互审 ⇄"）。

### Project 内七个 section（竖排，Chat 置顶默认）
- **Chat**（主舞台，默认落地）：左 thread 列表（随手 + issue-backed 混排），中对话流 + composer（@接手 · build/plan/ask），右 inspector（预览/文件/产物/Workspace 四切换，可折叠可分屏）。当前 Thread 无产物时默认折叠；用户手动打开后按 Project 记住偏好。
- **Board**（Linear 式）：状态列（Triage/Todo/In Progress/Blocked/In Review/Done）+ issue 卡；Backlog 作为 Todo 的筛选，Cancelled 归档展示。点卡 = **Linear 式 issue 详情**（左主区：标题/描述/验收清单/关联 Thread/Run/活动+评论，均可编辑；右属性栏：状态/负责人/优先级下拉即改）。Issue 与 Chat/Run 松耦合：无执行线的 Issue 显示"待拉取"，可一键触发自动拉取。
- **Runs**：顶部二级切换 `Runs | Definitions`。Runs 列表可无 Thread 创建；详情默认 Steps，复杂依赖切 Graph，Inspector 提供 Result / Discussion / Logs。Definitions 管 draft/published 版本并显示当前 Project Team 是否满足角色与权限。Chat 只显示关联 Run 摘要与跳转。
- **Artifacts**：全项目产物画廊，每个产物带版本时光机（旧版不覆盖，可回看/对比）；点版本可回到来源 Thread/Run。
- **Workspace**：真·树状文件视图（目录可折叠展开）+ 右侧 diff；展示 owner、cwd、策略、锁与合并状态。
- **Team**：派驻成员条 + 记忆分层 + 成长三桶（详见下）。
- **项目设置**：派驻配置（详见"两级设置"）。

### 自由协作 / Workflow 的启用与切换

**不提供 `Team | Workflow` 全局 toggle。** Team 是两种执行表面的共同资源池；用户切换的是页面与对象，不是把同一个对象原地改模式。

| 所在位置 | 主动作 | 结果 |
|----------|--------|------|
| Chat composer | `@成员 / 接手` | 继续当前 Thread；参与人数自然变化 |
| Chat header / Run 摘要 | `创建 Run` / `打开 Run` | 打开 Plan Preview 或进入独立 Runs section |
| Issue 详情 | `开始协作` | 创建/打开主 Thread |
| Issue 详情 | `运行 Workflow` | 不要求先建 Thread，直接打开 Plan Preview |
| Runs section | `New Run` | 选择 Definition、输入和 Team；可选创建 Discussion Thread |
| Run toolbar | `Discussion` | 打开/创建旁路 Thread；Run 继续保持独立状态 |

**Plan Preview 必须显示：** WorkflowDefinition + 版本、输入、目标 Issue（可选）、Team、角色→Posting 绑定、Workspace 策略、预计预算、审批要求、是否关联当前 Thread。缺角色、Provider、skills、Workspace 或权限时，`Start Run` disabled，并在对应字段就地说明。

Definitions 列表的启用态是**派生状态**：`Ready` 表示当前 Project 至少有一套合法角色绑定；`Needs setup` 展开缺失项并跳 Team/Project Settings；不保存 `workflow_enabled=true` 之类第二真相。

**运行中改 Team：** 已执行 Step 不可重写；整体换队走 fork/re-plan，未执行 Step 改派产生审计事件。Pause / Cancel Run 才是停止 Workflow，不叫“切回 Team 模式”。

### Team section（派驻 + 记忆 + 成长）
- **派驻成员条**：每张卡 = 一条 Posting（role / autonomy L0-L3 / model / 本项目状态）。
- **记忆分层**：基座（跨项目，只读）｜本项目切片（可编辑，可 ↑ 提升到基座）。
- **成长三桶**：原则 / 套路 / 疤，每条带 **出处**（回溯 session）· **层级**（切片/基座）· **被召回次数**（召回才是经验）。

### 项目设置 vs 全局设置（两级）
- **项目设置**（Project 内 section）：派哪支队、每成员 autonomy L0-L3 + skill 挂载 + 权限矩阵（放行/人批/禁止）+ workspace 根 / 导出目标 / loop 预算。可设置 `default_start=chat|workflow` 作为创建表单预选，但不存在全局“Team / Workflow 模式”开关。
- **全局设置**（Rail 左下 ⚙）：三个 tab——
  - **Teams**：master-detail（与全 app 列表/详情范式一致）。左队列表，右选中队详情（队名可改、可删队、默认 skill 增删、已派驻项目 chip）。成员行**点开 = 该 soul 的全局身份详情**（名字/角色/声音/persona 可改，模型只读）；顶部警示"改这里 = 改全局身份，影响该 soul 所在的所有队与项目"。soul 是队内成员，**不是独立 tab**——把"管队成员名单"（队层面）与"改 soul 是谁"（全局身份层面）两个层级分清。
  - **Providers**：模型/引擎注册（哪些 soul 用它；跨 family 互审的基础）。
  - **记忆基座**：各队跨项目资产 + 从项目切片提升上来的经验（带出处/召回数）。

### 安全默认
危险动作（装依赖 / push外发 / 删除）权限默认 **人批(interrupt)**，让用户主动放宽而非主动收紧（对齐 agent-design-patterns L2 定律）。

### 交付范围
原 M1/M2/M3 合并为 **Project Chat 完整闭环**：Thread（一等耐久自由协作对象）、多 Session 接力链、无 Issue 随手对话、独立 WorkflowRun、Workspace、多队、完整 Review 和多 medium Artifact 同阶段交付。Chat 投影 Thread 与其接力链 Session；Runs 投影受控 Step DAG；Board 投影 Issue（与 Thread/Run 松耦合）；Session 归属 `thread_turn | workflow_attempt` 二选一；Workspace section 投影 owner、`root_path` / `cwd`、策略、锁与文件产出。**后续仅延后 Handoff（M4）与 swarm（M5）。** 边界见 [ADR 0003](../../docs/adr/0003-workflow-run-independent-from-thread.md)，完整收敛合同见 [ADR 0004](../../docs/adr/0004-project-chat-closed-loop-convergence.md)。

---

<details>
<summary><b>以下 §1–§11 为 M0.4.0 立场（Issue 中心 · Board 落地），保留供追溯；顶层容器与落地面已被上方 M0.5.0 取代，但单 issue 详情/活产物/硬门/异步 CVO 等内核仍适用。</b></summary>

> **历史残留提示：** 下文 M0.4.0 的 Issue=Chat、WorkItem、球权术语和“Thread 承载所有执行”均已失效。当前模型以 [`CONTEXT.md`](../../CONTEXT.md)、ADR [0001](../../docs/adr/0001-remove-workitem-thread-as-execution.md)、[0002](../../docs/adr/0002-issue-status-vs-claim-lifecycle.md)、[0003](../../docs/adr/0003-workflow-run-independent-from-thread.md) 为准：Thread 承载自由协作，WorkflowRun 独立承载受控执行，Issue 负责业务追踪。

---

## 1. 设计立场（M0.4.0）

| 要 | 不要 |
|----|------|
| **一个对象**：Issue = 一件要推进的事 = 一条线程 | 产物、任务、审批各自独立宇宙抢顶栏 |
| **两张脸**：Board（拉远地图）↔ Chat（拉近对话） | 三层页 Home→画廊→预览器 逐级跳转 |
| **Board = 落地页**：回来先看所有 issue 地图 | 复活 Home / Pulse 首页 |
| **点卡 = 进 Chat**：左对话 + 右活产物 + 头部元数据 | 看个东西要"进"某个宇宙 |
| **产物贴对话右栏活着**（有则）；家仍在 Project | 产物只是卡内一行路径 / 或独立画廊宇宙 |
| **@mention 传球给 soul**；转 Review = 跨模型审 | 日常按 Team 导航 |
| **审批/错误内联对话流**，错误不污染正文 | 顶栏常驻 Decisions；`Error:` 进 transcript |
| **异步**：@完就走，board 自己动，回来看 Inbox | 同步实时 builder（打字→preview 贴脸） |
| **Project 必选 + 内置 inbox 兜底** | 逼你建 project 才能随手记一件事 |
| 每个 empty/error 一主 CTA（Dyad 永不死胡同） | 静默失败 / 堆栈甩脸 |

```text
拉最远  Board（顶栏第一 · 落地）    所有 issue 地图，列 = FSM
          │ 点卡
          ▼
拉最近  Issue = Chat + 活产物       左对话(@team) · 右产物(有则) · 头部元数据
Deep      Projects · Teams · Inbox抽屉 · Settings
```

**一句话：** 你只待在一个地方——一条 issue 对话；Board 是它拉远的地图，产物是它长出的果实。**没有中心之争，只有 zoom。**

---

## 2. 应用壳（主导航，M0.4.0）

```text
Board │ Projects │ Teams │ [Settings]        ⌗ Inbox(3)   ← 抽屉角标
  ↑ 落地页
```

| 导航 | 内容 |
|------|------|
| **Board**（落地） | 所有 issue 的地图；列 = Triage/Todo/Doing/Blocked/Review/Done；卡角标承载「新版本●/待审⛔/@你」；可按 project/team/status 过滤 |
| **Projects** | project 列表 → 单项目 = 本项目 board + 产物聚合画廊 + 团队 + 设置 |
| **Teams** | souls 花名册；每个 soul 背哪个 Provider/模型；显示各队专注项目 |
| **Inbox**（抽屉） | 时间序事件回声：@你的 · 硬门待审 · 跑完了 · failed |
| Settings | 后段 |

**无** Home / 独立 Board 宇宙（Board 就是落地页）/ 独立 Artifact 画廊宇宙 / Pulse 首页 / 顶栏常驻 Decisions。

---

## 3. Board（落地页，取代旧 Home + 旧独立 Board 宇宙）

```text
┌ Board                        [项目▾][队▾][状态▾]   ⌗Inbox 3 ┐
│ Triage │ Todo   │ Doing         │ Review    │ Done          │
│        │        │ ┌──────────┐  │ ┌───────┐ │ ┌──────────┐  │
│        │ ┌────┐ │ │第七章定稿 │  │ │登录页  │ │ │第1集分镜  │  │
│        │ │配乐 │ │ │@宪 novel │  │ │@砚 审中│ │ │✓ 已看     │  │
│        │ └────┘ │ │● v2 新版本│  │ │⛔ 待审 │ │ └──────────┘  │
│        │        │ └──────────┘  │ └───────┘ │                │
└────────────────────────────────────────────────────────────┘
```

- **卡角标吃掉旧独立表面：** `● v2 新版本`（旧 Home「新产物」）· `⛔ 待审`（旧硬门条）· `@你`（需你介入）· `⟳ 在跑`。
- 点任意卡 → §4 Issue=Chat 详情。
- **unseen 判定**（Herdr done-未见语义）落到卡角标：issue 有新 artifact 版本且未打开 → `●`。
- 列 = WorkItem FSM（主轴 §6.5.2，列不变）。Board 只是这批 issue 的镜头，不是新对象。

---

## 4. Issue = Chat 详情（唯一工作面，前端核心）

点开 board 卡进入。**这是人日常待的地方。**

```text
┌ Issue: 第七章定稿   [Doing] · @宪 · novel-x · 验收 2/3 · P2 ──────────┐
│                                                                       │
├──────────────────────────────────┬────────────────────────────────┤
│ 对话（左，常量）                  │ 活产物（右，条件项）           │
│                                    │                                │
│  你 › @宪 把第七章收个尾          │  ┌ 第七章 · v2 定稿 ─────┐    │
│  @宪 › 收尾完成，见右 →           │  │ [reader 分章阅读区]     │    │
│  ┌ diff 卡：ch07.md +42 −8 ┐      │  │ 正文分页…               │    │
│  ┌ 决策卡：合并到定稿?          │  └─────────────────────────┘    │
│     [批准] [拒绝]          ┐      │  版本  ● v2 定稿 刚             │
│  ⚠ 错误块：导出 EPUB 失败         │        ○ v1 初稿 2h  [对比]    │
│     [重试]（不进 assistant 正文） │  溯源: wi-42 @writing · sess-3  │
│  你 › @砚 帮我审一下 → [转 Review] │  [导出 ▾] [发布]               │
│                                    │                                │
│  ▸ 无产物的 issue：右栏消失，整屏对话（纯讨论 issue）              │
└──────────────────────────────────┴────────────────────────────────┘
  底部输入：  [@ soul ▾] [plan|ask|build ▾]  说点什么…            [↑]
```

**头部 = Linear issue 元数据：** 状态 · 持球 soul · 所属 project · 验收勾选 · 优先级/标签。

**左对话（常量）：**
- 富消息块（Neo）：diff 卡 / 决策卡 / artifact 卡 / mermaid / 清单，非纯文字墙。
- 审批内联（Dyad apply 门闩）：AI 提议变更 → 决策卡 → `[批准]` 后 processor 落盘；`[拒绝]` 回流。
- 错误块（Neo）：结构化 `run_error`，带 `[重试]`，**不写进 assistant 可见正文**。
- @mention 传球（clowder）：`@宪`/`@砚`/`@烁` 指向 Team souls，各背模型/CLI。
- turn mode（Dyad）：底部 `plan | ask | build` 切只读/写盘工具面。

**右活产物（条件项，非常驻分屏）：**
- 仅当此 issue 真的在产出 artifact 时出现；纯讨论 issue 整屏对话。
- 壳统一：预览区 + 版本轨 + 导出条 + 溯源（详见 §5）。

**异步（关键）：** @完可离开；detach 不杀 Session；souls 后台续跑；**不在时 board 自己动**；回来看 Inbox 回声。右栏是"瞥一眼的当前态"，非 live loop。**不做**打字→preview 同步贴脸。

---

## 5. 活产物面板（按 medium，嵌在 Issue 右栏）

全文见 [`artifacts.md`](./artifacts.md)。壳统一：**预览区 + 版本轨 + 导出条 + 溯源**。

| medium | 预览器 | 导出 |
|--------|--------|------|
| novel / doc | **Reader**（分章分页 · 目录 · 字数 · 版本 diff） | Markdown / EPUB / PDF |
| image | **Gallery**（网格 · 灯箱 · 前后版本对比） | 原图 / zip |
| video / audio | **Player**（内嵌播放 · 时间轴 · 版本切换） | 源文件 / 分享链 |
| app / code | **Live preview**（本地预览/iframe，Dyad 式；或截图 + 「运行」CTA） | 构建产物 / 部署指针 |
| dataset / report | **表格 / 结构视图** + 摘要 | csv / json |
| 未知 | 文件下载 + 元信息 | 原文件 |

- **版本不覆盖**：新跑 append 新版本 + 移动 current；旧版可回看/对比。
- **溯源反查**：面板底显示「哪次 WorkItem/Session 产出/更新本版本」；产物的**家**在 Project 聚合画廊（§6），日常在这右栏活着。

---

## 6. Project（盒子：本项目 board + 产物聚合画廊）

单项目页 = 该摊活的全景。**不是**日常主工作面（那是 issue 对话）；是"想逛这个作品出了啥/还剩啥"时来的。

```text
┌ Project: drama-s2   短剧 · 主责 drama-team ──────────────────┐
│ [看板]  [产物]  [团队]  [设置]                    [+ 新 issue]│
│                                                              │
│ ▸ 看板（本项目 issue，Board 的 project 过滤视图）            │
│ ▸ 产物（本项目所有 issue 的 artifact 聚合画廊，按 medium 分组）│
└──────────────────────────────────────────────────────────────┘
```

| Tab | 内容 |
|-----|------|
| **看板**（默认） | 本项目 issue 的 board 视图（= 顶栏 Board 按此 project 过滤） |
| **产物** | 本项目所有 artifact 的聚合画廊，按 medium 分组；点开 = §5 预览面板 |
| **团队** | 主责队 + 协作队；每队在本项目的持球/贡献 |
| **设置** | root_path · medium · 主责队 · agents_entry · archive |

**内置 `inbox` project：** 保留 id 的默认 project；`hearth issue new` 不给 project 时落这里；认真了 `hearth issue move --project foo` 迁走。保证"issue 一定有家、board 永远完整"，又不逼人先建 project。

---

## 7. Inbox（抽屉：异步 CVO 的回声，取代旧 Return view + Pulse）

```text
┌ ⌗ Inbox · 3 ────────────────────────── quiet ┐
│ ⛔ foo-app  Push feat/oauth 待审   [Grant][Deny][→]│
│ @  第七章   @宪 问：用哪个结局?     [回复…][→]     │
│ ✓  drama-s2 第3集分镜 渲染完 v4     [看→]          │
└ 空态：无待办 · 可以离开 ──────────────────────────┘
```

- **时间序事件流**，不是空间地图（那是 Board）。承载：硬门待审 · @你的 · 跑完/新版本 · failed。
- 点 `→` 跳对应 **Issue=Chat 详情**并定位。
- 硬门也可在 issue 对话流内联处理（§4 决策卡）；Inbox 是跨 issue 汇总入口。
- quiet 语义（主轴 §8.1）：默认只回声 L0 / 预算尽 / failed / 高优 need_input / 新产物就绪。

**旧 Return view / Pulse 溶解规则：** 不再有独立「回来看任务列表」页或「注意力条首页」；delta 直接呈现为 **Board 卡角标（空间）+ Inbox 事件（时间）** 两处。

---

## 8. 硬门 UI（能力保留，入口 = Inbox + 对话流内联）

| | 入口 | 停环 |
|--|------|------|
| **硬门 Approval** | Inbox 条 / issue 对话流决策卡 | 是（blocked） |
| **issue comment（小本本）** | issue 对话流 | 否 |
| **Board 列** | issue FSM 状态投影 | 状态投影 |

`status=blocked` 且有 pending Approval / need_input → issue 对话流置顶决策卡（Grant/Deny/Reply）+ Inbox 汇总 + Board 卡 `⛔` 角标。与旧版能力一致，仅入口从"Home 硬门条"改为"Inbox + 对话流内联"。

---

## 9. 异步 CVO × 界面（M0.4.0）

| 节奏 | UI |
|------|-----|
| 派活 | issue 对话 `@soul 干什么` / `hearth issue chat` |
| 离开 | quiet；detach 不杀 Session；souls 续跑 |
| 回来 | **Board 已动**（卡角标）+ **Inbox 回声** → 点卡进对话看细节 |
| 逛与记 | issue 右栏看产物；对话流写 issue comment |
| 传球 | @ 另一 soul / 转 Review（→ 跨模型审查） |
| 打包 | Bundle comments → 新 Goal issue（同 project） |
| 验收 | issue 头部勾 Acceptance + 对照右栏产物预览 |

---

## 10. CLI（与 IA 对齐）

```text
hearth board                                  # 落地：所有 issue 地图
hearth issue new "…" [--project foo]          # 不给 project → 落 inbox
hearth issue show <id> | chat <id> "@宪 …" | move <id> --status review
hearth inbox                                  # 事件回声
hearth approve list|grant|deny
hearth project ls|show|create; hearth artifact ls|show|export
# 无 hearth home；无 hearth decisions（审批在 issue 流 + inbox）
hearth run --project foo "…"                  # = issue new + 立即派活（糖）
```

---

## 11. 阶段与验收

| M1 | Board 落地 + Issue=Chat 详情（对话流 + 内联审批/错误块 + @mention）+ 右栏活产物（≥reader/文件下载）+ Inbox + Projects（board+画廊）+ Teams |
| M2 | 跨项目 board 加厚；player/live-app；版本对比；Inbox 分类 |
| M3+ | Thread/Steps 全页；Workspace 对象；多角色编制 |

- [ ] 落地页是 **Board**（issue 地图），非 Home/画廊
- [ ] 点卡 = 进 **Issue=Chat 详情**，无三层页跳转
- [ ] issue 详情 = 左对话 + 右活产物（有则）+ 头部 issue 元数据
- [ ] @mention 传球；转 Review = 跨模型审
- [ ] 审批/错误块**内联对话流**，错误不进 assistant 正文
- [ ] 无 project 建 issue 落 **inbox**，board 仍完整
- [ ] 产物贴右栏活着；版本不覆盖；家在 Project 画廊
- [ ] 删 issue 不删其产物
- [ ] 离开 detach 续跑；回来 Board 动 + Inbox 有回声

**明确不做：** 复活 Home/独立画廊宇宙/Pulse 首页；对话做成同步实时 builder；issue comment 塞进硬门列表；新跑覆盖旧产物版本；日常按 Team 导航。

</details>
