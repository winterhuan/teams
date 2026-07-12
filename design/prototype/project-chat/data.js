/* PROTOTYPE · M0.5.0 Project 中心 · chat-first · mock 数据（throwaway）
 *
 * 心智反转（相对 M0.4.0 Issue 中心）：
 *   Project 是中心。进入 Project = 默认 Chat 面。
 *   Board / Artifacts / Workspace / Team / Settings 都是 Project 内的竖排 section。
 *   Team 是顶层常驻花名册，被"派驻"到不同 Project（小说/短剧/电影/App 各不同队，skill 不同）。
 *   Chat 与 Issue 松耦合：
 *     - Project 可直接开 Chat thread（无 issue）
 *     - 也可建 Issue（Board 卡）→ 团队自动拉取 → 开 thread 工作
 *   Session chain（clowder 语义）= 接力链：
 *     一条 thread 上，责任在 souls 间接手/交回（@宪写 → @砚审 → 交回@宪改），
 *     每次接手唤起【另一个 soul 的独立 Session】（一人一工位一 transcript，不共享）。
 *     chain 不是一个 agent 顺序重跑，是 A2A 协作轨迹（含跨模型复核）。
 *   Team 记忆分层：跨项目基座（队风格/约定）+ 本项目切片（evidence/lessons/成长）。
 *
 * 渲染契约（views.js 消费）：
 *   DATA.souls[]     { id, name, role, model, family, tint }
 *   DATA.teams[]     { id, name, kind, member_ids[], skills[] }
 *   DATA.projects[]  { id, name, color, medium, kind, desc, team_id, member_ids[], last_thread }
 *   DATA.threads[]   { id, project_id, issue_id?, kind, title, status, sessions[], messages[], artifact_id? }
 *   DATA.issues[]    { id, project_id, status, title, holder, thread_ids[], acceptance[], gate? }
 *   DATA.artifacts[] { id, project_id, medium, title, current, versions[], unseen?, sample?, trace }
 *   DATA.workflows[] { id, source_thread_id?, discussion_thread_id?, issue_id?, status, current_step_id, steps[] }
 *   DATA.files{}     project_id -> 文件树
 *   DATA.memory{}    project_id -> { base[], slice[], reflections[] }
 *   DATA.inbox[]     { kind, kindLabel, text, time, project_id, thread_id? }
 */

// ---- souls 花名册（顶层，各背模型/CLI）----
// soul = 全局稳定身份（persona/voice/model 跨项目恒定）；可同时属于多个队
const SOULS = [
  // App 开发
  { id: "xian", name: "宪", role: "架构 / 主开发", model: "Claude Code", family: "claude", tint: "blue",
    persona: "沉稳的系统型选手，先想清楚边界和契约再动手。措辞简洁、就事论事。", voice: "克制、直接" },
  { id: "yan",  name: "砚", role: "安全 / 审查",   model: "Codex",       family: "gpt",    tint: "green",
    persona: "多疑的审查者，专挑边界漏洞和安全隐患。跨模型复核里唱红脸的那个。", voice: "严谨、爱质疑" },
  { id: "jin",  name: "金", role: "多模型编码",     model: "opencode",    family: "oc",     tint: "red",
    persona: "灵活的多面手，什么模型顺手用什么。补位、救火、跑通。", voice: "务实、随和" },
  // 写作
  { id: "mo",   name: "墨", role: "小说主笔",       model: "Claude Code", family: "claude", tint: "violet",
    persona: "文字冷峻意象化，擅长长篇结构与人物弧线。求量先出初稿。", voice: "冷峻、意象" },
  { id: "tan",  name: "檀", role: "编辑 / 润色",    model: "Codex",       family: "gpt",    tint: "amber",
    persona: "细致的编辑，盯文风一致性和伏笔回收。定稿求准。", voice: "细腻、挑剔" },
  // 短剧 / 电影
  { id: "shuo", name: "烁", role: "视觉 / 分镜",    model: "Gemini",      family: "gemini", tint: "yellow",
    persona: "画面感强，分镜快准狠。短剧求节奏，电影里听导演定调。", voice: "利落、视觉化" },
  { id: "xian2",name: "弦", role: "配乐 / 声音",    model: "Gemini",      family: "gemini", tint: "slate",
    persona: "声音设计与配乐，延续作品主题动机。", voice: "感性、重氛围" },
  { id: "zheng",name: "帧", role: "导演 / 剪辑",    model: "opencode",    family: "oc",     tint: "red",
    persona: "长片导演思维，先结构后分镜，掌控整体调性与剪辑节奏。", voice: "掌控、有主见" },
];

