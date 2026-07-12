/* PROTOTYPE · M0.4.0 对话中心 · mock 数据（throwaway）
 *
 * 心智：Issue 是唯一耐久工作对象。
 *   拉远 = Board（issues 按 status 分列）
 *   拉近 = Chat（issue.chat）+ 活产物（issue.artifact，条件项）
 *   Team = souls 花名册（各背模型/CLI）
 *   Project = 必选文件夹；inbox 兜底游离 issue
 *
 * 本文件的形状由 views.js 的渲染契约决定：
 *   DATA.souls[]    { id, name, emoji, role, model, family }
 *   DATA.projects[] { id, name, color, medium, team, souls:[soulId] }
 *   DATA.issues[]   { id, project_id, status, title, holder, gate, mentionsYou, artifact, chat[] }
 *   DATA.inbox[]    { kind, kindLabel, text, time, issue }
 */

// ---- souls 花名册（各背模型 CLI）----
const SOULS = [
  { id: "xian", name: "宪", role: "架构 / 主开发", model: "Claude Code", family: "claude", tint: "blue" },
  { id: "yan",  name: "砚", role: "安全 / 审查",   model: "Codex",       family: "gpt",    tint: "green" },
  { id: "shuo", name: "烁", role: "视觉 / 创意",   model: "Gemini",      family: "gemini", tint: "yellow" },
  { id: "jin",  name: "金", role: "多模型编码",     model: "opencode",    family: "oc",     tint: "red" },
];

// ---- projects（必选文件夹；inbox 兜底游离 issue）----
const PROJECTS = [
  { id: "foo-app",  name: "foo-app",  color: "#7c9cf5", medium: "app",   team: "app-dev", souls: ["xian", "yan", "jin"] },
  { id: "novel-x",  name: "novel-x",  color: "#e0a458", medium: "novel", team: "writing", souls: ["shuo", "xian"] },
  { id: "drama-s2", name: "drama-s2", color: "#c98fd6", medium: "video", team: "writing", souls: ["shuo", "jin"] },
  { id: "inbox",    name: "inbox",    color: "#8a8f98", medium: "mixed", team: "app-dev", souls: ["xian", "yan", "shuo", "jin"] },
];

