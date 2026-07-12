---
name: Hearth
version: alpha
description: Hearth M0.5.0 设计系统 — Project 中心 · chat-first · 亮色暖白 · 克制的伙伴。参照 Linear / neo-chat / dyad 的克制工艺。
colors:
  # —— key color：唯一 accent = Linear 靛蓝（primary 是 accent 的规范别名，供工具识别）——
  primary: "#5E6AD2"
  # —— 墨（文本，近黑非纯黑）——
  ink: "#1A1A18"
  ink-2: "#605D57"
  ink-3: "#8A8780"
  ink-disabled: "#B8B5AD"
  # —— 画布 / 表面（暖 off-white）——
  bg: "#FBFBFA"
  surface: "#FFFFFF"
  surface-2: "#F7F6F3"
  sunken: "#F2F1EE"
  # —— 边框 / 分隔 ——
  line: "#EAE9E5"
  line-2: "#E0DFDA"
  # —— 唯一 accent：Linear 靛蓝（交互）——
  accent: "#5E6AD2"
  accent-hover: "#4F5AC0"
  accent-fg: "#FFFFFF"
  accent-soft: "#ECEEFB"
  accent-soft-fg: "#3F49A8"
  # —— 语义 pastel（稀缺，仅状态）——
  status-red-bg: "#FDEBEC"
  status-red-fg: "#9F2F2D"
  status-amber-bg: "#FBF3DB"
  status-amber-fg: "#8A5A00"
  status-green-bg: "#EDF3EC"
  status-green-fg: "#346538"
  status-blue-bg: "#E6F0FB"
  status-blue-fg: "#1F5F96"
  status-slate-bg: "#EEF0F2"
  status-slate-fg: "#55606B"
  # —— soul 身份色（monogram，去饱和，稳定认人）——
  soul-blue: "#4B72C4"
  soul-green: "#3F8F6B"
  soul-red: "#C05B54"
  soul-violet: "#7E6BB8"
  soul-amber: "#B98A3E"
  soul-slate: "#5F6B78"
typography:
  page-title:
    fontFamily: Geist
    fontSize: 1.0625rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  section-title:
    fontFamily: Geist
    fontSize: 0.8125rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.55
  body-strong:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.55
  label:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: 500
    lineHeight: 1.4
  meta:
    fontFamily: Geist Mono
    fontSize: 0.6875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "0.01em"
  eyebrow:
    fontFamily: Geist Mono
    fontSize: 0.6875rem
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.04em"
  numeric:
    fontFamily: Geist Mono
    fontSize: 0.8125rem
    fontWeight: 500
    lineHeight: 1.4
  reader:
    fontFamily: Newsreader
    fontSize: 1.0625rem
    fontWeight: 400
    lineHeight: 1.75
rounded:
  sm: 6px
  md: 10px
  lg: 14px
  pill: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-fg}"
    rounded: "{rounded.sm}"
    padding: 6px 14px
    typography: "{typography.body-strong}"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    padding: 6px 13px
    typography: "{typography.body-strong}"
  button-secondary-hover:
    textColor: "{colors.ink}"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 12px 13px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: 10px 12px
    typography: "{typography.body}"
  nav-item-active:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: 6px 12px
  tab-active:
    textColor: "{colors.accent-soft-fg}"
    typography: "{typography.body-strong}"
---

## Overview

Hearth 是一个本机 Agent OS 的界面：**Project 是中心，进入默认落在 Chat；Runs 是独立受控执行工作面；Board / Runs / Artifacts / Workspace / Team / Settings 是 Project 内的竖排 section**。souls（团队成员）既可在 Thread 中自由协作，也可被 Workflow Step 指派执行。

视觉气质由三个参照物锁定，三者收敛到同一种性格：

- **Linear** — 冷静、快、键盘优先，冷中性灰 + 单一靛蓝 accent，动效只服务状态。
- **neo-chat** — 干净的聊天工作区，富渲染但不花哨，错误不伪装成正文。
- **dyad** — 产品原则即品味宣言："calm confidence，一屏一主行动""motion explains，动效不抢戏"，明确拒绝 AI 紫光 slop。

四条定调决策（贯穿全系统）：

1. **参照 Linear/neo-chat/dyad** → 克制、单色 + 一个 accent、动效有理由才动。
2. **白天工作为主 → 亮色暖白**。底色 `#FBFBFA`（比纯白温和、久看不累）。暗色版留待以后，当前只做亮色并锁定。
3. **souls = 克制的伙伴**。性格藏在**身份色 / 措辞 / 节奏**里，不吼在动画 / emoji / 拟人装饰上。像 Linear 里一个靠谱的同事，不是弹跳的吉祥物。
4. **无额外负向约束 → 用默认反 slop 底线**：无 AI 紫、无发光、无 glassmorphism、无 confetti、无飘动 blob、无 emoji 装饰、无玩具圆头。

**密度分档**（`VISUAL_DENSITY`）：Board / Workspace 文件树高密度（7-8，1px 线分隔、不套卡片、数字用 mono）；Chat / Team / Artifacts 内容页中密度（4-7，有呼吸留白）。整个 app 一个主题、一套圆角、一个 accent，三把一致性锁不许破。

