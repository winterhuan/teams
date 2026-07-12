# Hearth — 对话中心转向（M0.4.0 历史方案）

> **版本：** M0.4.0 · **对话中心转向（Conversation Turn）**
> **状态：** 已被 M0.5.0 Project 中心 · chat-first 取代；保留作决策追溯
> **关系：** 本文记录 M0.4.0 如何推翻 M0.3.0；当前 IA 见 [`annex/ui.md`](./annex/ui.md)。其中单 Issue 详情、活产物、硬门与异步 CVO 等机制仍被 M0.5.0 保留。
> **主轴：** [`personal-agent-os.md`](./personal-agent-os.md)（域合同）· 本文只改**投影层**（IA / 交互 / 心智），不改域根。

> ⚠️ **历史残留提示（M0.5.0 去 WorkItem 后补记）：** 本文写于 WorkItem 仍存在且 M1/M2/M3 尚未合并的时期。M0.5.0 后续已**去除 WorkItem**——执行归 **Thread**、追踪归 **Issue**（两者松耦合），并将前三阶段合并为 **Project Chat 完整闭环**。详见 [`CONTEXT.md`](../CONTEXT.md) 与 [`docs/adr/0001`](../docs/adr/0001-remove-workitem-thread-as-execution.md)、[`docs/adr/0002`](../docs/adr/0002-issue-status-vs-claim-lifecycle.md)。下文中 `WorkItem`、`Issue = WorkItem` 等式、`WorkItem = 一条线程`、「Session 挂 WorkItem」及 M1/M2/M3 排期均为**历史残留，不代表当前模型**；正文按当时立场原样保留。

---

## 0. 为什么推翻 M0.3.0

M0.3.0 之前的所有版本都在找一个「中心」并把它做成一个**要去的地方**：产物中心 → Home→画廊→预览器；更早是 Board 中心 → 顶栏看板宇宙。病根一样：**人得先"进"某个宇宙才能干活**，看个东西要跳三层页，任务、产物、审批是并列的目的地，互相抢顶栏。

参考 Neo Chat、Dyad、clowder-ai、Linear 四家后确认：它们的共同信念是反的——**人只待在一个地方,其它东西是这个地方长出来的枝叶,不是并列宇宙**。据此把 IA 从「多中心宇宙」翻成「一个对象,两张脸」。

**被推翻的具体立场（M0.3.0 → M0.4.0）：**

| M0.3.0 立场 | M0.4.0 反转 |
|-------------|-------------|
| 主入口 = **Home**（跨项目新产物 + 硬门） | **删掉 Home**；落地页 = **Board**；事件进 **Inbox** 抽屉 |
| IA = Home → Project → **Artifact 预览器**（三层页） | **无层，只有 zoom**：Board（拉远）↔ Issue=Chat（拉近） |
| Project = **产物画廊** | Project = **装 issue + 产物的盒子**（有自己的 board + 聚合画廊） |
| **Board 降为 Project 子页** | **Board 提回顶栏第一位、回来落地页** |
| 产物有**独立的家**（画廊→预览器宇宙） | 产物的家仍是 Project，但**日常在 issue 对话右栏活着** |
| 「新产物」「硬门条」「Pulse」是独立表面 | **全塌成 Board 卡角标 + Inbox 事件** |

**未变（域内核，勿重辩）：** 9 聚合根、WorkItem FSM、Approval T1–T4、autonomy L0–L3、stall/detach、Provider 适配栈、Artifact 升第 6 根（`project_id` 必填、版本 append-only、medium 预览、`produced_by` 溯源）、Daemon 为唯一真相、离开=detach、souls 异步继续。**变的只是这些东西怎么在 UI 露面。**

---

## 1. 心智模型（定稿）

> **一个对象，两张脸，三个角色的盒子。**
>
> **Issue 是唯一耐久工作对象**（= 一件要推进的事 = 一条线程）。拉远看 = **Board**；拉近看 = 和团队的 **Chat**。**Team 是「谁」，Project 是「哪摊活、且必选」，Artifact 是 Chat 里长出的果实。** 底座仍是本机 Daemon 账本，UI 只是投影；离开 = detach，souls 异步继续。