// ---- teams（顶层常驻花名册；不同项目派不同队，skill 不同）----
const TEAMS = [
  {
    id: "app-dev", name: "开发队", kind: "coding",
    member_ids: ["xian", "yan", "jin"],
    skills: ["系统架构", "TDD", "跨模型复核", "PR 门禁", "调试"],
  },
  {
    id: "writing", name: "写作队", kind: "novel",
    member_ids: ["mo", "tan"],
    skills: ["章节写作", "人物弧线", "伏笔管理", "文风一致性"],
  },
  {
    id: "drama", name: "短剧队", kind: "drama",
    member_ids: ["shuo", "xian2"],
    skills: ["分镜脚本", "短平快节奏", "配乐", "渲染合成"],
  },
  {
    id: "film", name: "电影队", kind: "film",
    member_ids: ["shuo", "zheng", "xian2"],
    skills: ["长片结构", "分镜设计", "调色", "剪辑", "配乐"],
  },
];

// ---- projects（中心对象；各有主责队 + 派驻成员）----
const PROJECTS = [
  {
    id: "novel-x", name: "《墨痕》长篇", color: "#8b6fb0", medium: "novel", kind: "小说",
    desc: "一部悬疑长篇，初稿 → 润色 → 定稿跨多轮迭代。",
    team_id: "writing", member_ids: ["mo", "tan"],
    last_thread: "th-nov-7",
  },
  {
    id: "drama-s2", name: "短剧《夜行》S2", color: "#c98fd6", medium: "video", kind: "短剧",
    desc: "竖屏短剧第二季，一集一分镜一渲染，节奏快。",
    team_id: "drama", member_ids: ["shuo", "xian2"],
    last_thread: "th-dra-3",
  },
  {
    id: "film-noir", name: "电影《雾港》", color: "#6b8fae", medium: "video", kind: "电影",
    desc: "长片项目，结构 → 分镜 → 拍摄 → 剪辑 → 调色。",
    team_id: "film", member_ids: ["shuo", "zheng", "xian2"],
    last_thread: "th-film-1",
  },
  {
    id: "foo-app", name: "foo-app", color: "#7c9cf5", medium: "app", kind: "App 开发",
    desc: "一个带 OAuth 的 Web 应用；跨模型复核 + PR 门禁。",
    team_id: "app-dev", member_ids: ["xian", "yan", "jin"],
    last_thread: "th-foo-12",
  },
];

