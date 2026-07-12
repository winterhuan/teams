// PROTOTYPE — in-memory mock only
window.HEARTH_DATA = {
  principal: "winter",
  gates: [
    {
      id: "ap-1",
      kind: "L0",
      title: "rm -rf dist 后重建",
      project_id: "foo-app",
      workitem_id: "wi-19",
      risk: "destructive",
    },
    {
      id: "ap-2",
      kind: "need_input",
      title: "第 3 集配乐用 A 还是 B？",
      project_id: "drama-s2",
      workitem_id: "wi-12",
      risk: "choice",
    },
  ],
  teams: {
    "writing-team": { id: "writing-team", name: "写作队", color: "#c4a35a" },
    "short-drama": { id: "short-drama", name: "短剧队", color: "#e07a5f" },
    "app-dev": { id: "app-dev", name: "应用开发", color: "#3d8bfd" },
  },
  projects: {
    "novel-x": {
      id: "novel-x",
      name: "北境长夜",
      medium: "novel",
      primary_team_id: "writing-team",
      status: "active",
      running: 1,
      summary: "奇幻长篇 · 第 7 章刚定稿",
    },
    "drama-s2": {
      id: "drama-s2",
      name: "短剧 S2",
      medium: "video",
      primary_team_id: "short-drama",
      status: "active",
      gates: 1,
      running: 1,
      summary: "分镜 v4 渲染完成 · 待选配乐",
    },
    "foo-app": {
      id: "foo-app",
      name: "Hearth Companion",
      medium: "app",
      primary_team_id: "app-dev",
      status: "active",
      gates: 1,
      running: 0,
      summary: "登录页 v9 可预览 · 硬门 1",
    },
    "empty-lab": {
      id: "empty-lab",
      name: "空项目实验",
      medium: "other",
      primary_team_id: "app-dev",
      status: "active",
      running: 0,
      summary: "还没有任何产物",
    },
  },
  artifacts: {
    "art-ch7": {
      id: "art-ch7",
      project_id: "novel-x",
      title: "第七章 · 雪线以南",
      medium: "novel",
      status: "ready",
      unseen: true,
      current_rev: 2,
      cover: "📖",
      cover_tone: "#2c2416",
      versions: [
        { rev: 2, note: "定稿 · 加了第 3 幕转折", at: "12 分钟前", produced_by: "wi-42" },
        { rev: 1, note: "初稿", at: "昨天", produced_by: "wi-40" },
      ],
      body:
        "雪线以南的风是湿的。\n\n卡林把披风往上拉了拉，靴底碾过半融的泥。三天前斥候报称「北境无异动」——可他闻到的不是松脂，是铁。\n\n「别回头。」向导说。\n\n他回头了。\n\n山脊上立着一排影子，静得像还没画完的插图……",
    },
    "art-outline": {
      id: "art-outline",
      project_id: "novel-x",
      title: "全书大纲 v3",
      medium: "doc",
      status: "in_progress",
      unseen: false,
      current_rev: 3,
      cover: "🗂",
      cover_tone: "#1e2430",
      versions: [{ rev: 3, note: "收束线 B", at: "3 天前", produced_by: "wi-38" }],
      body: "第一卷：启程 · 第二卷：雪线 · 第三卷：王庭……",
    },
    "art-ep3": {
      id: "art-ep3",
      project_id: "drama-s2",
      title: "第 3 集分镜",
      medium: "video",
      status: "ready",
      unseen: true,
      current_rev: 4,
      cover: "▶",
      cover_tone: "#1a1210",
      versions: [
        { rev: 4, note: "渲染成片 · 待配乐", at: "刚落地", produced_by: "wi-12" },
        { rev: 3, note: "分镜修订", at: "2 小时前", produced_by: "wi-11" },
        { rev: 2, note: "粗剪", at: "昨天", produced_by: "wi-10" },
      ],
      body: null,
      player_label: "EP03 · 04:12 / 08:40",
    },
    "art-poster": {
      id: "art-poster",
      project_id: "drama-s2",
      title: "S2 主视觉海报",
      medium: "image",
      status: "published",
      unseen: false,
      current_rev: 3,
      cover: "🖼",
      cover_tone: "#2a1814",
      versions: [{ rev: 3, note: "最终色", at: "上周", produced_by: "wi-08" }],
    },
    "art-login": {
      id: "art-login",
      project_id: "foo-app",
      title: "登录页",
      medium: "app",
      status: "ready",
      unseen: true,
      current_rev: 9,
      cover: "▷",
      cover_tone: "#0f1a28",
      versions: [
        { rev: 9, note: "可运行 · OAuth 按钮", at: "40 分钟前", produced_by: "wi-19" },
        { rev: 8, note: "暗色主题", at: "昨天", produced_by: "wi-18" },
      ],
      app_url: "about:blank",
      app_mock: true,
    },
    "art-api": {
      id: "art-api",
      project_id: "foo-app",
      title: "auth 模块 diff",
      medium: "code",
      status: "in_progress",
      unseen: false,
      current_rev: 2,
      cover: "{ }",
      cover_tone: "#12161c",
      versions: [{ rev: 2, note: "拆 session store", at: "昨天", produced_by: "wi-17" }],
      body: "+ export function createSession() {\n+   return { id: crypto.randomUUID() }\n+ }",
    },
  },
  workitems: {
    "wi-42": {
      id: "wi-42",
      project_id: "novel-x",
      title: "润色第七章",
      status: "in_review",
      team_id: "writing-team",
    },
    "wi-12": {
      id: "wi-12",
      project_id: "drama-s2",
      title: "渲染第 3 集 + 选配乐",
      status: "blocked",
      team_id: "short-drama",
    },
    "wi-19": {
      id: "wi-19",
      project_id: "foo-app",
      title: "登录页 OAuth",
      status: "blocked",
      team_id: "app-dev",
    },
    "wi-07": {
      id: "wi-07",
      project_id: "drama-s2",
      title: "第 4 集脚本",
      status: "todo",
      team_id: "short-drama",
    },
    "wi-01": {
      id: "wi-01",
      project_id: "novel-x",
      title: "人物关系表",
      status: "done",
      team_id: "writing-team",
    },
  },
};

window.HEARTH_HELPERS = {
  esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  },
  mediumLabel(m) {
    return (
      {
        novel: "小说",
        doc: "文档",
        video: "视频",
        image: "图片",
        app: "应用",
        code: "代码",
        other: "其他",
      }[m] || m
    );
  },
  mediumIcon(m) {
    return (
      {
        novel: "📖",
        doc: "📄",
        video: "▶",
        image: "🖼",
        app: "▷",
        code: "{ }",
        other: "·",
      }[m] || "·"
    );
  },
  statusLabel(s) {
    return (
      {
        ready: "可预览",
        in_progress: "进行中",
        published: "已发布",
        draft: "草稿",
        blocked: "硬门",
        in_review: "待验收",
        todo: "待办",
        done: "完成",
      }[s] || s
    );
  },
  unseenArtifacts() {
    return Object.values(HEARTH_DATA.artifacts).filter((a) => a.unseen);
  },
  projectArtifacts(pid) {
    return Object.values(HEARTH_DATA.artifacts).filter((a) => a.project_id === pid);
  },
  projectWork(pid) {
    return Object.values(HEARTH_DATA.workitems).filter((w) => w.project_id === pid);
  },
  teamName(tid) {
    return HEARTH_DATA.teams[tid]?.name || tid || "—";
  },
  projectName(pid) {
    return HEARTH_DATA.projects[pid]?.name || pid || "—";
  },
};