关键：只有 **Issue（= WorkItem）** 是耐久工作对象；Board 和 Chat 不是两个「地方」，是同一批 issue 数据的**两个缩放级别**。这是 Linear 的核心洞见，也是把五个词捏成一个整体的支点——**不再有"中心"之争，只有 zoom。**

```
Team（souls 花名册，各背模型/CLI） ──staff──▶ Project（必选 · 盒子 · 有目标）
                                                  │ owns
                                        ┌────────┴─────────┐
                                        ▼                     ▼
                                Issue（= 一条 Chat）      Artifacts 聚合画廊
                                ├ 拉远 = Board 卡          （本 project 所有果实）
                                ├ 拉近 = Chat（@team）
                                └ 产出 = Artifact（版本/预览）
```

**读法：** Team 派进 Project，Project 装 Issue，Issue 就是一条 Chat，Chat 里 @ 的人来自 Team，干出来的 Artifact 归 Project。一条闭环，没有孤岛。

---

## 2. 五要素如何有机结合（逐缝）

| 缝 | 结论 | 落点 |
|----|------|------|
| **Board × Issue** | 不是两个对象。Board 是 issue 的镜头，列 = issue 的 FSM 状态 | 你不"管理 board"，你在 board 上看所有 issue 的地图 |
| **Issue × Chat** | 点开一张卡，详情**就是**那条对话；issue 元数据（状态/负责人/验收/project）是对话的头部/侧栏 | "建 issue" = "开个对话"，同一动作，轻到像发消息 |
| **Chat × Team** | 对话里 @宪 @砚 @烁，各背不同模型/CLI；`In Review` = 球异步传给**不同模型族**审查 soul（clowder 跨模型互审 = Linear 一次状态转移） | 日常**不按 Team 导航**；Team 只是"本 project 可 @ 哪些 soul"的编制表 |
| **Chat × Artifact** | 对话真的产出东西时，它**贴对话右边活着**（reader/画廊/player/iframe）+ 版本轨 + 导出；没产物就整屏对话 | 产物面板是**条件项，不是常驻分屏**（纠正 Dyad 式贴脸误区） |
| **Project × 一切** | Project 是兜住 issue + artifact 的盒子；有自己的 board（只看本项目 issue）、聚合画廊、主责 Team；**必选** | 每人内置 `inbox` project 兜住"随手探一下 X"；认真了再移进正式 project |

**Project 必选怎么不别扭：** 内置 `inbox`（速记/Lab）project 做默认落点 → "建 issue"永远合法、永远轻、默认落 inbox，不逼你先建 project。既保住 chat 的随手感，又保住"issue 一定有家、board 永远完整"。

---

## 3. 导航 = 一路 zoom，无宇宙跳转

```
拉最远  Board（顶栏第一位 · 回来落地）    跨/本项目所有 issue 的地图，列 = FSM
          │ 点一张卡
          ▼
拉最近  Issue = Chat + 活产物            左对话(@团队) · 右产物(有则) · 头部 issue 元数据
```

**顶栏 = 三入口 + 一抽屉（就这些）：**

| 表面 | 是什么 | 吃掉了谁 |
|------|--------|----------|
| **Board**（第一位 · 落地页） | 空间/状态视图：所有 issue 的地图，列 = Triage/Todo/Doing/Review/Blocked/Done | 旧「新产物」「硬门条」「Pulse」全塌成卡角标（`●新版本 v4` / `⛔待审` / `@你`）+ filter |
| **Projects** | project 列表；进去 = 该项目的 board + 产物聚合画廊 + 设置 | 旧「产物画廊宇宙」并入此处 |
| **Teams** | souls 花名册；配哪个 soul 背哪个模型/CLI | — |
| **Inbox**（抽屉） | 时间序「需要你介入」事件流：@你的、硬门、跑完了 | 旧「Return view」「Pulse 注意力条」；异步 CVO 的回声 |