// ---- issues（Board 卡；与 thread 松耦合，一 issue 可关联多个 thread）----
const ISSUES = [
  {
    id: "foo-12", project_id: "foo-app", status: "blocked", title: "接入 OAuth 登录",
    holder: "yan", gate: { kind: "L0 Push" }, priority: "high",
    thread_ids: ["th-foo-12"],
    desc: "给 foo-app 加第三方登录，首期只做 GitHub OAuth。回调要防 CSRF，session 存 httpOnly cookie。跨 family 互审后再 push。",
    acceptance: [
      { text: "GitHub OAuth 跑通", done: true },
      { text: "state 防 CSRF", done: true },
      { text: "push feat/oauth", done: false },
    ],
    comments: [
      { from: "you", text: "先支持 GitHub 就行，其它 provider 以后再说。", time: "3d" },
      { from: "yan", text: "跨模型审出 exchange 缺 state 校验，已补。现在卡在 push 需要你放行 L0。", time: "1h" },
    ],
  },
  {
    id: "foo-9", project_id: "foo-app", status: "review", title: "登录页 UI",
    holder: "shuo", gate: null, priority: "mid", thread_ids: ["th-foo-9"],
    desc: "登录页视觉 + 交互。OAuth 按钮、移动端响应式、loading 态齐了才算完。",
    acceptance: [
      { text: "OAuth 按钮", done: true },
      { text: "移动端响应式", done: true },
      { text: "loading 态", done: false },
    ],
    comments: [
      { from: "jin", text: "多模型审过响应式没问题，建议补 loading 态，已提变更包。", time: "2h" },
    ],
  },
  {
    id: "foo-14", project_id: "foo-app", status: "todo", title: "登录错误态提示",
    holder: null, gate: null, thread_ids: [], acceptance: [],
  },
  {
    id: "nov-7", project_id: "novel-x", status: "review", title: "第七章 定稿",
    holder: "tan", gate: null, priority: "mid", thread_ids: ["th-nov-7"],
    desc: "第七章按上次方向重写，拉起结尾悬念，回收第三章火车伏笔。定稿前核对伏笔清单。",
    acceptance: [
      { text: "结尾悬念", done: true },
      { text: "第三章伏笔呼应", done: true },
      { text: "字数 ≥ 4000", done: false },
    ],
    comments: [
      { from: "tan", text: "润色完成（右边 v2），埋了和第三章呼应的伏笔。字数还差一点，要不要扩写一段？", time: "1h" },
    ],
  },
  {
    id: "nov-3", project_id: "novel-x", status: "doing", title: "人物关系线梳理",
    holder: "mo", gate: null, thread_ids: ["th-nov-3"], acceptance: [],
  },
  {
    id: "dra-3", project_id: "drama-s2", status: "done", title: "第 3 集 分镜→渲染",
    holder: "shuo", gate: null, thread_ids: ["th-dra-3"],
    acceptance: [
      { text: "分镜过审", done: true },
      { text: "配乐合成", done: true },
      { text: "成片渲染", done: true },
    ],
  },
  {
    id: "dra-4", project_id: "drama-s2", status: "todo", title: "第 4 集 剧本",
    holder: null, gate: null, thread_ids: [], acceptance: [],
  },
  {
    id: "film-1", project_id: "film-noir", status: "doing", title: "第一幕 分镜设计",
    holder: "shuo", gate: null, thread_ids: ["th-film-1"], acceptance: [],
  },
];

