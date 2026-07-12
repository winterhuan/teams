/**
 * PROTOTYPE M0.2.9 — Project × Team shell variants
 * Question: 壳上谁主谁次？A 队优先 / B 项目优先 / C 双轴矩阵
 * Throwaway in-memory store
 */
(function () {
  const params = new URLSearchParams(location.search);
  const initialVariant = (params.get("variant") || "A").toUpperCase();
  const state = {
    view: "board", // pulse | board | teams — default board to show relation
    uiVariant: ["A", "B", "C"].includes(initialVariant) ? initialVariant : "A",
    teamId: "app-dev",
    projectId: "foo", // B/C 的「当前 Project」
    projectFilter: "all", // A 的 Board 过滤：all | project id | none
    dayCost: 4.2,
    attention: "quiet",
    toast: null,
    scrollToGates: false,
    selectedWorkId: "wi-12",
    selectedLiveId: "sess-a1",
    focusDecisionIndex: 0,
    selectedCommentIds: new Set(),
    teamEditId: "app-dev",
    memberEditId: null,
    detailTab: "overview", // overview | acceptance | comments | files
    memberTab: "identity", // identity | tools | soul | runtime
    descEdit: false,
    commentDraft: "",
    providers: [
      { id: "pi", label: "Pi", health: "ok" },
      { id: "claude", label: "Claude Code", health: "ok" },
      { id: "codex", label: "Codex", health: "degraded" },
    ],
    projects: {
      foo: {
        id: "foo",
        name: "Foo App",
        root_path: "~/projects/foo",
        default_team_id: "app-dev",
        team_ids: ["app-dev"],
        status: "active",
        description: "主产品仓库 · OAuth / login",
      },
      "drama-s2": {
        id: "drama-s2",
        name: "Short Drama S2",
        root_path: "~/projects/drama",
        default_team_id: "short-drama",
        team_ids: ["short-drama"],
        status: "active",
        description: "短剧第二季脚本与分镜",
      },
      "life-notes": {
        id: "life-notes",
        name: "Life Notes",
        root_path: "~/notes",
        default_team_id: "life-ops",
        team_ids: ["life-ops"],
        status: "active",
        description: "人生笔记 / 周报素材",
      },
    },
    log: [
      { ts: "06:41:02", msg: "session.started sess-a1 wi-12 claude project=foo" },
      { ts: "06:42:18", msg: "approval.created appr-01 git.push L0" },
      { ts: "09:10:00", msg: "comment.added wi-12 · header overflow" },
      { ts: "09:12:00", msg: "artifact.published wi-12 .hearth/out/oauth-log.txt" },
    ],
    teams: {
      "app-dev": {
        id: "app-dev",
        name: "App Development",
        domains: ["coding", "backend", "frontend", "pr"],
        default_orchestration: "solo",
        autonomy_default: "L2",
        concurrency: 3,
        lead: "worker",
        default_responder: "worker",
        work_roots: ["~/projects/foo"],
        memory_root: "./memory",
        skills_root: "./skills",
        members: [
          {
            id: "worker",
            display_name: "Worker (Lead)",
            role: "lead",
            provider: "pi",
            model_hint: "default",
            soul: "members/worker/SOUL.md",
            soul_md:
              "# Worker\n\n你是 **app-dev** 队的默认执行者。\n\n## 职责\n- 接 `todo` 单并实现\n- 写完更新 checkpoint\n- 需要外发/push 时停等 L0\n\n## 风格\n- 小步提交\n- 先测再改\n",
            tools_deny: [],
            tools_allow: [],
            path_allow: ["~/projects/foo"],
            path_deny: ["~/projects/foo/.env", "~/.ssh"],
            network: "ask",
            autonomy_cap: null,
            max_parallel_sessions: 1,
            enabled: true,
            note: "M1 单人：编排+执行",
          },
          {
            id: "builder",
            display_name: "Builder",
            role: "builder",
            provider: "claude",
            model_hint: "sonnet",
            soul: "members/builder/SOUL.md",
            soul_md:
              "# Builder\n\n实现功能，**不要**自称验收通过。\n\n## 禁止\n- `git.push`\n- 外发网络\n",
            tools_deny: ["git.push", "net.egress"],
            tools_allow: ["fs.read", "fs.write", "fs.edit", "shell.run", "test.run", "git.add", "git.commit"],
            path_allow: ["~/projects/foo"],
            path_deny: [],
            network: "deny",
            autonomy_cap: "L2",
            max_parallel_sessions: 2,
            enabled: true,
            note: "M3 模板预留",
          },
          {
            id: "verifier",
            display_name: "Verifier",
            role: "verifier",
            provider: "codex",
            model_hint: "default",
            soul: "members/verifier/SOUL.md",
            soul_md:
              "# Verifier\n\n只读验收。对照 Acceptance，列出 **issues**。\n\n## 允许\n- read / test / git.diff\n\n## 禁止\n- 任何业务写路径\n",
            tools_allow: ["fs.read", "test.run", "git.diff", "git.status", "git.log"],
            tools_deny: ["fs.write", "fs.edit", "fs.delete", "git.push", "shell.run"],
            path_allow: ["~/projects/foo"],
            path_deny: [],
            network: "deny",
            autonomy_cap: "L1",
            max_parallel_sessions: 1,
            enabled: true,
            note: "M3 无写权验收",
          },
        ],
      },
      "life-ops": {
        id: "life-ops",
        name: "Life Ops",
        domains: ["calendar", "brief", "errands"],
        default_orchestration: "solo",
        autonomy_default: "L1",
        concurrency: 1,
        lead: "ops",
        default_responder: "ops",
        work_roots: ["~/notes"],
        memory_root: "./memory",
        skills_root: "./skills",
        members: [
          {
            id: "ops",
            display_name: "Ops Lead",
            role: "lead",
            provider: "pi",
            model_hint: "default",
            soul: "members/ops/SOUL.md",
            soul_md: "# Ops\n\n早报、日程、杂务。优先可读摘要。\n",
            tools_deny: ["git.push"],
            tools_allow: [],
            path_allow: ["~/notes"],
            path_deny: [],
            network: "ask",
            autonomy_cap: "L1",
            max_parallel_sessions: 1,
            enabled: true,
            note: "早报 / 杂务",
          },
        ],
      },
      "short-drama": {
        id: "short-drama",
        name: "Short Drama",
        domains: ["script", "storyboard"],
        default_orchestration: "solo",
        autonomy_default: "L2",
        concurrency: 2,
        lead: "writer",
        default_responder: "writer",
        work_roots: ["~/projects/drama"],
        memory_root: "./memory",
        skills_root: "./skills",
        members: [
          {
            id: "writer",
            display_name: "Writer",
            role: "lead",
            provider: "claude",
            model_hint: "default",
            soul: "members/writer/SOUL.md",
            soul_md: "# Writer\n\n分镜与大纲，输出 Markdown 结构清晰。\n",
            tools_deny: [],
            tools_allow: [],
            path_allow: ["~/projects/drama"],
            path_deny: [],
            network: "ask",
            autonomy_cap: null,
            max_parallel_sessions: 1,
            enabled: true,
            note: "分镜 / 大纲",
          },
        ],
      },
    },
    roleCatalog: [
      {
        id: "lead",
        label: "Lead",
        desc: "编排、分诊、Closeout 建议",
        defaults: { write: true, test: true, push: false, network: "ask" },
      },
      {
        id: "builder",
        label: "Builder",
        desc: "实现；默认可写 work_roots",
        defaults: { write: true, test: true, push: false, network: "deny" },
      },
      {
        id: "verifier",
        label: "Verifier",
        desc: "验收；无业务写权",
        defaults: { write: false, test: true, push: false, network: "deny" },
      },
      {
        id: "researcher",
        label: "Researcher",
        desc: "调研 / 只读为主",
        defaults: { write: false, test: false, push: false, network: "ask" },
      },
    ],
    toolCatalog: [
      { id: "fs.read", level: "L1", group: "fs" },
      { id: "fs.write", level: "L2", group: "fs" },
      { id: "fs.edit", level: "L2", group: "fs" },
      { id: "fs.delete", level: "L0", group: "fs" },
      { id: "git.status", level: "L1", group: "git" },
      { id: "git.diff", level: "L1", group: "git" },
      { id: "git.log", level: "L1", group: "git" },
      { id: "git.add", level: "L2", group: "git" },
      { id: "git.commit", level: "L2", group: "git" },
      { id: "git.push", level: "L0", group: "git" },
      { id: "shell.run", level: "L2", group: "shell" },
      { id: "test.run", level: "L2", group: "shell" },
      { id: "net.fetch", level: "L1", group: "net" },
      { id: "net.egress", level: "L0", group: "net" },
    ],
    work: [
      {
        id: "wi-01",
        project_id: null,
        team_id: null,
        status: "triage",
        title: "未分队：补全这期分镜大纲",
        updated: "5m",
        comments: [],
        acceptance: [],
        artifacts: [],
      },
      {
        id: "wi-07",
        project_id: "drama-s2",
        team_id: "short-drama",
        status: "todo",
        title: "Draft short-drama outline",
        updated: "3h",
        comments: [],
        acceptance: [],
        artifacts: [],
      },
      {
        id: "wi-12",
        project_id: "foo",
        team_id: "app-dev",
        status: "in_progress",
        title: "Add OAuth login",
        priority: 2,
        labels: ["auth", "p0"],
        updated: "now",
        assignee: "worker",
        description: `## Goal

给登录加上 **OAuth**（Google），保持现有邮箱登录可用。

## Context

- Project: **foo** · cwd \`~/projects/foo\`
- 相关: [旧 redirect issue](https://example.com/wi-08)

## Notes

- 优先改 \`auth/\` 与 \`web/login\`
- 不要动 billing

\`\`\`bash
# 本地验证
pnpm test auth
\`\`\`

> Session pause 不改变 Board 列；仍为 In Progress。
`,
        comments: [
          {
            id: "c1",
            kind: "issue",
            status: "open",
            body: "### 移动端 header\n\n- 宽度 375 时 **溢出**\n- 见截图 \`out/header-bug.png\`",
            at: "2m",
          },
          {
            id: "c2",
            kind: "issue",
            status: "open",
            body: "暗色模式正文对比度不足（`#666` on `#111`）",
            at: "5m",
          },
          {
            id: "c3",
            kind: "note",
            status: "open",
            body: "_埋点_ 下次再看，不进 Bundle",
            at: "1h",
          },
        ],
        acceptance: [
          { id: "a1", text: "Google 登录可走通", done: true },
          { id: "a2", text: "移动端布局不破", done: false },
          { id: "a3", text: "无 console error", done: false },
        ],
        artifacts: [
          {
            id: "art-1",
            kind: "file",
            title: "oauth module",
            path: "auth/oauth.ts",
            status: "draft",
            summary: "新增 OAuth 适配",
            produced_by: { session_id: "sess-a1", member_id: "worker" },
          },
          {
            id: "art-2",
            kind: "file",
            title: "login page",
            path: "web/login/page.tsx",
            status: "draft",
            summary: "登录 UI 改动",
            produced_by: { session_id: "sess-a1" },
          },
          {
            id: "art-3",
            kind: "log",
            title: "oauth smoke log",
            path: ".hearth/out/oauth-log.txt",
            status: "final",
            summary: "本地 smoke 输出",
            produced_by: { session_id: "sess-a1", turn: 12 },
          },
          {
            id: "art-4",
            kind: "image",
            title: "header overflow screenshot",
            path: ".hearth/out/header-bug.png",
            status: "draft",
            summary: "验收时截图",
          },
        ],
      },
      {
        id: "wi-15",
        project_id: "foo",
        team_id: "app-dev",
        status: "blocked",
        title: "Summarize last week git",
        updated: "2m",
        assignee: "worker",
        comments: [],
        acceptance: [],
        artifacts: [
          {
            id: "art-g1",
            kind: "report",
            title: "draft summary",
            path: ".hearth/out/week-git.md",
            status: "draft",
            summary: "推送前草稿",
          },
        ],
      },
      {
        id: "wi-09",
        project_id: "foo",
        team_id: "app-dev",
        status: "blocked",
        title: "OAuth IdP choice",
        updated: "18m",
        comments: [{ id: "c9", kind: "note", status: "open", body: "等产品决定 Google / GitHub", at: "18m" }],
        acceptance: [],
        artifacts: [],
      },
      {
        id: "wi-11",
        project_id: "foo",
        team_id: "app-dev",
        status: "in_review",
        title: "Login redirect polish",
        updated: "40m",
        comments: [],
        acceptance: [
          { id: "r1", text: "redirect 正确", done: true },
          { id: "r2", text: "错误页有中文", done: false },
        ],
        artifacts: [
          {
            id: "art-r1",
            kind: "diff",
            title: "redirect patch",
            path: ".hearth/out/redirect.diff",
            status: "final",
          },
        ],
      },
      {
        id: "wi-08",
        project_id: "foo",
        team_id: "app-dev",
        status: "done",
        title: "Fix login redirect",
        updated: "1h",
        comments: [{ id: "c8", kind: "issue", status: "open", body: "footer 隐私链接 404", at: "50m" }],
        acceptance: [{ id: "a0", text: "redirect 正确", done: true }],
        artifacts: [
          {
            id: "art-done",
            kind: "pr",
            title: "PR #42",
            url: "https://example.com/pr/42",
            status: "final",
            summary: "已合入",
          },
        ],
      },
      {
        id: "wi-05",
        project_id: "foo",
        team_id: "app-dev",
        status: "failed",
        title: "Flaky e2e suite green",
        updated: "2d",
        comments: [],
        acceptance: [],
        artifacts: [
          {
            id: "art-fail",
            kind: "log",
            title: "e2e fail log",
            path: ".hearth/out/e2e-fail.log",
            status: "final",
          },
        ],
      },
      {
        id: "wi-03",
        project_id: "life-notes",
        team_id: "life-ops",
        status: "todo",
        title: "明日焦点早报草稿",
        updated: "6h",
        comments: [],
        acceptance: [],
        artifacts: [],
      },
      {
        id: "wi-04",
        project_id: "foo",
        team_id: "app-dev",
        status: "backlog",
        title: "Migrate auth metrics dashboard",
        updated: "1w",
        comments: [],
        acceptance: [],
        artifacts: [],
      },
    ],
    live: [
      {
        id: "sess-a1",
        work: "wi-12",
        team_id: "app-dev",
        project_id: "foo",
        cwd: "~/projects/foo",
        title: "Add OAuth login",
        provider: "claude",
        member: "worker",
        turn: 14,
        maxTurns: 40,
        budgetLeft: 2.1,
        checkpoint: "callback handler; tests red",
        status: "running",
        lastTool: "fs.write · ok",
      },
      {
        id: "sess-b2",
        work: "wi-15",
        team_id: "app-dev",
        project_id: "foo",
        cwd: "~/projects/foo",
        title: "Summarize last week git",
        provider: "pi",
        member: "worker",
        turn: 3,
        maxTurns: 20,
        budgetLeft: 0.4,
        checkpoint: "waiting on git.push approval",
        status: "paused",
        lastTool: "git.log · ok",
        pendingApproval: "appr-01",
      },
    ],
    decisions: [
      {
        id: "appr-01",
        kind: "approval",
        level: "L0",
        action: "git.push",
        work: "wi-15",
        team_id: "app-dev",
        title: "Push branch feat/oauth to origin",
        detail: "required L0 · sess-b2 paused",
        age: "2m",
        status: "pending",
      },
      {
        id: "need-02",
        kind: "need_input",
        work: "wi-09",
        team_id: "app-dev",
        title: "Which IdP — Google only or + GitHub?",
        detail: "Agent blocked on product choice",
        age: "18m",
        status: "pending",
      },
    ],
  };

  const listeners = new Set();
  function emit() {
    listeners.forEach((fn) => fn(publicState()));
  }
  function toast(msg) {
    state.toast = msg;
    setTimeout(() => {
      if (state.toast === msg) {
        state.toast = null;
        emit();
      }
    }, 2200);
  }
  function nowTs() {
    return new Date().toTimeString().slice(0, 8);
  }
  function log(msg) {
    state.log = [{ ts: nowTs(), msg }, ...state.log].slice(0, 40);
  }

  function openIssues(work) {
    return (work.comments || []).filter((c) => c.kind === "issue" && c.status === "open");
  }

  function allOpenIssues() {
    const out = [];
    state.work.forEach((w) => {
      openIssues(w).forEach((c) => out.push({ ...c, work_id: w.id, team_id: w.team_id }));
    });
    return out;
  }

  function resolveCwd(w) {
    if (!w) return null;
    if (w.cwd_override) return w.cwd_override;
    if (w.project_id && state.projects[w.project_id]) return state.projects[w.project_id].root_path;
    return null;
  }

  function boardWorkForVariant() {
    const v = state.uiVariant;
    if (v === "B") {
      // Project-primary: 当前项目下的卡（含未绑 project 的 triage）
      return state.work.filter((w) => w.project_id === state.projectId || w.project_id == null);
    }
    if (v === "C") {
      // Dual-axis: 当前队 × 当前项目 的交点（未绑一边的仍显示便于分诊）
      return state.work.filter((w) => {
        const teamOk = !w.team_id || w.team_id === state.teamId;
        const projOk = !w.project_id || w.project_id === state.projectId;
        return teamOk && projOk;
      });
    }
    // A Team-primary
    let boardWork = state.work.filter((w) => w.team_id === state.teamId || w.team_id == null);
    if (state.projectFilter === "none") {
      boardWork = boardWork.filter((w) => !w.project_id);
    } else if (state.projectFilter && state.projectFilter !== "all") {
      boardWork = boardWork.filter((w) => w.project_id === state.projectFilter || w.project_id == null);
    }
    return boardWork;
  }

  function publicState() {
    const team = state.teams[state.teamId];
    const project = state.projects[state.projectId];
    const selectedWork = state.work.find((w) => w.id === state.selectedWorkId);
    return {
      ...state,
      team,
      project,
      teamsList: Object.values(state.teams),
      projectsList: Object.values(state.projects),
      boardWork: boardWorkForVariant(),
      allOpenIssues: allOpenIssues(),
      pendingDecisions: state.decisions.filter((d) => d.status === "pending"),
      selectedWork,
      selectedProject: selectedWork?.project_id ? state.projects[selectedWork.project_id] : project || null,
      selectedCwd: resolveCwd(selectedWork),
      selectedLive: state.live.find((s) => s.id === state.selectedLiveId) || state.live[0],
      editTeam: state.teams[state.teamEditId],
      matrix: buildMatrix(),
    };
  }

  function buildMatrix() {
    const teams = Object.values(state.teams);
    const projects = Object.values(state.projects);
    return {
      teams,
      projects,
      cells: teams.map((t) =>
        projects.map((p) => ({
          team_id: t.id,
          project_id: p.id,
          count: state.work.filter((w) => w.team_id === t.id && w.project_id === p.id).length,
          isDefault: p.default_team_id === t.id,
          allowed: !p.team_ids?.length || p.team_ids.includes(t.id) || p.default_team_id === t.id,
        }))
      ),
    };
  }

  window.Store = {
    get: publicState,
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setView(v) {
      if (v === "decisions") v = "pulse"; // M0.2.8：无独立页
      state.view = v;
      emit();
    },
    setUiVariant(v) {
      const next = String(v || "A").toUpperCase();
      if (!["A", "B", "C"].includes(next)) return;
      state.uiVariant = next;
      const url = new URL(location.href);
      url.searchParams.set("variant", next);
      history.replaceState(null, "", url.pathname + url.search + url.hash);
      // pick a sensible selected work for this axis
      const list = boardWorkForVariant();
      if (list.length && !list.find((w) => w.id === state.selectedWorkId)) {
        state.selectedWorkId = list[0].id;
      }
      emit();
    },
    requestScrollToGates() {
      state.scrollToGates = true;
      emit();
    },
    clearScrollToGates() {
      state.scrollToGates = false;
    },
    setTeam(id) {
      if (!state.teams[id]) return;
      state.teamId = id;
      state.teamEditId = id;
      if (state.uiVariant === "A") state.projectFilter = "all";
      const list = boardWorkForVariant();
      if (list[0]) state.selectedWorkId = list[0].id;
      emit();
    },
    setProject(id) {
      if (!state.projects[id]) return;
      state.projectId = id;
      // B: 项目切换时默认切到 default_team
      const p = state.projects[id];
      if (state.uiVariant === "B" && p.default_team_id && state.teams[p.default_team_id]) {
        state.teamId = p.default_team_id;
        state.teamEditId = p.default_team_id;
      }
      const list = boardWorkForVariant();
      if (list[0]) state.selectedWorkId = list[0].id;
      emit();
    },
    setProjectFilter(id) {
      state.projectFilter = id || "all";
      emit();
    },
    setCell(teamId, projectId) {
      if (state.teams[teamId]) {
        state.teamId = teamId;
        state.teamEditId = teamId;
      }
      if (state.projects[projectId]) state.projectId = projectId;
      const list = boardWorkForVariant();
      if (list[0]) state.selectedWorkId = list[0].id;
      else {
        // no work at intersection - still show empty board
      }
      state.view = "board";
      emit();
    },
    selectWork(id) {
      state.selectedWorkId = id;
      state.detailTab = "overview";
      state.descEdit = false;
      emit();
    },
    assignProject(workId, projectId) {
      const w = state.work.find((x) => x.id === workId);
      if (!w) return;
      w.project_id = projectId || null;
      if (projectId && state.projects[projectId]?.default_team_id && !w.team_id) {
        w.team_id = state.projects[projectId].default_team_id;
        if (w.status === "triage") w.status = "todo";
      }
      w.updated = "now";
      log(`work.project ${workId} → ${projectId || "null"}`);
      toast(projectId ? "已绑 Project " + projectId : "已清除 Project");
      emit();
    },
    addArtifact(workId, { kind, title, path, url }) {
      const w = state.work.find((x) => x.id === workId);
      if (!w) return;
      if (!path && !url) {
        toast("需要 path 或 url");
        emit();
        return;
      }
      w.artifacts = w.artifacts || [];
      const id = "art-" + Math.random().toString(36).slice(2, 6);
      w.artifacts.unshift({
        id,
        kind: kind || "file",
        title: title || path || url,
        path: path || undefined,
        url: url || undefined,
        status: "draft",
        summary: "手动登记",
        produced_by: { member_id: "principal" },
      });
      log(`artifact.added ${workId} · ${path || url}`);
      toast("已登记 Artifact");
      emit();
    },
    /** Pulse / open issues → Board 并选中卡 */
    openWork(id) {
      const w = state.work.find((x) => x.id === id);
      if (!w) {
        toast("找不到 " + id);
        emit();
        return;
      }
      if (w.team_id) {
        state.teamId = w.team_id;
        state.teamEditId = w.team_id;
      }
      state.selectedWorkId = id;
      state.detailTab = "overview";
      state.descEdit = false;
      state.view = "board";
      emit();
    },
    setDetailTab(tab) {
      state.detailTab = tab;
      emit();
    },
    setMemberTab(tab) {
      state.memberTab = tab;
      emit();
    },
    setDescEdit(on) {
      state.descEdit = !!on;
      emit();
    },
    updateWorkField(id, field, value) {
      const w = state.work.find((x) => x.id === id);
      if (!w) return;
      if (field === "labels") {
        w.labels = String(value)
          .split(/[,，\s]+/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (field === "priority") {
        w.priority = Number(value) || 0;
      } else {
        w[field] = value;
      }
      w.updated = "now";
      emit();
    },
    selectLive(id) {
      state.selectedLiveId = id;
      emit();
    },
    setFocusDecision(i) {
      state.focusDecisionIndex = i;
      emit();
    },
    addComment(workId, body, kind) {
      if (!body || !body.trim()) {
        toast("内容不能为空");
        emit();
        return;
      }
      const w = state.work.find((x) => x.id === workId);
      if (!w) return;
      const id = "c" + Math.random().toString(36).slice(2, 6);
      w.comments = w.comments || [];
      w.comments.unshift({
        id,
        kind: kind || "issue",
        status: "open",
        body: body.trim(),
        at: "now",
      });
      log(`comment.added ${workId} · ${body.trim().slice(0, 40)}`);
      toast(kind === "note" ? "已记 note" : "已记 issue comment（小本本）");
      emit();
    },
    toggleCommentSelect(id) {
      if (state.selectedCommentIds.has(id)) state.selectedCommentIds.delete(id);
      else state.selectedCommentIds.add(id);
      emit();
    },
    selectOpenIssuesOnWork(workId) {
      const w = state.work.find((x) => x.id === workId);
      if (!w) return;
      openIssues(w).forEach((c) => state.selectedCommentIds.add(c.id));
      emit();
    },
    clearCommentSelect() {
      state.selectedCommentIds.clear();
      emit();
    },
    bundleComments({ title, start }) {
      const ids = [...state.selectedCommentIds];
      const picked = [];
      state.work.forEach((w) => {
        (w.comments || []).forEach((c) => {
          if (ids.includes(c.id) && c.kind === "issue" && c.status === "open") {
            picked.push({ w, c });
          }
        });
      });
      if (!picked.length) {
        toast("请勾选 open issue comments");
        emit();
        return;
      }
      const wi = "wi-" + (40 + state.work.length);
      const team_id = picked[0].w.team_id || state.teamId;
      const project_id = picked[0].w.project_id || null;
      state.work.unshift({
        id: wi,
        project_id,
        team_id,
        status: start ? "in_progress" : "todo",
        title: (title && title.trim()) || `修复 ${picked.length} 条验收问题`,
        updated: "now",
        fromBundle: true,
        comments: [],
        artifacts: [],
        acceptance: picked.map((p, i) => ({
          id: "ba" + i,
          text: p.c.body,
          done: false,
          fromComment: p.c.id,
        })),
      });
      picked.forEach(({ c }) => {
        c.status = "bundled";
        c.bundle_workitem_id = wi;
      });
      state.selectedCommentIds.clear();
      state.selectedWorkId = wi;
      if (start) {
        const sid = "sess-" + Math.random().toString(36).slice(2, 6);
        state.live.unshift({
          id: sid,
          work: wi,
          team_id,
          title: state.work[0].title,
          provider: "claude",
          member: "worker",
          turn: 1,
          maxTurns: 60,
          budgetLeft: 8,
          checkpoint: "batch fix from comments",
          status: "running",
          lastTool: "-",
        });
        state.selectedLiveId = sid;
      }
      log(`comment.bundled → ${wi}`);
      toast("已上 Board · " + wi);
      emit();
    },
    moveWork(id, status) {
      const w = state.work.find((x) => x.id === id);
      if (!w) return;
      w.status = status;
      w.updated = "now";
      log(`workitem.transition ${id} → ${status}`);
      toast(id + " → " + status);
      emit();
    },
    assignTeam(workId, teamId) {
      const w = state.work.find((x) => x.id === workId);
      if (!w) return;
      w.team_id = teamId;
      if (w.status === "triage") w.status = "todo";
      log(`work.assign ${workId} → ${teamId}`);
      toast("已分队 " + teamId);
      emit();
    },
    grant(id) {
      const d = state.decisions.find((x) => x.id === id);
      if (!d || d.status !== "pending") return;
      d.status = "granted";
      const live = state.live.find((s) => s.pendingApproval === id);
      if (live) {
        live.status = "running";
        live.pendingApproval = null;
      }
      const w = state.work.find((x) => x.id === d.work);
      if (w && w.status === "blocked") w.status = "in_progress";
      toast("Granted");
      emit();
    },
    deny(id) {
      const d = state.decisions.find((x) => x.id === id);
      if (!d) return;
      d.status = "denied";
      toast("Denied");
      emit();
    },
    reply(id, text) {
      if (!text || !text.trim()) {
        toast("回复不能为空");
        emit();
        return;
      }
      const d = state.decisions.find((x) => x.id === id);
      if (!d) return;
      d.status = "answered";
      d.reply = text.trim();
      const w = state.work.find((x) => x.id === d.work);
      if (w) w.status = "in_progress";
      toast("已回复");
      emit();
    },
    pause(sid) {
      const s = state.live.find((x) => x.id === sid);
      if (!s) return;
      s.status = s.status === "paused" ? "running" : "paused";
      toast(s.status);
      emit();
    },
    nudge(sid, msg) {
      if (!msg || !msg.trim()) {
        toast("需要 nudge 内容");
        emit();
        return;
      }
      const s = state.live.find((x) => x.id === sid);
      if (!s) return;
      s.turn++;
      s.checkpoint = "nudge: " + msg.trim().slice(0, 60);
      s.status = "running";
      toast("Nudge sent");
      emit();
    },
    runWork({ goal, team, project }) {
      if (!goal || !goal.trim()) {
        toast("Goal 必填");
        emit();
        return;
      }
      const tid = team || state.teamId;
      let pid =
        project ||
        (state.projectFilter !== "all" && state.projectFilter !== "none" ? state.projectFilter : null) ||
        Object.values(state.projects).find((p) => p.default_team_id === tid)?.id ||
        null;
      const cwd = pid && state.projects[pid] ? state.projects[pid].root_path : null;
      if (!pid) {
        toast("请先选 Project 或分诊绑项目（原型用队默认 Project）");
      }
      const id = "wi-" + (50 + state.work.length);
      const sid = "sess-" + Math.random().toString(36).slice(2, 6);
      state.work.unshift({
        id,
        project_id: pid,
        team_id: tid,
        status: "in_progress",
        title: goal.trim().slice(0, 80),
        updated: "now",
        comments: [],
        acceptance: [],
        artifacts: [],
      });
      state.live.unshift({
        id: sid,
        work: id,
        team_id: tid,
        project_id: pid,
        cwd: cwd || "?",
        title: goal.trim().slice(0, 80),
        provider: "pi",
        member: state.teams[tid]?.default_responder || "worker",
        turn: 1,
        maxTurns: 40,
        budgetLeft: 5,
        checkpoint: "started",
        status: "running",
        lastTool: "-",
      });
      state.selectedWorkId = id;
      state.selectedLiveId = sid;
      toast("Run · " + id);
      emit();
    },
    // —— Team maintenance ——
    setTeamEdit(id) {
      state.teamEditId = id;
      state.memberEditId = null;
      emit();
    },
    updateTeamField(id, field, value) {
      const t = state.teams[id];
      if (!t) return;
      if (field === "domains" || field === "work_roots") {
        t[field] = String(value)
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (field === "concurrency") {
        t.concurrency = Number(value) || 1;
      } else {
        t[field] = value;
      }
      emit();
    },
    selectMember(id) {
      state.memberEditId = id;
      state.memberTab = "identity";
      emit();
    },
    updateMember(teamId, memberId, field, value) {
      const t = state.teams[teamId];
      if (!t) return;
      const m = t.members.find((x) => x.id === memberId);
      if (!m) return;
      const listFields = ["tools_deny", "tools_allow", "path_allow", "path_deny"];
      if (listFields.includes(field)) {
        m[field] = String(value)
          .split(/[,，]/)
          .map((s) => s.trim())
          .filter(Boolean);
      } else if (field === "enabled") {
        m.enabled = value === true || value === "true" || value === "on";
      } else if (field === "max_parallel_sessions") {
        m.max_parallel_sessions = Number(value) || 1;
      } else {
        m[field] = value === "" ? null : value;
      }
      if (field === "role" && value === "lead") t.lead = memberId;
      emit();
    },
    toggleMemberTool(teamId, memberId, toolId, mode) {
      // mode: allow | deny | clear
      const t = state.teams[teamId];
      const m = t?.members.find((x) => x.id === memberId);
      if (!m) return;
      m.tools_allow = m.tools_allow || [];
      m.tools_deny = m.tools_deny || [];
      m.tools_allow = m.tools_allow.filter((x) => x !== toolId);
      m.tools_deny = m.tools_deny.filter((x) => x !== toolId);
      if (mode === "allow") m.tools_allow.push(toolId);
      if (mode === "deny") m.tools_deny.push(toolId);
      emit();
    },
    addMember(teamId) {
      const t = state.teams[teamId];
      if (!t) return;
      const id = "m" + Math.random().toString(36).slice(2, 5);
      t.members.push({
        id,
        display_name: id,
        role: "builder",
        provider: "pi",
        model_hint: "default",
        soul: `members/${id}/SOUL.md`,
        soul_md: `# ${id}\n\n（编辑人设）\n`,
        tools_deny: [],
        tools_allow: [],
        path_allow: t.work_roots.slice(),
        path_deny: [],
        network: "ask",
        autonomy_cap: null,
        max_parallel_sessions: 1,
        enabled: true,
        note: "新建成员",
      });
      state.memberEditId = id;
      state.memberTab = "identity";
      toast("已添加成员 " + id);
      emit();
    },
    removeMember(teamId, memberId) {
      const t = state.teams[teamId];
      if (!t || t.members.length <= 1) {
        toast("至少保留一名成员");
        emit();
        return;
      }
      t.members = t.members.filter((m) => m.id !== memberId);
      if (t.lead === memberId) t.lead = t.members[0].id;
      if (t.default_responder === memberId) t.default_responder = t.members[0].id;
      state.memberEditId = null;
      toast("已移除 " + memberId);
      emit();
    },
    createTeam() {
      const id = "team-" + Math.random().toString(36).slice(2, 5);
      state.teams[id] = {
        id,
        name: "New Team",
        domains: ["general"],
        default_orchestration: "solo",
        autonomy_default: "L2",
        concurrency: 1,
        lead: "worker",
        default_responder: "worker",
        work_roots: ["~/projects"],
        memory_root: "./memory",
        skills_root: "./skills",
        members: [
          {
            id: "worker",
            role: "lead",
            provider: "pi",
            soul: "members/worker/SOUL.md",
            tools_deny: [],
            autonomy_cap: null,
            note: "",
          },
        ],
      };
      state.teamEditId = id;
      state.teamId = id;
      toast("已创建团队 " + id);
      emit();
    },
    toggleAcc(workId, accId) {
      const w = state.work.find((x) => x.id === workId);
      const a = w?.acceptance?.find((x) => x.id === accId);
      if (a) a.done = !a.done;
      emit();
    },
    accToComment(workId, accId) {
      const w = state.work.find((x) => x.id === workId);
      const a = w?.acceptance?.find((x) => x.id === accId);
      if (!a) return;
      window.Store.addComment(workId, a.text, "issue");
    },
  };
})();