**明确删除的独立表面：** Home、独立 Artifact 画廊宇宙、独立 Board 宇宙（Board 现在就是落地页本身，不是"另开的宇宙"）、Pulse 首页。它们要么是 Board 的一个 filter，要么是 issue 卡上的一个角标，不配当独立 tab。

---

## 4. Issue = Chat 详情（拉近的一屏）

点开 board 任意卡，进的是这一屏（**唯一的工作面**）：

```
┌ Issue: 第七章定稿   [Doing] · @宪 · novel-x · 验收 2/3 ───────────┐
│ 头部：状态 · 持球 soul · 所属 project · 验收勾选 · 优先级/标签     │
├──────────────────────────────┬──────────────────────────────────┤
│ 对话（左，常量）              │ 活产物（右，条件项）             │
│  你 › @宪 把第七章收个尾       │  ┌ 第七章 · v2 定稿 ┐            │
│  @宪 › 已改，见右 →           │  │ reader 分章阅读…  │            │
│  ┌ diff 卡 ┐                  │  └──────────────────┘            │
│  ┌ 决策卡 [批准][拒绝] ┐      │  版本 ● v2 定稿 / ○ v1  [对比]   │
│  ⚠ 错误块（不污染对话正文）    │  [导出 ▾]                        │
│  你 › @砚 帮忙审一下（→Review）│  （无产物的 issue：此栏消失，   │
│                              │   整屏对话）                     │
└──────────────────────────────┴──────────────────────────────────┘
```

**四家各归其位（都落在这一屏）：**
- **Neo Chat** → 富消息块（diff/决策/artifact 卡）、错误块结构化不污染 transcript、skills(文本)≠tools(可执行)硬边界。
- **Dyad** → 对话旁活产物、plan/ask/build turn mode、apply 门闩（AI 提议 → 决策卡 → grant 后落盘）、版本快照、"永不死胡同/保护意图"。
- **clowder-ai** → @mention 传球、一 issue 一线程隔离、跨模型互审（= 转 Review 状态）、抗压缩持久身份、CVO 心智。
- **Linear** → issue 是唯一耐久对象、board/issue 缩放、FSM 列、assignee=持球、优先级/标签/子issue。

**异步不是同步贴脸（关键纠偏）：** 对话是**异步的**（像给团队发消息，不是实时打字比赛）。你 @完就走，Daemon 让 souls 继续干；**你不在时 board 自己会动**（卡推进、冒新版本、亮硬门）。右栏是"你瞥一眼时的当前状态"，不是 live loop。这条把 clowder 传球异步 + Hearth detach 缝进 chat 壳，而**不**变成 Lovable 同步 builder。

---

## 5. 概念映射（Linear 词 → Hearth 词 → 放哪）

| Linear | Hearth（域内核不变） | UI 放哪 |
|--------|---------------------|---------|
| Issue | **WorkItem** = 一条线程 | 点开 = Chat + 活产物 |
| Issue 状态 | WorkItem FSM（列不变：Triage/Todo/Doing/Blocked/Review/Done/Failed） | 卡角标 / issue 头部 |
| Assignee | 当前持球 soul/队（@mention） | issue 头部 |
| Board / List 视图 | 跨 issue 的镜头 | **顶栏第一位** |
| Project | 装 issue + 产物的盒子（**必选**） | 顶栏 Projects；board 可按 project 分组 |
| 子 issue / 依赖 | 子任务 / Bundle Goal | issue 内 |
| 评论 / 活动流 | 对话本身 + issue comment（口语「小本本」） | 对话流内 |
| 优先级 / 标签 | 路由标签（QAPS 的 P = 标签，非实体） | 卡上 |
| —（Linear 无） | **Artifact**（升根，medium/版本/预览） | issue 右栏 + Project 聚合画廊 |
| Inbox / My Issues | 异步 CVO 事件回声 | Inbox 抽屉 |

---

## 6. 域内核对照（本文不改，仅确认投影）

M1 九根全部保留（[主轴 §6.1](./personal-agent-os.md)）：Daemon · Team · Member · Provider · Project · **Artifact** · Session · WorkItem · Approval。