// ---- threads（对话线程；kind=direct 无 issue / kind=issue 关联 issue）----
// sessions[] = 接力链（chain）：每段 = 一个 soul 的独立 Session
const THREADS = [
  // —— foo-app：issue 驱动 · 跨模型复核 chain ——
  {
    id: "th-foo-12", project_id: "foo-app", issue_id: "foo-12", kind: "issue",
    title: "接入 OAuth 登录", status: "blocked", artifact_id: null,
    sessions: [
      { soul: "xian", role: "build",  status: "done",    label: "起草 authProvider" },
      { soul: "yan",  role: "review", status: "done",    label: "跨模型安全审", from: "xian" },
      { soul: "yan",  role: "build",  status: "blocked", label: "补 CSRF + 请求 push", from: "yan" },
    ],
    messages: [
      { s: 0, from: "you",  text: "给 foo-app 加 OAuth 登录，先支持 GitHub。" },
      { s: 0, from: "xian", text: "已起草 authProvider + 回调路由。@砚 你跨模型审一下安全面。", handoff: "yan" },
      { s: 1, kind: "diff", from: "xian", file: "src/auth/oauth.ts", body: "+ export async function handleCallback(code) {\n+   const token = await exchange(code)\n+   return session.create(token)\n+ }" },
      { s: 1, from: "yan",  text: "审过（Codex 视角）：exchange 缺 state 校验，有 CSRF 风险。我来补。", family_note: "跨 family 互审：宪(Claude) 写 → 砚(GPT) 审" },
      { s: 2, from: "yan",  text: "已补 state 校验。现在要 push feat/oauth 分支 —— 需要你放行（L0）。" },
      { s: 2, kind: "approval", title: "Push feat/oauth（L0）", detail: "砚请求把 feat/oauth 推到 origin。外发网络类动作，需你放行。" },
    ],
  },
  {
    id: "th-foo-9", project_id: "foo-app", issue_id: "foo-9", kind: "issue",
    title: "登录页 UI", status: "review", artifact_id: "art-login",
    sessions: [
      { soul: "shuo", role: "build",  status: "done", label: "画登录页 v9" },
      { soul: "jin",  role: "review", status: "done", label: "多模型审响应式", from: "shuo" },
    ],
    messages: [
      { s: 0, from: "you",  text: "登录页做出来了吗，想看看。" },
      { s: 0, from: "shuo", text: "v9 好了，右边可以直接跑。@金 你从多模型角度看看响应式。", handoff: "jin" },
      { s: 1, from: "jin",  text: "移动端断点没问题。建议加 loading 态，我提个变更包。" },
    ],
  },
  // —— foo-app：项目级直接 chat（无 issue）——
  {
    id: "th-foo-explore", project_id: "foo-app", issue_id: null, kind: "direct",
    title: "随手：本地 RAG 选型", status: "open", artifact_id: null,
    sessions: [
      { soul: "xian", role: "ask", status: "idle", label: "探索讨论" },
    ],
    messages: [
      { s: 0, from: "you",  text: "还没到建 issue 的程度——先随手问下，本地 RAG 用 pgvector 还是 sqlite-vss？" },
      { s: 0, from: "xian", text: "小规模 sqlite-vss 够且零运维；上量再换 pgvector。要不要我开个 issue 正式调研？" },
      { s: 0, kind: "promote", text: "把这条 thread 提升为 Issue（团队自动拉取跟进）" },
    ],
  },

  // —— novel-x：定稿 chain（写 → 编辑润色）——
  {
    id: "th-nov-7", project_id: "novel-x", issue_id: "nov-7", kind: "issue",
    title: "第七章 定稿", status: "review", artifact_id: "art-ch7",
    sessions: [
      { soul: "mo",  role: "build",  status: "done", label: "重写第七章" },
      { soul: "tan", role: "review", status: "done", label: "润色 + 伏笔核对", from: "mo" },
    ],
    messages: [
      { s: 0, from: "you", text: "第七章按上次方向重写，把结尾悬念拉起来。" },
      { s: 0, from: "mo",  text: "初稿好了。@檀 你润一下，顺便核对和第三章的伏笔。", handoff: "tan" },
      { s: 1, from: "tan", text: "润色完成（右边 v2）。结尾埋了和第三章呼应的伏笔。字数还差一点，要不要我扩写一段？" },
    ],
  },
  {
    id: "th-nov-3", project_id: "novel-x", issue_id: "nov-3", kind: "issue",
    title: "人物关系线梳理", status: "doing", artifact_id: null,
    sessions: [{ soul: "mo", role: "ask", status: "active", label: "纯讨论对齐" }],
    messages: [
      { s: 0, from: "you", text: "把主要人物关系和动机理一份，纯讨论，先别写正文。" },
      { s: 0, from: "mo",  text: "三条主线：复仇、赎罪、隐瞒。这条 issue 没产物，就是对齐方向。" },
    ],
  },

  // —— drama-s2：分镜→配乐→渲染 chain（三 soul 接力）——
  {
    id: "th-dra-3", project_id: "drama-s2", issue_id: "dra-3", kind: "issue",
    title: "第 3 集 分镜→渲染", status: "done", artifact_id: "art-ep3",
    sessions: [
      { soul: "shuo",  role: "build", status: "done", label: "分镜脚本" },
      { soul: "xian2", role: "build", status: "done", label: "配乐合成", from: "shuo" },
      { soul: "shuo",  role: "build", status: "done", label: "渲染成片", from: "xian2" },
    ],
    messages: [
      { s: 0, from: "you",  text: "第 3 集按分镜渲染成片。" },
      { s: 0, from: "shuo", text: "分镜出好了。@弦 配个乐。", handoff: "xian2" },
      { s: 1, from: "xian2",text: "配乐合成完（延续上一集主题）。@烁 你渲染。", handoff: "shuo" },
      { s: 2, from: "shuo", text: "v4 渲染完成，右边可播。" },
    ],
  },

  // —— film-noir：第一幕分镜（进行中）——
  {
    id: "th-film-1", project_id: "film-noir", issue_id: "film-1", kind: "issue",
    title: "第一幕 分镜设计", status: "doing", artifact_id: "art-act1",
    sessions: [
      { soul: "zheng", role: "plan",  status: "done",   label: "第一幕结构" },
      { soul: "shuo",  role: "build", status: "active", label: "分镜绘制", from: "zheng" },
    ],
    messages: [
      { s: 0, from: "you",   text: "第一幕先定结构再画分镜。雾港开场，冷调。" },
      { s: 0, from: "zheng", text: "结构定了：三场戏，港口→酒馆→追逐。@烁 按这个画分镜，冷蓝调。", handoff: "shuo" },
      { s: 1, from: "shuo",  text: "前两场分镜草图出了（右边画廊 v2）。追逐戏还在画。" },
    ],
  },
];