## Colors

调色板 = **暖中性底 + 唯一靛蓝 accent + 稀缺语义 pastel + 去饱和 soul 身份色**。四种颜色角色各有严格用途，互不越界——这是"克制"能成立的关键。

**墨 / 文本（近黑，非纯黑）**
- **ink (`#1A1A18`)** — 主文本、标题。不用纯黑 `#000`，保留深度。
- **ink-2 (`#605D57`)** — 次级文本、正文说明、次要按钮文字。
- **ink-3 (`#8A8780`)** — meta、时间戳、占位、弱提示。

**画布 / 表面（暖 off-white）**
- **bg (`#FBFBFA`)** — 全局画布。
- **surface (`#FFFFFF`)** — 卡片、输入、抬起的表面。
- **surface-2 (`#F7F6F3`)** — hover、次级块、气泡底。
- **sunken (`#F2F1EE`)** — 凹陷区、代码/diff 背景、active nav 底。

**唯一 accent：Linear 靛蓝**
- **accent (`#5E6AD2`)** — 全 app **唯一**强调色。用于：主 CTA 填充、active tab、选中态、focus ring、链接、"品牌时刻"。饱和度落在 taste-skill 80% 上限内。白字在其上对比度 4.69:1，过 WCAG AA。
- **accent-hover (`#4F5AC0`)** — 主按钮 hover。
- **accent-soft (`#ECEEFB`) / accent-soft-fg (`#3F49A8`)** — 选中行 / 轻强调底与其文字。
- 颜色一致性锁：**accent 一旦选定，贯穿所有 tab 与所有 Project**。第 7 个 section 不许冒出别的按钮色。

**语义 pastel（稀缺，仅真实状态）**
仅用于 issue 状态、优先级、审批/错误等**真实语义**，绝不当装饰。red=阻塞/硬门/错误，amber=待审/review，green=完成/通过，blue=进行中，slate=待办/中性，另配 violet 用于 medium 标签。每个 bg/fg 成对，保证徽章内文字过 AA。

**soul 身份色（去饱和，稳定认人）**
每个 soul 有一个稳定身份色，用于 monogram 头像底 + 姓名前的小色点。这是**身份系统**（像 GitHub 的头像色、Linear 的 label 色），不是第二个 accent，也不是装饰——它服务"克制的伙伴"里"一眼认出这是砚、这是宪"那条。刻意去饱和，避免和 accent / 语义色抢眼。

## Typography

字体：**Geist + Geist Mono**（Linear / 开发者工具公认配对），系统字兜底。**排版靠 weight + color 建层级，而非字号跳级**——这是产品 UI 不是落地页，标题克制。

- **page-title (17px / 600)** — Project 名、Issue 标题这类页面主标题。
- **section-title (13px / 600)** — 面板区块标题、tab 内小标题。
- **body (14px / 400) · body-strong (14px / 500)** — 对话正文、卡片内容。强调用 500 而非放大字号。
- **label (12px / 500)** — 按钮、chip、次级控件文字。
- **meta (11px / mono)** — issue id、时间、溯源、文件路径这类元信息。**数据密集处数字一律 Geist Mono**（对齐、可扫）。
- **eyebrow (11px / mono / 大字距)** — 列头、状态标签这类小型大写标签。**限量使用**：不是每个区块都加，遵循 taste-skill 的 eyebrow 克制原则。
- **numeric (13px / mono)** — 计数、版本号、验收进度等需对齐的数字。
- **reader (Newsreader / 17px / 行高 1.75)** — **仅用于**小说/长文产物的正文阅读区（真实出版级内容，serif 有正当理由）。**绝不用于 UI**。避开 taste-skill 点名禁用的 Fraunces / Instrument Serif。

强调词用**同族的 italic / bold**，不混入异族 serif。零 em-dash / en-dash 作为排版花招（见 Do's and Don'ts）。

## Layout

- **外壳**：窄 Rail 负责 Project 切换、全局 Inbox 与全局设置；Project 内左侧使用竖排 section 导航（Chat / Board / Runs / Artifacts / Workspace / Team / Settings），Chat 下方接 thread 列表。Chat 是默认入口；进入 Runs 后使用独立 Run 工作台。
- **Chat（默认落地面）**：中密度。thread 列表 + 对话流 + composer。session chain（接力链）在对话流里用**接手分隔 + soul 身份**表达：一段 = 一个 soul 的独立 session，`@某人` + handoff 标记显示负责人变化与跨模型复核。有产物时右侧可开活产物面（`split`），无产物则整屏对话（`solo`，居中收窄 max 820px）。
- **Runs**：高信息密度。默认 Steps 工作台（左步骤、中详情、右 Result / Discussion / Logs），复杂依赖切 Graph。Chat 只显示 Run 摘要；Team/Posting 是执行者供给，不在这里作为模式切换器出现。
- **Board**：高密度。Linear 式状态列（Triage/Todo/Doing/Review/Blocked/Done），1px 线分隔，卡片轻。issue 与 thread 松耦合。
- **Artifacts / Workspace**：两个独立 section。Artifacts = 成品预览（reader / 画廊 / player / iframe 按 medium 切）；Workspace = 一等执行沙箱对象的源文件树与策略投影（高密度，mono 路径）。
- **Team**：中密度。派驻到本 Project 的 souls 花名册 + 记忆分层（跨项目基座 + 本项目切片 + 反思）。
- **间距**：4 / 8 / 12 / 16 / 24 / 32 六档。内容页用 16-24，密集区用 8-12。
- **响应式**：分屏（对话 + 产物）在 `< 860px` 退化为单列上下叠。