| 根 | M0.4.0 投影 |
|----|-------------|
| WorkItem | = **Issue**；拉远 Board 卡、拉近 Chat 详情 |
| Artifact | Chat 右栏活产物 + Project 聚合画廊；版本轨/导出/medium 预览不变；`produced_by` 溯源 = issue 头部「哪次跑出的」 |
| Session | 一条 issue 内的一次运行；对话流呈现其 timeline；detach 后台续跑 |
| Approval | 对话流内联决策卡（T1–T4；L0 硬门）；Inbox 汇总待审 |
| Team / Member | Teams 花名册；@mention 目标；不做日常导航轴 |
| Project | 顶栏盒子；必选；内置 inbox 兜底 |
| Provider | Member 背后引擎；@soul 即选了模型/CLI |
| Daemon | 唯一真相；UI 全是投影 |

**唯一新增的产品约定（非新根）：** 内置 `inbox` project（默认落点）——落地为一个保留 id 的 Project，不是新聚合根。

---

## 7. CLI（与新 IA 对齐）

```text
hearth board                         # 拉远：所有 issue 地图（落地）
hearth issue new "探一下 X" [--project foo]   # 不给 project → 落 inbox
hearth issue show <id>               # 拉近：该 issue 的对话 + 产物
hearth issue chat <id> "@宪 收尾第七章"       # 在 issue 线程里说话/派活
hearth issue move <id> --status review        # 传球（→ 触发跨模型审查 soul）
hearth inbox                         # 事件回声：@你/硬门/跑完
hearth approve list|grant|deny
hearth project ls|show|create
hearth artifact ls --project foo | show <id> | export <id> [--rev N]
# 无 hearth home；无独立 hearth decisions（审批在 issue 流 + inbox）
```

`hearth run --project foo "…"` 兼容保留 = `issue new` + 立即派活的糖。

---

## 8. 阶段与验收（覆盖旧 §10 IA 验收）

| M1 | Board（issue 地图 + 落地）+ Issue=Chat 详情（对话流 + 内联审批/错误块 + @mention 派活）+ 右栏活产物（≥ reader/文件下载）+ Inbox 抽屉 + Projects（board+画廊）+ Teams |
| M2 | 跨项目 board 视图加厚；player/live-app 预览；版本对比；Inbox 分类 |
| M3+ | Thread/Steps 全页；Workspace 对象；多角色编制 |

- [ ] 落地页是 **Board**（issue 地图），**非** Home、非独立画廊
- [ ] 点 board 卡 = **进入 Issue=Chat 详情**（无三层页跳转）
- [ ] issue 详情 = 左对话 + 右活产物（有则）+ 头部 issue 元数据
- [ ] @mention 可把球传给指定 soul；转 Review = 传给不同模型族审查
- [ ] 审批（Grant/Deny）与错误块**内联在对话流**，错误不写进 assistant 正文
- [ ] "建 issue" 无 project 时落 **inbox**，board 仍完整
- [ ] 产物贴 issue 右栏活着；版本不覆盖；家仍在 Project 画廊
- [ ] 删除产生某产物的 issue **不**删该产物（产物归 project）
- [ ] 离开 = detach，souls 续跑；回来 Board 已动 + Inbox 有回声

**明确不做：** 复活 Home / 独立画廊宇宙 / Pulse 首页；把对话做成同步实时 builder（背叛异步 CVO）；把 issue comment 塞进硬门列表；新跑覆盖旧产物版本；日常按 Team 导航。

---

## 9. 决策日志（本轮）

- **2026-07-11 M0.4.0 对话中心转向**：推翻 M0.3.0 产物中心 IA。确立「一个对象(Issue)两张脸(Board/Chat)三角色盒子(Team/Project/Artifact)」；Board 提回落地页；删 Home/Pulse 独立面；产物面板改条件项非常驻分屏；对话异步非同步贴脸；Project 必选 + 内置 inbox 兜底；四家(Neo/Dyad/clowder/Linear)各归其位。**域内核 9 根不动，仅换投影。**