// ---- artifacts（项目所有；medium + 版本 + 预览）----
const ARTIFACTS = [
  {
    id: "art-login", project_id: "foo-app", medium: "app", title: "登录页",
    current: "v9", versions: ["v7", "v8", "v9"], unseen: true, trace: "th-foo-9 · 烁/金",
  },
  {
    id: "art-ch7", project_id: "novel-x", medium: "novel", title: "第七章",
    current: "v2", versions: ["v1", "v2"], unseen: true, trace: "th-nov-7 · 墨/檀",
    sample: "夜色像浸了墨的宣纸，一点点洇开。她推开窗，风里有远处火车的气味……",
  },
  {
    id: "art-manuscript", project_id: "novel-x", medium: "novel", title: "全书稿（初→润→定）",
    current: "v6", versions: ["v1", "v2", "v3", "v4", "v5", "v6"], unseen: false, trace: "跨多 issue 迭代",
    sample: "第一部 · 墨痕\n\n他记得那年的雨，下得像要把整座城拆开重装。",
  },
  {
    id: "art-ep3", project_id: "drama-s2", medium: "video", title: "第 3 集 成片",
    current: "v4", versions: ["v1", "v2", "v3", "v4"], unseen: true, trace: "th-dra-3 · 烁/弦",
  },
  {
    id: "art-poster", project_id: "drama-s2", medium: "image", title: "S2 海报",
    current: "v3", versions: ["v1", "v2", "v3"], unseen: false, trace: "th-dra-poster · 烁",
  },
  {
    id: "art-act1", project_id: "film-noir", medium: "image", title: "第一幕 分镜",
    current: "v2", versions: ["v1", "v2"], unseen: true, trace: "th-film-1 · 烁",
  },
];

// ---- workspace 文件树（每项目：扁平路径，渲染时按 / 构建树）----
const FILES = {
  "foo-app": [
    { p: "src/auth/oauth.ts", tag: "改", ext: "ts" },
    { p: "src/auth/state.ts", tag: "改", ext: "ts" },
    { p: "src/pages/login.tsx", tag: "改", ext: "tsx" },
    { p: "src/pages/home.tsx", ext: "tsx" },
    { p: "src/lib/session.ts", ext: "ts" },
    { p: "src/lib/db.ts", ext: "ts" },
    { p: "tests/oauth.test.ts", ext: "ts" },
    { p: "package.json", ext: "json" },
    { p: "AGENTS.md", tag: "入口", ext: "md" },
  ],
  "novel-x": [
    { p: "manuscript/ch07.md", tag: "改", ext: "md" },
    { p: "manuscript/ch01-06.md", ext: "md" },
    { p: "notes/人物关系.md", ext: "md" },
    { p: "notes/伏笔清单.md", ext: "md" },
    { p: "notes/大纲.md", ext: "md" },
    { p: "AGENTS.md", tag: "入口", ext: "md" },
  ],
  "drama-s2": [
    { p: "ep3/storyboard.pdf", ext: "pdf" },
    { p: "ep3/out.mp4", tag: "产物", ext: "mp4" },
    { p: "ep3/score.wav", ext: "wav" },
    { p: "ep4/script.md", tag: "改", ext: "md" },
    { p: "assets/poster.png", ext: "png" },
    { p: "assets/bgm/theme.wav", ext: "wav" },
  ],
  "film-noir": [
    { p: "act1/structure.md", ext: "md" },
    { p: "act1/storyboard/sc01.png", tag: "画中", ext: "png" },
    { p: "act1/storyboard/sc02.png", tag: "画中", ext: "png" },
    { p: "script/draft.fountain", ext: "txt" },
  ],
};