// ---- issues（唯一耐久对象：一件事 = 一条线程）----
const ISSUES = [
  {
    id: "foo-12", project_id: "foo-app", status: "blocked", title: "接入 OAuth 登录",
    holder: "yan", mentionsYou: false,
    gate: { kind: "L0 Push" },
    artifact: null,
    chat: [
      { from: "you",  text: "给 foo-app 加 OAuth 登录，先支持 GitHub。" },
      { from: "xian", text: "已起草 authProvider + 回调路由。@砚 你这边跨模型审一下安全面。" },
      { kind: "diff", from: "xian", file: "src/auth/oauth.ts", body: "+ export async function handleCallback(code) {\n+   const token = await exchange(code)\n+   return session.create(token)\n+ }" },
      { from: "yan",  text: "审过：exchange 要校验 state 防 CSRF。已补。现在要 push feat/oauth 分支——需要你放行（L0）。" },
      { kind: "approval", title: "Push feat/oauth（L0）", detail: "砚请求把 feat/oauth 推到 origin。写盘/外发网络类动作，需你放行。" },
    ],
  },
  {
    id: "foo-15", project_id: "foo-app", status: "doing", title: "选择 IdP 方案",
    holder: "xian", mentionsYou: true,
    gate: { kind: "need_input" },
    artifact: null,
    chat: [
      { from: "you",  text: "OAuth 之外，我们要不要自建 IdP，还是用托管的？" },
      { kind: "decision", title: "IdP 方案（等你拍板，方向决策）", options: ["托管（Auth0/Clerk）", "自建（Ory/Keycloak）", "先托管，M2 再评估自建"] },
      { from: "xian", text: "我倾向先托管，快且省运维。@你 定了我就接着做登录页。" },
    ],
  },
  {
    id: "foo-14", project_id: "foo-app", status: "todo", title: "登录错误态提示",
    holder: null, mentionsYou: false,
    gate: null,
    artifact: null,
    chat: [
      { from: "you", text: "从 foo-12 拆出来：登录失败要有红字提示，别静默。" },
    ],
  },
  {
    id: "foo-9", project_id: "foo-app", status: "review", title: "登录页 UI",
    holder: "shuo", mentionsYou: false,
    gate: null,
    acceptance: [
      { text: "GitHub OAuth 按钮", done: true },
      { text: "移动端响应式", done: true },
      { text: "loading 态", done: false },
    ],
    artifact: {
      medium: "app", title: "登录页 v9", current: "v9", versions: ["v7", "v8", "v9"],
      unseen: true, trace: "wi foo-9 @writing · sess-8",
    },
    chat: [
      { from: "you",  text: "登录页做出来了吗，想看看。" },
      { from: "shuo", text: "v9 好了，右边可以直接跑。@金 你从多模型角度看看响应式。" },
      { kind: "diff", from: "shuo", file: "src/pages/login.tsx", body: "+ <form className=\"login\">\n+   <OAuthButton provider=\"github\" />\n+ </form>" },
      { from: "jin",  text: "移动端断点没问题。建议加 loading 态，我提个变更包。" },
    ],
  },
  {
    id: "nov-7", project_id: "novel-x", status: "review", title: "第七章 定稿",
    holder: "shuo", mentionsYou: true,
    gate: null,
    acceptance: [
      { text: "结尾悬念拉起来", done: true },
      { text: "和第三章呼应的伏笔", done: true },
      { text: "字数 ≥ 4000", done: false },
    ],
    artifact: {
      medium: "novel", title: "第七章", current: "v2", versions: ["v1", "v2"],
      unseen: true, trace: "wi nov-7 @writing · sess-3",
      sample: "夜色像浸了墨的宣纸，一点点洇开。她推开窗，风里有远处火车的气味……",
    },
    chat: [
      { from: "you",  text: "第七章按上次说的方向重写，把结尾的悬念拉起来。" },
      { from: "shuo", text: "v2 定稿了，右边可读。结尾埋了个和第三章呼应的伏笔。@你 验收一下。" },
    ],
  },
  {
    id: "nov-4", project_id: "novel-x", status: "doing", title: "梳理人物关系线",
    holder: "xian", mentionsYou: false,
    gate: null,
    artifact: null,
    chat: [
      { from: "you", text: "把主要人物的关系和动机理一份大纲，纯讨论，先不要写正文。" },
      { from: "xian", text: "在整理。三条主线，我列个关系图给你——这条 issue 没产物，就是我们对齐方向。" },
    ],
  },
  {
    id: "dra-3", project_id: "drama-s2", status: "done", title: "第 3 集分镜 → 渲染",
    holder: "shuo", mentionsYou: false,
    gate: null,
    artifact: {
      medium: "video", title: "第 3 集成片", current: "v4", versions: ["v1", "v2", "v3", "v4"],
      unseen: true, trace: "wi dra-3 @writing · sess-5",
    },
    chat: [
      { from: "you",  text: "第 3 集按分镜渲染成片。" },
      { from: "shuo", text: "v4 渲染完成，右边可播。配乐用了上次那版。" },
    ],
  },
  {
    id: "dra-1", project_id: "drama-s2", status: "todo", title: "第 4 集剧本",
    holder: null, mentionsYou: false,
    gate: null,
    artifact: null,
    chat: [
      { from: "you", text: "第 4 集剧本，延续第 3 集结尾。" },
    ],
  },
  {
    id: "inbox-2", project_id: "inbox", status: "triage", title: "调研本地 RAG 方案",
    holder: null, mentionsYou: false,
    gate: null,
    artifact: null,
    chat: [
      { from: "you", text: "随手记：调研下本地 RAG，pgvector vs sqlite-vss。还没归到项目——先落 inbox，认真了再移进正式 project。" },
    ],
  },
];

// ---- Inbox 事件（异步回声：@你 / 硬门 / 跑完 / 待审）----
const INBOX = [
  { kind: "gate",   kindLabel: "硬门",  issue: "foo-12", text: "砚请求放行：Push feat/oauth（L0）", time: "刚" },
  { kind: "gate",   kindLabel: "待拍板", issue: "foo-15", text: "宪等你定：用哪个 IdP？",            time: "5m" },
  { kind: "done",   kindLabel: "跑完",  issue: "dra-3",  text: "第 3 集渲染完成 · 新版本 v4",       time: "12m" },
  { kind: "review", kindLabel: "待验收", issue: "nov-7",  text: "第七章定稿待你验收",               time: "1h" },
];

// ---- 聚合出 views.js / app.js 消费的 DATA ----
const DATA = {
  souls: SOULS,
  projects: PROJECTS,
  issues: ISSUES,
  inbox: INBOX,
};