## Elevation & Depth

**极淡阴影，且必须带底色暖调**——不用纯黑投影（会在暖白上发脏）。层级优先靠 **1px 边框 + 背景色差**，阴影只在真正"抬起"时点到为止。

- 静置卡片：`0 1px 2px rgba(20,18,15,.03)`（几乎不可见，只给一丝分离）。
- hover 抬起：`0 4px 16px -6px rgba(20,18,15,.10)`。
- 抽屉 / 浮层：`-8px 0 32px -12px rgba(20,18,15,.14)`。
- 高密度区（Board 列内、文件树）**不套卡片盒子**，用 1px 线 + 留白分组。

绝不用发光 / 霓虹 / 外描边光晕。

## Shapes

**形状一致性锁：一套圆角贯穿全 app。**

- **sm (6px)** — 按钮、chip、徽章、nav item、小控件。
- **md (10px)** — 卡片、输入框、对话气泡、面板块。
- **lg (14px)** — 抽屉、模态、大容器。
- **pill (9999px)** — 仅用于 @mention chip、状态 pill 这类"胶囊"语义元素。

规则：胶囊只给 mention/状态，其余交互件一律 sm，容器一律 md。不允许方卡配圆头按钮这类混搭。图标用统一库（Phosphor / Radix / Tabler 之一），统一 strokeWidth，不手搓 SVG。

## Components

- **button-primary** — accent 底 + 白字，sm 圆角。全 app 主动作（发送、放行、确认）。hover 加深到 accent-hover。`:active` 用 `scale(.98)` 给一下物理下压反馈。
- **button-secondary** — surface 底 + line-2 边 + ink-2 字。次级动作（丢弃、返回、导出）。hover 边框转 ink-3、文字转 ink。
- **card** — surface 底 + line 边 + md 圆角 + 极淡阴影。hover 时 line→line-2 且轻微抬起。仅在 elevation 真正表达层级时用；密集列表改用 divide/border-t。
- **input** — surface 底 + line-2 边 + md 圆角。focus 时边框转 ink-3（或 accent focus ring），label 在上、helper/error 在下，绝不用 placeholder 当 label。
- **nav-item-active** — sunken 底表示当前位置。
- **tab-active** — accent-soft-fg 文字 + 底部 2px accent 下划线表示当前 tab。
- **状态与交互**：所有组件必须有完整 empty / loading（骨架，非转圈）/ error（结构化、不污染 transcript）态。soul 状态点（idle/在想/在写/交接/阻塞）用几何色点 + 简短文字表达"活着但克制"，不用花哨 loading 动画或情绪化抖动。

## Do's and Don'ts

**Do**
- 一个 accent（靛蓝）贯穿全 app；一套圆角；一个主题（亮色暖白）。三把锁交付前逐组件核对。
- 层级靠 weight + color + 留白 + 1px 线，而非放大字号、投影、发光。
- 数据密集处数字用 Geist Mono，对齐可扫。
- souls 的性格藏在身份色、措辞、节奏里；语气能看出砚(审)和宪(写)不同，但不刷屏。
- 动效每个都要有理由（hierarchy / storytelling / feedback / state transition）：曲线 `cubic-bezier(0.16, 1, 0.3, 1)`，时长 0.3s，只动 `transform` / `opacity`，尊重 `prefers-reduced-motion`。
- 错误进结构化字段（`generation_error` / `run_error`）+ 可重试块，不写进模型可见正文。

**Don't**
- **零 em-dash（`—`）和 en-dash（`–`）作分隔**。用普通连字符 `-`、逗号、句号、括号或换行。
- 不用纯黑 `#000` / 纯白（画布）；不用 AI 紫、发光、glassmorphism、渐变滥用。
- 不用 emoji 当装饰；不用玩具圆头、拟人大眼头像；souls 不弹跳、不卖萌。
- 中点 `·` 每行最多一个；不给每行都加上下边框（长列表用稀疏 divide 或分组）。
- 状态色点只表真实语义（阻塞/待审/进行中），不当每行装饰。
- soul 身份色 ≠ 第二 accent：它只上 monogram 与姓名色点，不进按钮、不进强调面。
- 不为动而动：informational 区块保持静止；无 confetti、无无限循环、无飘 blob、无 scroll 劫持花招。
- serif（Newsreader）只进长文产物阅读区，绝不进 UI；不混异族 serif 做强调。