// ---- team 记忆（每项目：跨项目基座 + 本项目切片 + 成长三桶）----
// base[] = 跨项目基座（团队长期资产，弱化只读）
// slice[] = 本项目切片（可编辑，可 ↑ 提升到基座；promoted=true 表示已提升）
// growth[] = 成长三桶：kind principle|pattern|scar
//   src=出处 session/task · recalls=被召回次数（召回才是经验）· level=slice|base（是否已泛化进基座）
const MEMORY = {
  "foo-app": {
    base: ["跨 family 互审：Claude 写 → GPT 审", "PR 必过 lint + typecheck 门禁", "push / 外发一律 L0 人批"],
    slice: [
      { text: "本项目用 GitHub OAuth + 托管 IdP（已定）", promoted: false },
      { text: "session 存 httpOnly cookie", promoted: false },
      { text: "回调必须校验 state（防 CSRF）", promoted: true },
    ],
    growth: [
      { kind: "scar", text: "漏 state 校验被砚在跨模型复核中拦下，有 CSRF 风险", src: "th-foo-12 · 砚 review", recalls: 4, level: "base", cat: "边界泄漏" },
      { kind: "pattern", text: "宪写→砚跨模型审→宪改 的三段接力，把安全缺陷挡在 push 前", src: "th-foo-12", recalls: 3, level: "slice" },
      { kind: "pattern", text: "登录页响应式一次过，金的多模型审有效", src: "th-foo-9 · 金", recalls: 1, level: "slice" },
    ],
  },
  "novel-x": {
    base: ["初稿求量、润色求质、定稿求准", "伏笔必须登记进 notes/伏笔清单.md"],
    slice: [
      { text: "文风：冷峻 + 意象化，短句收尾", promoted: false },
      { text: "主角内心独白不超两段", promoted: false },
      { text: "第三章埋的火车伏笔要在第七 / 十二章回收", promoted: false },
    ],
    growth: [
      { kind: "pattern", text: "墨→檀 写→润 接力流程，让定稿速度翻倍", src: "th-nov-7", recalls: 5, level: "base" },
      { kind: "scar", text: "第五章未核对伏笔清单，出现人物动机矛盾", src: "ch05 · 墨", recalls: 2, level: "slice", cat: "语义漂移" },
      { kind: "principle", text: "定稿前强制核对伏笔清单，不凭记忆", src: "ch05 复盘", recalls: 3, level: "slice" },
    ],
  },
  "drama-s2": {
    base: ["一集一分镜一渲染，快节奏", "配乐延续季主题"],
    slice: [
      { text: "竖屏 9:16，前 3 秒必须抓人", promoted: false },
      { text: "第 3 集主题曲复用到全季", promoted: false },
    ],
    growth: [
      { kind: "pattern", text: "烁→弦→烁 三段接力把分镜 / 配乐 / 渲染串成流程", src: "th-dra-3", recalls: 2, level: "slice" },
    ],
  },
  "film-noir": {
    base: ["先结构后分镜，导演定调"],
    slice: [
      { text: "全片冷蓝调", promoted: false },
      { text: "雾港 = 反复出现的空间母题", promoted: false },
    ],
    growth: [],
  },
};

// ---- Postings（派驻：Project 所有的一等关系实体。soul × project 绑定实例）----
// 同一 soul 派驻不同项目 = 不同 Posting：不同 role / autonomy / skill 挂载 / 权限
// autonomy 档：L0 仅建议 · L1 可逆自动 · L2 可回滚自动 · L3 不可逆需人批
// perms: 每类动作 allow | interrupt(触发人批) | deny
const POSTINGS = {
  "foo-app": [
    { soul: "xian", role: "架构 / 主开发", autonomy: "L2", skills: ["系统架构", "TDD", "调试"],
      perms: { 读文件: "allow", 写文件: "allow", 装依赖: "interrupt", push外发: "interrupt", 删除: "interrupt" } },
    { soul: "yan", role: "安全审查", autonomy: "L1", skills: ["跨模型复核", "PR 门禁"],
      perms: { 读文件: "allow", 写文件: "allow", 装依赖: "interrupt", push外发: "interrupt", 删除: "deny" } },
    { soul: "jin", role: "多模型编码", autonomy: "L1", skills: ["跨模型复核", "调试"],
      perms: { 读文件: "allow", 写文件: "allow", 装依赖: "interrupt", push外发: "deny", 删除: "deny" } },
  ],
  "novel-x": [
    { soul: "mo", role: "主笔", autonomy: "L2", skills: ["章节写作", "人物弧线", "伏笔管理"],
      perms: { 读文件: "allow", 写文件: "allow", 装依赖: "deny", push外发: "deny", 删除: "interrupt" } },
    { soul: "tan", role: "编辑 / 润色", autonomy: "L1", skills: ["文风一致性", "伏笔管理"],
      perms: { 读文件: "allow", 写文件: "allow", 装依赖: "deny", push外发: "deny", 删除: "deny" } },
  ],
  "drama-s2": [
    // 烁在短剧队：分镜主力，autonomy 高
    { soul: "shuo", role: "视觉 / 分镜", autonomy: "L2", skills: ["分镜脚本", "短平快节奏", "渲染合成"],
      perms: { 读文件: "allow", 写文件: "allow", 装依赖: "interrupt", push外发: "interrupt", 删除: "interrupt" } },
    { soul: "xian2", role: "配乐 / 声音", autonomy: "L1", skills: ["配乐"],
      perms: { 读文件: "allow", 写文件: "allow", 装依赖: "deny", push外发: "deny", 删除: "deny" } },
  ],
  "film-noir": [
    // 同一个烁在电影队：只做分镜执行，导演定调，autonomy 收到 L1（对比 drama-s2 的 L2）
    { soul: "shuo", role: "分镜执行", autonomy: "L1", skills: ["分镜设计", "调色"],
      perms: { 读文件: "allow", 写文件: "interrupt", 装依赖: "deny", push外发: "deny", 删除: "deny" } },
    { soul: "zheng", role: "导演 / 剪辑", autonomy: "L2", skills: ["长片结构", "剪辑", "调色"],
      perms: { 读文件: "allow", 写文件: "allow", 装依赖: "interrupt", push外发: "interrupt", 删除: "interrupt" } },
    { soul: "xian2", role: "配乐 / 声音", autonomy: "L1", skills: ["配乐"],
      perms: { 读文件: "allow", 写文件: "allow", 装依赖: "deny", push外发: "deny", 删除: "deny" } },
  ],
};

// ---- 项目级配置（loop 预算 / 导出目标 / workspace 根）----
const PROJECT_CONFIG = {
  "foo-app":   { workspace_root: "~/projects/foo-app", export_target: "GitHub · feat 分支 PR", loop_budget: "每 issue ≤ 40 turn / ≤ $2", collab: "workflow" },
  "novel-x":   { workspace_root: "~/writing/mohen",   export_target: "本地 manuscript/ + EPUB 导出", loop_budget: "每章 ≤ 30 turn", collab: "free" },
  "drama-s2":  { workspace_root: "~/video/yexing-s2", export_target: "成片 mp4 → 发布队列",       loop_budget: "每集 ≤ 25 turn", collab: "workflow" },
  "film-noir": { workspace_root: "~/film/wugang",     export_target: "剪辑工程 + 样片",             loop_budget: "每幕 ≤ 50 turn", collab: "workflow" },
};

// ---- WorkflowRun（PROTOTYPE：Run 是独立执行对象，Thread 只负责来源/旁路讨论）----
// 问题：Chat 摘要、Steps 工作台、Graph 画布之间如何自然跳转？
const WORKFLOWS = [
  {
    id: "run-oauth-17", workflow_id: "oauth-delivery", workflow_version: "v3",
    project_id: "foo-app", issue_id: "foo-12",
    source_thread_id: "th-foo-12", discussion_thread_id: "th-foo-12",
    title: "OAuth 安全交付", status: "blocked", current_step_id: "push-approval",
    started_at: "09:20", elapsed: "38m", budget: "$1.42 / $2.00",
    steps: [
      {
        id: "plan", kind: "ai", title: "拆解方案", owner: "xian", status: "done",
        depends_on: [], duration: "4m", workspace: "shared",
        result: { summary: "确定 GitHub OAuth、state 防 CSRF、httpOnly cookie。", artifacts: ["设计摘要"] },
      },
      {
        id: "plan-gate", kind: "approval", title: "批准执行计划", owner: null, status: "done",
        depends_on: ["plan"], duration: "1m", result: { summary: "Principal 已批准 OAuth 首期范围。" },
      },
      {
        id: "implement", kind: "ai", title: "实现 OAuth 回调", owner: "xian", status: "done",
        depends_on: ["plan-gate"], duration: "16m", workspace: "wt/oauth-impl",
        result: { summary: "完成 authProvider 与 callback route。", artifacts: ["src/auth/oauth.ts", "src/auth/session.ts"] },
      },
      {
        id: "test", kind: "command", title: "测试与 lint", owner: null, status: "done",
        depends_on: ["implement"], duration: "3m", command: "pnpm test auth && pnpm lint",
        result: { summary: "18 tests passed · lint clean", fields: { tests: 18, failures: 0 } },
      },
      {
        id: "security-review", kind: "ai", title: "跨模型安全复核", owner: "yan", status: "done",
        depends_on: ["implement", "test"], duration: "11m", workspace: "wt/oauth-review",
        result: { summary: "发现 state 缺失并完成修复；复测通过。", issues: ["CSRF state 校验缺失（已修）"] },
      },
      {
        id: "push-approval", kind: "approval", title: "Push feat/oauth", owner: "yan", status: "blocked",
        depends_on: ["security-review"], duration: "3m", gate: "L0 · 外发网络",
        result: { summary: "等待 Principal 放行。" },
      },
      {
        id: "closeout", kind: "ai", title: "Closeout 与交审", owner: "yan", status: "pending",
        depends_on: ["push-approval"], duration: "—", workspace: "shared",
        result: { summary: "Push 后写 Closeout，并用 tracker 把 Issue 推到 In Review。" },
      },
    ],
  },
];

// ---- Inbox（跨项目事件回声）----
const INBOX = [
  { kind: "gate",   kindLabel: "硬门",  project_id: "foo-app",  thread_id: "th-foo-12", text: "砚请求放行：Push feat/oauth（L0）", time: "刚" },
  { kind: "review", kindLabel: "待验收", project_id: "novel-x",  thread_id: "th-nov-7",  text: "第七章定稿待你验收", time: "1h" },
  { kind: "done",   kindLabel: "跑完",  project_id: "drama-s2", thread_id: "th-dra-3",  text: "第 3 集渲染完成 · 新版本 v4", time: "12m" },
];

const DATA = {
  souls: SOULS, teams: TEAMS, projects: PROJECTS,
  issues: ISSUES, threads: THREADS, artifacts: ARTIFACTS,
  files: FILES, memory: MEMORY, inbox: INBOX,
  postings: POSTINGS, config: PROJECT_CONFIG, workflows: WORKFLOWS,
};
