/* Hearth M0.5.0 prototype · views.js · 纯字符串渲染，无框架
 * 实现 design/DESIGN.md · chat-first。
 *   Home = 所有 Project 网格。
 *   进入 Project → 四列外壳：Rail | Project 竖排 section 导航(+session 列表) | Chat | 产物预览。
 *   Chat 是默认入口；Runs 是独立执行工作面。Board/Artifacts/Workspace/Team/Settings 为其它 section。
 *   session chain（clowder 语义）两种呈现：
 *     · 随手聊（kind=direct）→ 轻单流，无卡无轨，零仪式。
 *     · issue 驱动（kind=issue）→ 接力卡（每 session 一张可折叠卡，忠实"独立工位不共享"）
 *       + 左侧负责人轨（gutter 节点串，accent 只标当前负责人）。
 *   views 只生成 HTML；事件在 app.js 绑定。 */

const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STATUS_LABEL = {
  triage: 'Triage', todo: 'Todo', doing: 'In Progress',
  review: 'In Review', blocked: 'Blocked', done: 'Done', open: 'Open',
};
const STATE_CLASS = { open: 'st-open', doing: 'st-doing', review: 'st-review', blocked: 'st-blocked', done: 'st-done' };
const ROLE_LABEL = { build: 'build', review: 'review', plan: 'plan', ask: 'ask' };
const SESS_STATUS = { done: 'done', active: 'active', blocked: 'blocked', idle: 'idle' };
const SESS_STATUS_TXT = { done: '已完成', active: '进行中', blocked: '阻塞', idle: '空闲' };
const MEDIUM_LABEL = { novel: 'DOC', doc: 'DOC', image: 'IMG', video: 'VIDEO', audio: 'AUDIO', app: 'APP' };

/* ---- lookups ---- */
const soul = (id) => DATA.souls.find((s) => s.id === id);
const project = (id) => DATA.projects.find((p) => p.id === id);
const team = (id) => DATA.teams.find((t) => t.id === id);
const artifact = (id) => DATA.artifacts.find((a) => a.id === id);
const issue = (id) => DATA.issues.find((i) => i.id === id);
const threadsFor = (pid) => DATA.threads.filter((t) => t.project_id === pid);
const artifactsFor = (pid) => DATA.artifacts.filter((a) => a.project_id === pid);
const workflowsFor = (pid) => (DATA.workflows || []).filter((w) => w.project_id === pid);
const workflow = (id) => (DATA.workflows || []).find((w) => w.id === id);
const workflowForThread = (threadId) => (DATA.workflows || []).find(
  (w) => w.source_thread_id === threadId || w.discussion_thread_id === threadId
);

/* monogram 头像 */
function avatar(s, size) {
  if (!s) return '';
  const cls = size ? `mono-av ${size}` : 'mono-av';
  return `<span class="${cls}" style="--soul:var(--soul-${esc(s.tint)})" title="${esc(s.name)} · ${esc(s.model)}">${esc(s.name.slice(0, 1))}</span>`;
}

/* 判断 soul 与当前负责人是否跨模型 family（用于 ⇄ 跨模型字形） */
function isCross(fromId, toId) {
  const a = soul(fromId), b = soul(toId);
  return a && b && a.family !== b.family;
}

/* ============================================================
   HOME · 所有 Project 网格
   ============================================================ */
function renderHome() {
  const cards = DATA.projects.map((p) => {
    const t = team(p.team_id);
    const members = (p.member_ids || []).map(soul).filter(Boolean);
    const openIssues = DATA.issues.filter((i) => i.project_id === p.id && i.status !== 'done').length;
    const arts = artifactsFor(p.id).length;
    const roster = members.map((s) => avatar(s, 'sm')).join('');
    return `
    <button class="proj-card" data-proj="${esc(p.id)}" style="--pc:${esc(p.color)}">
      <div class="proj-card-top">
        <span class="proj-card-name">${esc(p.name)}</span>
        <span class="proj-kind">${esc(p.kind)}</span>
      </div>
      <div class="proj-card-desc">${esc(p.desc)}</div>
      <div class="proj-card-foot">
        <span class="proj-team"><span class="roster">${roster}</span>${esc(t ? t.name : '')}</span>
        <span class="proj-stat"><b>${openIssues}</b> 开放 · <b>${arts}</b> 产物</span>
      </div>
    </button>`;
  }).join('');

  return `
  <div class="home-wrap">
    <div class="home-bar">
      <div>
        <h1 class="home-h">所有 Project</h1>
        <p class="home-sub">Project 是中心。点进任意 Project 默认落在 Chat；Runs 是独立执行工作面。Board / Artifacts / Workspace / Team 也是项目内 section。不同类型项目派驻不同的队，skill 不同。新建项目用左侧栏的 + 号。</p>
      </div>
    </div>
    <div class="proj-grid">${cards}</div>
  </div>`;
}

/* 新建 Project 表单（选队派驻 · medium · 名字） */
function renderNewProject() {
  const teamOpts = DATA.teams.map((t) => {
    const members = (t.member_ids || []).map((id) => (soul(id) || {}).name).filter(Boolean).join(' · ');
    return `
    <button class="np-team" data-team="${esc(t.id)}">
      <span class="np-team-name">${esc(t.name)}</span>
      <span class="np-team-kind">${esc(t.kind)}</span>
      <span class="np-team-members">${esc(members)}</span>
    </button>`;
  }).join('');
  const mediumOpts = [
    { id: 'app', label: 'App / 网站' }, { id: 'novel', label: '小说 / 长文' },
    { id: 'video', label: '短剧 / 视频' }, { id: 'image', label: '图像 / 设计' },
  ].map((m, i) => `<button class="np-medium ${i === 0 ? 'active' : ''}" data-medium="${m.id}">${esc(m.label)}</button>`).join('');

  return `
  <div class="home-wrap">
    <div class="np-head">
      <button class="np-back">← 所有 Project</button>
      <h1 class="home-h">新建 Project</h1>
      <p class="home-sub">Project 是装 chat / board / 产物 / workspace 的盒子。选一支队派驻进来，各成员挂本项目的 skill、接本项目记忆切片。</p>
    </div>
    <div class="np-form">
      <label class="np-row"><span class="np-k">项目名</span>
        <input class="np-name" placeholder="例如：登录重构 / 第二部 / 宣传片" /></label>
      <div class="np-row"><span class="np-k">类型</span><div class="np-mediums">${mediumOpts}</div></div>
      <div class="np-row col"><span class="np-k">派驻团队 <span class="np-k-hint">决定谁来干、带什么 skill</span></span>
        <div class="np-teams">${teamOpts}</div></div>
      <div class="np-actions">
        <button class="np-create">创建并进入</button>
        <button class="np-cancel">取消</button>
      </div>
    </div>
  </div>`;
}

/* ============================================================
   Rail：Project 列表（带 rollup 圆点）
   ============================================================ */
function renderRailProjects(activePid) {
  return DATA.projects.map((p) => {
    // rollup：本项目有硬门=blocked，有未看产物=fresh
    const blocked = DATA.issues.some((i) => i.project_id === p.id && i.gate);
    const fresh = artifactsFor(p.id).some((a) => a.unseen);
    const roll = blocked ? '<span class="roll blocked"></span>' : fresh ? '<span class="roll fresh"></span>' : '';
    const initial = p.name.replace(/[《》]/g, '').slice(0, 1);
    return `
    <button class="rail-proj ${p.id === activePid ? 'active' : ''}" data-proj="${esc(p.id)}"
            style="background:${esc(p.color)}" title="${esc(p.name)}">
      ${esc(initial)}${roll}
    </button>`;
  }).join('');
}

/* ============================================================
   Project 内导航（竖排 section + session 列表）
   ============================================================ */
const SECTIONS = [
  { id: 'chat', label: 'Chat', ic: '◆', primary: true },
  { id: 'board', label: 'Board', ic: '☰' },
  { id: 'runs', label: 'Runs', ic: '▶' },
  { id: 'artifacts', label: 'Artifacts', ic: '⬚' },
  { id: 'workspace', label: 'Workspace', ic: '⌥' },
  { id: 'team', label: 'Team', ic: '⧉' },
  { id: 'settings', label: '项目设置', ic: '⚙' },
];

function sectionCount(pid, id) {
  if (id === 'chat') return threadsFor(pid).length;
  if (id === 'board') return DATA.issues.filter((i) => i.project_id === pid && i.status !== 'done').length;
  if (id === 'runs') return workflowsFor(pid).length;
  if (id === 'artifacts') return artifactsFor(pid).length;
  if (id === 'workspace') return (DATA.files[pid] || []).length;
  if (id === 'team') return (project(pid).member_ids || []).length;
  return null;
}

function renderProjNav(pid, activeSec, activeThreadId) {
  const p = project(pid);
  const secs = SECTIONS.map((s) => {
    const n = sectionCount(pid, s.id);
    const ct = n != null ? `<span class="ct">${n}</span>` : '';
    return `
    <button class="pn-sec ${s.primary ? 'primary' : ''} ${s.id === activeSec ? 'active' : ''}" data-sec="${s.id}">
      <span class="ic">${s.ic}</span>${s.label}${ct}
    </button>`;
  }).join('');

  // session 列表只在 chat section 显示
  const sessionList = activeSec === 'chat' ? renderThreadList(pid, activeThreadId) : '';

  return `
  <div class="pn-head">
    <div class="pn-title" style="--pc:${esc(p.color)}">${esc(p.name)}</div>
    <span class="pn-kind">${esc(p.kind)} · 派驻 ${esc((team(p.team_id) || {}).name || '')}</span>
  </div>
  <div class="pn-sections">${secs}</div>
  ${sessionList}`;
}

/* thread 列表：随手 + issue 混排，负责人轨缩略。
   注意：这是「对话线程(thread)」列表。thread 内每次接手唤起的独立执行才是 session。 */
function renderThreadList(pid, activeThreadId) {
  const threads = threadsFor(pid);
  const items = threads.map((t) => {
    const isActive = t.id === activeThreadId;
    const fresh = (t.artifact_id && (artifact(t.artifact_id) || {}).unseen) ? '<span class="sess-fresh" title="新版本"></span>' : '';
    const kindTag = t.kind === 'issue'
      ? '<span class="sess-kind issue">ISSUE</span>'
      : '<span class="sess-kind direct">随手</span>';
    const sub = t.kind === 'issue' && t.sessions && t.sessions.length > 1
      ? chainMini(t)
      : `<span>${esc((t.sessions && t.sessions[0] && (soul(t.sessions[0].soul) || {}).name) || '待拉取')}</span>`;
    return `
    <button class="sess-item ${isActive ? 'active' : ''}" data-thread="${esc(t.id)}">
      <span class="sess-top">
        ${kindTag}
        <span class="sess-title">${esc(t.title)}</span>
        ${fresh}
      </span>
      <span class="sess-sub">${sub}<span>· ${t.sessions ? t.sessions.length : 0} session</span></span>
    </button>`;
  }).join('');

  return `
  <div class="pn-divider">Threads <button class="newthread" title="新对话线程（随手聊，无 issue）">+</button></div>
  <div class="pn-sessions">${items || '<p style="padding:12px 14px;color:var(--ink-3);font-size:12px">还没有对话线程</p>'}</div>`;
}

/* 负责人轨缩略：接力点串，当前负责人高亮 */
function chainMini(th) {
  const sessions = th.sessions || [];
  const batonIdx = lastActiveIdx(sessions);
  const parts = [];
  sessions.forEach((sess, i) => {
    const s = soul(sess.soul);
    const isBaton = i === batonIdx;
    if (i > 0) parts.push('<span class="lnk"></span>');
    parts.push(`<i class="${isBaton ? 'baton' : ''}" style="--soul:var(--soul-${esc(s ? s.tint : 'slate')})"></i>`);
  });
  return `<span class="chain-mini" title="接力链 ${sessions.length} 段">${parts.join('')}</span>`;
}

/* 当前负责人：最后一个 active/blocked 段；否则最后一段 */
function lastActiveIdx(sessions) {
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].status === 'active' || sessions[i].status === 'blocked') return i;
  }
  return sessions.length - 1;
}

/* ============================================================
   CHAT 主面 · dyad 式 chat + 产物预览分屏
   ============================================================ */
function renderChat(pid, threadId, previewTab, collapsed, chainView) {
  const threads = threadsFor(pid);
  const th = threads.find((t) => t.id === threadId) || threads[0];
  if (!th) {
    return `<div class="chat-split collapsed"><div class="chat-col">
      <div class="pv-empty" style="flex:1">
        <span class="big">还没有对话</span>
        <span class="sub">点左侧 Threads 的 + 开一条随手 thread，或去 Board 建 issue 让团队自动拉取。</span>
      </div></div></div>`;
  }

  const art = th.artifact_id ? artifact(th.artifact_id) : null;
  const iss = th.issue_id ? issue(th.issue_id) : null;
  const wf = workflowForThread(th.id);
  const stCls = STATE_CLASS[th.status] || 'st-open';
  const multi = (th.sessions || []).length > 1; // 多人接力才需要视图切换

  // 对话体：多人接力（不论 issue 还是随手）→ 按 chainView 切三种呈现；单人 → 轻单流
  const view = chainView || 'relay';
  let body;
  if (multi) {
    body = view === 'stream' ? renderChainStream(th)
         : view === 'track' ? renderChainTrack(th)
         : renderRelayCards(th);
  } else {
    body = renderSoloStream(th);
  }

  // 当前负责人 = issue assignee（和 Board / 详情一致，不再叫"球权"）
  const holder = iss ? soul(iss.holder) : soul((th.sessions[lastActiveIdx(th.sessions)] || {}).soul);

  // 视图切换器（仅多人接力时出现，随手聊多人也算）
  const viewSwitch = multi ? `
    <div class="chain-view-switch" role="group" aria-label="接力呈现方式">
      <button class="cv-btn ${view === 'relay' ? 'active' : ''}" data-cv="relay" title="接力卡：每人一段可折叠">接力</button>
      <button class="cv-btn ${view === 'stream' ? 'active' : ''}" data-cv="stream" title="对话流：一条连续对话，交接是行内标记">对话流</button>
      <button class="cv-btn ${view === 'track' ? 'active' : ''}" data-cv="track" title="轨道：只看接力概览，不展开内容">轨道</button>
    </div>` : '';

  const head = `
  <div class="chat-head">
    <span class="chat-head-title">${esc(th.title)}</span>
    <span class="chat-state ${stCls}">${esc(STATUS_LABEL[th.status] || th.status || 'open')}</span>
    ${wf ? `<span class="wf-head-badge">关联 RUN · ${esc(wf.id)}</span>` : ''}
    ${iss
      ? `<span class="chat-head-issue">${esc(iss.id)}${holder ? ` · 负责 ${esc(holder.name)}` : ''}</span>`
      : '<span class="chat-head-issue">随手 · 无 issue</span>'}
    <span class="chat-head-spacer"></span>
    ${viewSwitch}
    <button class="preview-toggle" title="折叠 / 展开产物预览">
      ${collapsed ? '◧ 展开预览' : '◨ 收起预览'}
    </button>
  </div>`;

  const composer = renderComposer(pid, th);

  const stream = `<div class="chat-stream" id="chat-stream">${wf ? renderRunSummary(wf) : ''}${body}</div>`;
  const chatCol = `<div class="chat-col">${head}${stream}${composer}</div>`;

  const previewCol = `<div class="preview-pane">${renderPreview(pid, art, previewTab)}</div>`;

  return `<div class="chat-split ${collapsed ? 'collapsed' : ''}">${chatCol}${previewCol}</div>`;
}

/* ============================================================
   RUN UI PROTOTYPE · Chat 摘要 + 独立 Steps / Graph 工作面
   ============================================================ */
const WF_STATUS_TXT = {
  done: '完成', running: '运行中', blocked: '阻塞', pending: '等待', ready: '就绪', failed: '失败', skipped: '跳过',
};
const WF_KIND_TXT = { ai: 'AI', command: 'CMD', approval: 'GATE' };

function workflowStats(wf) {
  const done = wf.steps.filter((s) => s.status === 'done').length;
  const active = wf.steps.filter((s) => s.status === 'running' || s.status === 'blocked').length;
  return { done, active, total: wf.steps.length, pct: Math.round(done / wf.steps.length * 100) };
}

function stepOwner(step) {
  const s = step.owner ? soul(step.owner) : null;
  return s ? `${avatar(s, 'sm')}<span>${esc(s.name)}</span>` : '<span class="wf-daemon">Daemon</span>';
}

function renderWorkflowStepDetail(wf, stepId, compact) {
  const step = wf.steps.find((s) => s.id === stepId) || wf.steps.find((s) => s.id === wf.current_step_id) || wf.steps[0];
  const deps = (step.depends_on || []).map((id) => (wf.steps.find((s) => s.id === id) || {}).title || id);
  const result = step.result || {};
  const artifacts = (result.artifacts || []).map((a) => `<span class="wf-art">${esc(a)}</span>`).join('');
  const issues = (result.issues || []).map((a) => `<li>${esc(a)}</li>`).join('');
  const action = step.status === 'blocked' && step.kind === 'approval'
    ? `<button class="wf-action primary" data-wf-action="approve" data-step="${esc(step.id)}">放行并继续</button><button class="wf-action" data-wf-action="deny" data-step="${esc(step.id)}">拒绝</button>`
    : step.status === 'failed'
      ? `<button class="wf-action primary" data-wf-action="retry" data-step="${esc(step.id)}">重试本步</button>`
      : '';
  return `
  <section class="wf-detail ${compact ? 'compact' : ''}">
    <div class="wf-detail-top">
      <span class="wf-kind ${esc(step.kind)}">${esc(WF_KIND_TXT[step.kind] || step.kind)}</span>
      <strong>${esc(step.title)}</strong>
      <span class="wf-step-status ${esc(step.status)}">${esc(WF_STATUS_TXT[step.status] || step.status)}</span>
    </div>
    <div class="wf-detail-meta">
      <span class="wf-owner">${stepOwner(step)}</span>
      <span>${esc(step.duration || '—')}</span>
      ${step.workspace ? `<span class="mono">${esc(step.workspace)}</span>` : ''}
      ${step.gate ? `<span class="wf-gate">${esc(step.gate)}</span>` : ''}
    </div>
    ${deps.length ? `<div class="wf-deps">依赖：${esc(deps.join('、'))}</div>` : ''}
    ${step.command ? `<pre class="wf-command">${esc(step.command)}</pre>` : ''}
    <p class="wf-summary">${esc(result.summary || '尚无 StepResult。')}</p>
    ${artifacts ? `<div class="wf-artifacts">${artifacts}</div>` : ''}
    ${issues ? `<ul class="wf-issues">${issues}</ul>` : ''}
    ${action ? `<div class="wf-detail-actions">${action}</div>` : ''}
  </section>`;
}

function renderRunSummary(wf) {
  const stats = workflowStats(wf);
  const current = wf.steps.find((s) => s.id === wf.current_step_id) || wf.steps[0];
  return `
  <button class="run-summary" data-open-run="${esc(wf.id)}">
    <span class="run-summary-mark">RUN</span>
    <span class="run-summary-copy">
      <strong>${esc(wf.title)}</strong>
      <small>${esc(current.title)} · ${esc(WF_STATUS_TXT[current.status] || current.status)}</small>
    </span>
    <span class="run-summary-progress"><i style="width:${stats.pct}%"></i></span>
    <span class="run-summary-meta">${stats.done}/${stats.total} · ${esc(wf.elapsed)}</span>
    <span class="run-summary-open">打开 Run →</span>
  </button>`;
}

function renderRunInspector(wf, selectedStepId, tab) {
  const step = wf.steps.find((s) => s.id === selectedStepId) || wf.steps[0];
  const result = step.result || {};
  const th = DATA.threads.find((t) => t.id === wf.discussion_thread_id);
  const tabs = ['result', 'discussion', 'logs'].map((id) => `
    <button class="run-inspector-tab ${tab === id ? 'active' : ''}" data-run-tab="${id}">${({ result: 'Result', discussion: 'Discussion', logs: 'Logs' })[id]}</button>`).join('');
  let body = `
    <div class="run-result-summary">${esc(result.summary || '尚无结果。')}</div>
    <dl class="run-result-grid">
      <div><dt>Attempt</dt><dd>#1</dd></div>
      <div><dt>Duration</dt><dd>${esc(step.duration || '—')}</dd></div>
      <div><dt>Workspace</dt><dd>${esc(step.workspace || 'shared')}</dd></div>
      <div><dt>Run version</dt><dd>${esc(wf.workflow_version || 'v1')}</dd></div>
    </dl>`;
  if (tab === 'discussion') {
    const messages = th ? (th.messages || []).slice(-3).map(renderMsg).join('') : '<p class="run-empty-note">没有关联讨论。</p>';
    body = `<div class="run-discussion-list">${messages}</div>${th ? `<button class="run-link-thread" data-open-thread="${esc(th.id)}">打开完整 Thread →</button>` : ''}`;
  } else if (tab === 'logs') {
    body = `<pre class="run-logs">09:20:11 run.started  ${esc(wf.id)}
09:36:42 step.completed  implement
09:39:18 command.completed  tests=18 failures=0
09:55:07 step.completed  security-review
09:58:31 approval.requested  push-approval</pre>`;
  }
  return `<aside class="run-inspector"><div class="run-inspector-tabs">${tabs}</div><div class="run-inspector-body">${body}</div></aside>`;
}

function renderRunsSection(pid, runId, runView, selectedStepId, inspectorTab) {
  const runs = workflowsFor(pid);
  const wf = workflow(runId) || runs[0];
  if (!wf) return `<div class="section-empty"><span>还没有 Run</span><small>可从 Chat、Issue、Workflow 或 Automation 发起，Run 不要求存在 Thread。</small></div>`;
  const stats = workflowStats(wf);
  const selected = selectedStepId || wf.current_step_id;
  const view = runView || 'steps';
  const steps = wf.steps.map((step, i) => `
    <button class="wf-nav-step ${esc(step.status)} ${step.id === selected ? 'selected' : ''}" data-wf-step="${esc(step.id)}">
      <span class="wf-nav-rail"><i></i></span>
      <span class="wf-nav-copy"><b>${i + 1}. ${esc(step.title)}</b><small>${esc(WF_KIND_TXT[step.kind])} · ${esc(WF_STATUS_TXT[step.status] || step.status)}</small></span>
    </button>`).join('');
  const nodes = wf.steps.map((step, i) => {
    const owner = step.owner ? soul(step.owner) : null;
    return `${i ? '<span class="wf-canvas-arrow">→</span>' : ''}<button class="wf-canvas-node ${esc(step.kind)} ${esc(step.status)} ${step.id === selected ? 'selected' : ''}" data-wf-step="${esc(step.id)}"><span class="wf-canvas-kind">${esc(WF_KIND_TXT[step.kind])}</span><strong>${esc(step.title)}</strong><span>${owner ? esc(owner.name) : 'Daemon'} · ${esc(WF_STATUS_TXT[step.status] || step.status)}</span></button>`;
  }).join('');
  const main = view === 'graph'
    ? `<section class="run-main graph"><div class="run-canvas-note"><span>定义态 DAG</span><small>当前 Run 的节点状态覆盖在固定版本 ${esc(wf.workflow_version || 'v1')} 上</small></div><div class="wf-canvas-flow">${nodes}</div>${renderWorkflowStepDetail(wf, selected, false)}</section>`
    : `<section class="run-main steps"><div class="run-stage-head"><span class="wf-eyebrow">SELECTED STEP</span><small>执行控制作用于 Step / Attempt，而不是 Chat message</small></div>${renderWorkflowStepDetail(wf, selected, false)}</section>`;
  return `
  <div class="runs-page">
    <header class="run-page-head">
      <div><span class="wf-eyebrow">WORKFLOW RUN · ${esc(wf.id)}</span><h1>${esc(wf.title)}</h1><p>${esc(wf.workflow_id)} · ${esc(wf.workflow_version)} · 来源 ${esc(wf.source_thread_id || 'direct')}</p></div>
      <div class="run-head-stats"><span class="wf-step-status ${esc(wf.status)}">${esc(WF_STATUS_TXT[wf.status] || wf.status)}</span><b>${stats.pct}%</b><small>${stats.done}/${stats.total} · ${esc(wf.elapsed)} · ${esc(wf.budget)}</small></div>
    </header>
    <div class="run-toolbar">
      <div class="run-view-switch"><button class="${view === 'steps' ? 'active' : ''}" data-run-view="steps">Steps</button><button class="${view === 'graph' ? 'active' : ''}" data-run-view="graph">Graph</button></div>
      <span class="run-toolbar-sep"></span>
      <button data-open-thread="${esc(wf.discussion_thread_id || '')}">Discussion ↗</button>
      <button>Issue ${esc(wf.issue_id || '—')} ↗</button>
      <span class="run-toolbar-spacer"></span><button>Cancel Run</button>
    </div>
    <div class="wf-progress"><i style="width:${stats.pct}%"></i></div>
    <div class="run-workbench">
      <aside class="wf-step-nav"><div class="wf-nav-head"><span class="wf-eyebrow">STEPS</span><strong>执行历史</strong><small>Retry 会创建新 attempt</small></div><div class="wf-nav-list">${steps}</div></aside>
      ${main}
      ${renderRunInspector(wf, selected, inspectorTab || 'result')}
    </div>
  </div>`;
}

/* 接力段的人话交接标记：A→B「接手/交回 · 角色」，跨模型补一句复核说明
   sess.from = 从谁手里接的；返工回到之前出现过的 soul 记为"交回" */
function handoffLabel(th, sess, i) {
  if (i === 0 || !sess.from) return '';
  const to = soul(sess.soul);
  const from = soul(sess.from);
  const role = ROLE_LABEL[sess.role] || sess.role || '';
  // 之前出现过 = 交回，否则 = 接手
  const seenBefore = (th.sessions || []).slice(0, i).some((x) => x.soul === sess.soul);
  const verb = seenBefore ? '交回' : '接手';
  const cross = isCross(sess.from, sess.soul);
  return `
  <div class="handoff-mark">
    <span class="hm-line"></span>
    <span class="hm-text">
      <b>${esc(to ? to.name : '')}</b> ${verb} · ${esc(sess.label || role)}
      ${cross ? `<span class="hm-cross" title="不同模型互相复核，更容易挑出问题">跨模型复核 ${esc((from || {}).model || '')} → ${esc((to || {}).model || '')}</span>` : ''}
    </span>
  </div>`;
}

/* 视图 1 · 接力卡：每人一段可折叠卡（结构感最强，忠实"独立执行不共享"）*/
function renderRelayCards(th) {
  const sessions = th.sessions || [];
  const activeIdx = lastActiveIdx(sessions);
  const bySession = sessions.map((_, i) => (th.messages || []).filter((m) => m.s === i));

  const rows = sessions.map((sess, i) => {
    const s = soul(sess.soul);
    const role = ROLE_LABEL[sess.role] || sess.role || '';
    const st = SESS_STATUS[sess.status] || 'idle';
    const isCurrent = i === activeIdx;
    const isOpen = isCurrent;
    const msgs = bySession[i].map(renderMsg).join('') || '<div class="sess-empty">（这段还没有消息）</div>';

    return handoffLabel(th, sess, i) + `
    <div class="sess-card ${isOpen ? 'open' : ''} ${isCurrent ? 'current' : ''}" data-sess="${i}">
      <div class="sess-card-head">
        ${avatar(s, 'sm')}
        <span class="sess-who">${esc(s ? s.name : '')}</span>
        <span class="sess-role ${esc(sess.role)}">${esc(role)}</span>
        <span class="sess-model">${esc(s ? s.model : '')}</span>
        <span class="sess-card-stat">
          ${isCurrent ? '<span class="current-flag">当前负责</span>' : ''}
          <span class="sess-badge ${st}">${esc(SESS_STATUS_TXT[st] || st)}</span>
          <span class="sess-caret">▸</span>
        </span>
      </div>
      <div class="sess-body"><span class="sess-iso" title="每人一次独立执行，上下文不共享">独立执行</span>${msgs}</div>
    </div>`;
  }).join('');

  return `<div class="relay-wrap">${rows}</div>`;
}

/* 视图 2 · 对话流：一条连续对话，交接只是行内轻标记（最像 chat）*/
function renderChainStream(th) {
  const sessions = th.sessions || [];
  let lastS = -1;
  const parts = (th.messages || []).map((m) => {
    let mark = '';
    if (typeof m.s === 'number' && m.s !== lastS) {
      lastS = m.s;
      mark = handoffLabel(th, sessions[m.s] || {}, m.s);
    }
    return mark + renderMsg(m);
  }).join('');
  return `<div class="solo-stream">${parts}</div>`;
}

/* 视图 3 · 轨道：只看接力概览（谁→谁→谁），点一段跳到对话流对应位置 */
function renderChainTrack(th) {
  const sessions = th.sessions || [];
  const activeIdx = lastActiveIdx(sessions);
  const bySession = sessions.map((_, i) => (th.messages || []).filter((m) => m.s === i));
  const steps = sessions.map((sess, i) => {
    const s = soul(sess.soul);
    const role = ROLE_LABEL[sess.role] || sess.role || '';
    const st = SESS_STATUS[sess.status] || 'idle';
    const isCurrent = i === activeIdx;
    const isOpen = isCurrent; // 默认展开当前负责段
    const cross = sess.from ? isCross(sess.from, sess.soul) : false;
    const connector = i > 0
      ? `<div class="track-arrow ${cross ? 'cross' : ''}" title="${cross ? '跨模型复核' : '交接'}">↓${cross ? ' 跨模型复核' : ''}</div>`
      : '';
    const msgs = bySession[i].map(renderMsg).join('') || '<div class="sess-empty">（这段还没有消息）</div>';
    return connector + `
    <div class="track-step ${isCurrent ? 'current' : ''} ${isOpen ? 'open' : ''}" data-sess="${i}">
      <button class="track-step-head">
        ${avatar(s, 'sm')}
        <span class="track-who">${esc(s ? s.name : '')}</span>
        <span class="sess-role ${esc(sess.role)}">${esc(role)}</span>
        <span class="track-label">${esc(sess.label || '')}</span>
        <span class="track-stat">
          ${isCurrent ? '<span class="current-flag">当前负责</span>' : ''}
          <span class="sess-badge ${st}">${esc(SESS_STATUS_TXT[st] || st)}</span>
          <span class="sess-caret">▸</span>
        </span>
      </button>
      <div class="track-body">${msgs}</div>
    </div>`;
  }).join('');
  return `<div class="track-wrap"><div class="track-hint">接力概览 · ${sessions.length} 人协作 · 点一段就地展开内容</div>${steps}</div>`;
}

/* —— 轻单流（随手聊，无 issue）—— */
function renderSoloStream(th) {
  const msgs = (th.messages || []).map(renderMsg).join('');
  return `<div class="solo-stream">${msgs}</div>`;
}

/* 消息渲染：话轮 / 富块 */
function renderMsg(m) {
  if (m.kind === 'approval') {
    return `
    <div class="msg block approval">
      <div class="block-head"><span class="block-tag gate">硬门 L0</span>${esc(m.title)}</div>
      <div class="block-body">${esc(m.detail)}</div>
      <div class="block-actions"><button class="grant primary">放行</button><button class="deny">拒绝</button></div>
    </div>`;
  }
  if (m.kind === 'diff') {
    const s = soul(m.from);
    return `
    <div class="msg block diff">
      <div class="block-head">${avatar(s, 'sm')}<span class="msg-who" style="font-weight:600">${esc(s ? s.name : '')}</span><span class="block-tag">变更包</span><span class="block-file">${esc(m.file)}</span></div>
      <pre class="diff-body">${esc(m.body)}</pre>
      <div class="block-actions"><button class="apply primary">应用</button><button class="reject">丢弃</button></div>
    </div>`;
  }
  if (m.kind === 'error') {
    return `
    <div class="msg block error">
      <div class="block-head"><span class="block-tag error">运行错误</span><span class="err-note">结构化字段 · 不写进对话正文</span></div>
      <pre class="err-body">${esc(m.body)}</pre>
      <div class="block-actions"><button class="retry">重试</button></div>
    </div>`;
  }
  if (m.kind === 'decision') {
    return `
    <div class="msg block decision">
      <div class="block-head"><span class="block-tag">决策</span>${esc(m.title)}</div>
      <div class="block-actions">${(m.options || []).map((o) => `<button class="opt">${esc(o)}</button>`).join('')}</div>
    </div>`;
  }
  if (m.kind === 'promote') {
    return `
    <div class="promote-strip">${esc(m.text)}<button class="promote-btn">提升为 Issue</button></div>`;
  }
  // 普通话轮
  if (m.from === 'you') {
    return `
    <div class="msg turn you">
      <span class="avatar-you" title="你（CVO）">你</span>
      <div class="msg-bubble"><div class="msg-text">${esc(m.text)}</div></div>
    </div>`;
  }
  const s = soul(m.from);
  const handoff = m.handoff ? `<div class="handoff-inline">交给 <span class="to">@${esc((soul(m.handoff) || {}).name || m.handoff)}</span> 接手 · 对方独立执行</div>` : '';
  const family = m.family_note ? `<div class="family-note">${esc(m.family_note)}</div>` : '';
  return `
  <div class="msg turn soul">
    ${avatar(s, 'sm')}
    <div class="msg-bubble">
      <div class="msg-who">${esc(s ? s.name : '')} <span class="msg-model">${esc(s ? s.model : '')}</span></div>
      <div class="msg-text">${esc(m.text)}</div>
      ${handoff}${family}
    </div>
  </div>`;
}

function renderComposer(pid, th) {
  const p = project(pid);
  return `
  <div class="composer">
    <div class="mention-row">
      <span class="mention-label">交给</span>
      ${(p.member_ids || []).map((sid) => {
        const s = soul(sid);
        return s ? `<button class="mention-chip" data-mention="${esc(s.id)}">${avatar(s, 'sm')}${esc(s.name)}</button>` : '';
      }).join('')}
    </div>
    <textarea class="composer-input" placeholder="对团队说…  说完就走，成员异步继续（@某人 = 交给对方接手，各自独立执行）"></textarea>
    <div class="composer-actions">
      <div class="turn-mode" role="group" aria-label="回合模式">
        <button class="tm active">build</button><button class="tm">plan</button><button class="tm">ask</button>
      </div>
      <button class="send">发送</button>
    </div>
  </div>`;
}

/* ============================================================
   产物预览面（dyad 式，四切换：预览 / 文件 / 产物网格 / Workspace）
   ============================================================ */
function renderPreview(pid, art, tab) {
  tab = tab || 'preview';
  const tabs = `
  <div class="preview-tabs">
    <button class="pv-tab ${tab === 'preview' ? 'active' : ''}" data-pv="preview">预览</button>
    <button class="pv-tab ${tab === 'files' ? 'active' : ''}" data-pv="files">文件</button>
    <button class="pv-tab ${tab === 'grid' ? 'active' : ''}" data-pv="grid">产物</button>
    <button class="pv-tab ${tab === 'workspace' ? 'active' : ''}" data-pv="workspace">Workspace</button>
    ${art && tab === 'preview' ? `<div class="ver-rail">${(art.versions || []).map((v) => `<button class="ver ${v === art.current ? 'cur' : ''}">${esc(v)}</button>`).join('')}</div>` : ''}
  </div>`;

  let body = '';
  if (tab === 'preview') body = renderArtifactPreview(art);
  else if (tab === 'files' || tab === 'workspace') body = `<div class="pv-body">${renderFileTree(pid)}</div>`;
  else if (tab === 'grid') body = `<div class="pv-body">${renderArtifactGrid(pid)}</div>`;

  const foot = art && tab === 'preview'
    ? `<div class="pv-foot"><span class="trace">溯源 ${esc(art.trace)}</span><button class="export">导出</button></div>`
    : '';

  return tabs + body + foot;
}

function renderArtifactPreview(a) {
  if (!a) {
    return `<div class="pv-empty">
      <span class="big">这条对话还没有产物</span>
      <span class="sub">souls 产出图片 / 视频 / 网站 / 文稿后，会在这里就地预览。随手聊也可以先不产出。</span>
    </div>`;
  }
  let inner = '';
  if (a.medium === 'novel' || a.medium === 'doc') {
    inner = `<div class="pv-reader"><h3>${esc(a.title)}</h3><p>${esc(a.sample || '')}</p><p class="muted">分章分页阅读…</p></div>`;
  } else if (a.medium === 'image') {
    inner = `<div class="pv-gallery">${[0, 0, 0, 0].map(() => '<div class="thumb"></div>').join('')}</div>`;
  } else if (a.medium === 'video' || a.medium === 'audio') {
    inner = `<div class="pv-player"><div class="video-frame"><span class="play-tri"></span>${esc(a.current)}</div><div class="timeline"></div><div class="muted" style="font-family:var(--mono);font-size:12px;color:var(--ink-3)">${esc(a.title)}</div></div>`;
  } else if (a.medium === 'app') {
    inner = `<div class="pv-live"><div class="win-chrome"><span></span><span></span><span></span></div><div class="iframe-mock">live preview · ${esc(a.title)}<button class="run">运行</button></div></div>`;
  }
  return `<div class="pv-body">${inner}</div>`;
}

function renderArtifactGrid(pid) {
  const arts = artifactsFor(pid);
  if (!arts.length) return '<div class="pv-empty"><span class="big">暂无产物</span></div>';
  return `<div class="proj-grid" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">
    ${arts.map((a) => `
      <button class="proj-card" data-artifact="${esc(a.id)}" style="padding:0;overflow:hidden">
        <div style="height:90px;border-bottom:1px solid var(--line);background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-family:var(--mono);font-size:11px;color:var(--ink-3)">${esc(MEDIUM_LABEL[a.medium])}</div>
        <div style="padding:11px 12px">
          <div style="font-size:12.5px;font-weight:600;color:var(--ink);margin-bottom:4px">${esc(a.title)}</div>
          <div style="font-family:var(--mono);font-size:10px;color:var(--ink-3)">${esc(a.current)} · ${(a.versions || []).length} 版</div>
        </div>
      </button>`).join('')}
  </div>`;
}

function renderFileTree(pid) {
  const files = DATA.files[pid] || [];
  const rows = files.map((f) => {
    const ext = f.ext === 'dir' ? 'DIR' : (f.ext || '').toUpperCase();
    const isDir = f.ext === 'dir';
    const tag = f.tag ? `<span class="ws-tag ${esc(f.tag)}">${esc(f.tag)}</span>` : '';
    return `<div class="ws-row"><span class="ws-ext">${esc(ext)}</span><span class="ws-path ${isDir ? 'dir' : ''}">${esc(f.p)}</span>${tag}</div>`;
  }).join('');
  return `<div class="pv-tree">${rows || '<div class="ws-row"><span class="ws-path">空</span></div>'}</div>`;
}

/* ============================================================
   BOARD · Linear 式状态列（issue 与 chat 松耦合）
   ============================================================ */
const BOARD_COLS = ['triage', 'todo', 'doing', 'review', 'blocked', 'done'];
const COL_DOT = {
  triage: 'var(--ink-disabled)', todo: 'var(--slate-fg)', doing: 'var(--blue-fg)',
  review: 'var(--amber-fg)', blocked: 'var(--red-fg)', done: 'var(--green-fg)',
};

function renderBoard(pid) {
  const issues = DATA.issues.filter((i) => i.project_id === pid);
  const cols = BOARD_COLS.map((st) => {
    const inCol = issues.filter((i) => i.status === st);
    const cards = inCol.map(renderIssueCard).join('') || '<p class="board-empty">-</p>';
    return `
    <section class="board-col">
      <header class="board-col-head">
        <span class="board-col-dot" style="background:${COL_DOT[st]}"></span>
        <span class="board-col-name">${esc(STATUS_LABEL[st] || st)}</span>
        <span class="board-col-ct">${inCol.length}</span>
      </header>
      <div class="board-col-body">${cards}</div>
    </section>`;
  }).join('');

  return `
  <div class="board-wrap">
    <div class="board-bar">
      <h2 class="board-h">Board</h2>
      <span class="board-sub">issue 与 chat 松耦合 · issue 只是 chat 的可选来源 · 点卡跳回它的 session chain</span>
      <button class="board-new">+ 新建 issue</button>
    </div>
    <div class="board-cols">${cols}</div>
  </div>`;
}

function renderIssueCard(iss) {
  const holder = soul(iss.holder);
  // 关联的 thread（松耦合：可能没有、可能多个）
  const ths = (iss.thread_ids || []).map((id) => DATA.threads.find((t) => t.id === id)).filter(Boolean);
  const th = ths[0];
  const art = th && th.artifact_id ? artifact(th.artifact_id) : null;
  const fresh = art && art.unseen;

  const gate = iss.gate ? `<span class="ic-badge gate" title="硬门待放行">L0</span>` : '';
  const freshBadge = fresh ? `<span class="ic-badge fresh" title="新产物未看">新</span>` : '';
  const chain = th && th.sessions && th.sessions.length > 1 ? chainMini(th) : '';
  const noThread = ths.length === 0
    ? (iss.claim === 'claimed'
        ? '<span class="ic-nothread claiming" title="Orchestrator 认领中，正在建 workspace">认领中…</span>'
        : '<span class="ic-nothread" title="还没 thread，团队会自动拉取">待拉取</span>')
    : '';

  // 验收进度
  const acc = iss.acceptance || [];
  const accDone = acc.filter((a) => a.done).length;
  const accBar = acc.length
    ? `<span class="ic-acc"><span class="ic-acc-fill" style="width:${Math.round(accDone / acc.length * 100)}%"></span></span><span class="ic-acc-n">${accDone}/${acc.length}</span>`
    : '';

  return `
  <button class="issue-card" data-issue="${esc(iss.id)}" data-thread="${esc(th ? th.id : '')}">
    <div class="ic-top">
      <span class="ic-id">${esc(iss.id)}</span>
      ${gate}${freshBadge}
      ${holder ? `<span class="ic-holder">${avatar(holder, 'sm')}</span>` : '<span class="ic-holder none" title="未分配">·</span>'}
    </div>
    <div class="ic-title">${esc(iss.title)}</div>
    <div class="ic-foot">
      ${noThread || chain}
      <span class="ic-foot-spacer"></span>
      ${accBar}
    </div>
  </button>`;
}

/* ---------- Issue 详情（Linear 式：左主区 + 右属性栏）---------- */
function renderIssueDetail(pid, issueId) {
  const iss = issue(issueId);
  const p = project(pid);
  if (!iss) return renderBoard(pid);

  const holder = soul(iss.holder);
  const stCls = STATE_CLASS[iss.status] || 'st-open';
  const ths = (iss.thread_ids || []).map((id) => DATA.threads.find((t) => t.id === id)).filter(Boolean);

  // 左主区：面包屑 + 标题 + 描述 + 验收清单 + 关联 session chain + 活动 + 评论
  const acc = iss.acceptance || [];
  const accDone = acc.filter((a) => a.done).length;
  const accList = acc.length
    ? acc.map((a, ai) => `
      <li class="acc-item ${a.done ? 'done' : ''}" data-acc="${ai}">
        <span class="acc-box" title="勾选完成">${a.done ? '✓' : ''}</span>
        <span class="acc-txt">${esc(a.text)}</span>
        <button class="acc-del" data-acc-del="${ai}" title="删除">×</button>
      </li>`).join('')
    : '<li class="acc-empty">还没有验收标准</li>';

  // 关联 thread / session chain 链接区（松耦合的关键落点）
  const threadLinks = ths.length
    ? ths.map((th) => {
        const chain = th.sessions && th.sessions.length > 1 ? chainMini(th) : '';
        const art = th.artifact_id ? artifact(th.artifact_id) : null;
        return `
        <button class="idr-thread" data-thread="${esc(th.id)}">
          <span class="idr-thread-top">
            <span class="sess-kind ${esc(th.kind)}">${th.kind === 'issue' ? 'ISSUE' : '随手'}</span>
            <span class="idr-thread-title">${esc(th.title)}</span>
            ${chain}
          </span>
          <span class="idr-thread-sub">
            ${th.sessions ? th.sessions.length : 0} 人接力 · 当前负责 ${esc((soul((th.sessions[lastActiveIdx(th.sessions)] || {}).soul) || {}).name || '-')}
            ${art ? ` · 产物 ${esc(art.current)}` : ''}
          </span>
        </button>`;
      }).join('')
    : (iss.claim === 'claimed'
        ? `<div class="idr-nothread claimed">
             <span class="idr-claim-dot"></span>
             <span>Orchestrator 已认领（Claimed）· 正在建隔离 workspace…</span>
           </div>`
        : `<div class="idr-nothread">
             <span>还没有 session。团队按 Symphony 式自动拉取：认领 → 建隔离 workspace → 开 thread 起草。</span>
             <button class="idr-pull">团队拉取 · 开 thread</button>
           </div>`);

  const desc = iss.desc || '';
  const descPlaceholder = '加个描述… 背景、目标、约束。点击编辑。';

  // 评论区（活动流 + comment 混排，Linear 式）
  const comments = iss.comments || [];
  const commentList = comments.map((c) => {
    const cs = soul(c.from);
    const who = c.from === 'you' ? '你' : (cs ? cs.name : c.from);
    const av = c.from === 'you'
      ? '<span class="avatar-you">你</span>'
      : avatar(cs, 'sm');
    return `
    <div class="idr-comment">
      ${av}
      <div class="idr-comment-body">
        <div class="idr-comment-top"><b>${esc(who)}</b>${cs ? `<span class="idr-comment-model">${esc(cs.model)}</span>` : ''}<span class="idr-comment-time">${esc(c.time || '')}</span></div>
        <div class="idr-comment-text">${esc(c.text)}</div>
      </div>
    </div>`;
  }).join('');

  const main = `
  <div class="idr-main">
    <div class="idr-crumb">
      <button class="idr-back">Board</button>
      <span class="idr-crumb-sep">/</span>
      <span>${esc(p.name)}</span>
      <span class="idr-crumb-sep">/</span>
      <span class="idr-crumb-id">${esc(iss.id)}</span>
    </div>
    <h1 class="idr-title" contenteditable="true" spellcheck="false" data-edit="title" title="点击编辑标题">${esc(iss.title)}</h1>
    <div class="idr-desc ${desc ? '' : 'empty'}" contenteditable="true" spellcheck="false" data-edit="desc" data-ph="${esc(descPlaceholder)}">${esc(desc)}</div>

    <div class="idr-block-h">验收标准 <span class="idr-block-n" id="acc-count">${accDone}/${acc.length}</span></div>
    <ul class="acc-list">${accList}</ul>
    <div class="acc-add">
      <span class="acc-box add">+</span>
      <input class="acc-add-input" placeholder="加一条验收标准，回车确认" />
    </div>

    <div class="idr-block-h">关联 session chain <span class="idr-block-n">${ths.length} thread</span></div>
    <div class="idr-threads">${threadLinks}</div>

    <div class="idr-block-h">活动 · 评论 <span class="idr-block-n">${comments.length}</span></div>
    <div class="idr-activity">
      <div class="idr-act"><span class="idr-act-dot"></span>issue 创建 · 落 Board</div>
      ${holder ? `<div class="idr-act"><span class="idr-act-dot"></span>派给 ${esc(holder.name)}（自动拉取）</div>` : ''}
      ${ths.length ? `<div class="idr-act"><span class="idr-act-dot"></span>开 ${ths.length} 条 session · 接力协作中</div>` : ''}
      ${iss.gate ? `<div class="idr-act gate"><span class="idr-act-dot"></span>触发硬门 ${esc(iss.gate.kind)} · 待你放行</div>` : ''}
    </div>
    <div class="idr-comments">${commentList}</div>
    <div class="idr-comment-composer">
      <span class="avatar-you">你</span>
      <div class="idr-cc-wrap">
        <textarea class="idr-cc-input" placeholder="写条评论…  @成员可请对方接手，Cmd/Ctrl+Enter 发送"></textarea>
        <div class="idr-cc-actions"><button class="idr-cc-send">评论</button></div>
      </div>
    </div>
  </div>`;

  // 右属性栏：可编辑（状态 / 负责人 / 优先级 下拉即改）
  const prio = iss.prio || (iss.gate ? '高' : iss.status === 'review' ? '中' : '常规');
  const statusOpts = ['triage', 'todo', 'doing', 'review', 'blocked', 'done']
    .map((s) => `<option value="${s}" ${s === iss.status ? 'selected' : ''}>${esc(STATUS_LABEL[s] || s)}</option>`).join('');
  const memberSouls = (p.member_ids || []).map(soul).filter(Boolean);
  const holderOpts = ['<option value="">未分配</option>']
    .concat(memberSouls.map((s) => `<option value="${s.id}" ${s.id === iss.holder ? 'selected' : ''}>${esc(s.name)} · ${esc(s.role)}</option>`)).join('');
  const prioOpts = ['常规', '中', '高']
    .map((x) => `<option value="${x}" ${x === prio ? 'selected' : ''}>${esc(x)}</option>`).join('');

  const side = `
  <aside class="idr-side">
    <div class="idr-prop">
      <span class="idr-prop-k">状态</span>
      <div class="idr-select-wrap" data-status-badge="${stCls}">
        <span class="chat-state ${stCls}" id="status-badge">${esc(STATUS_LABEL[iss.status] || iss.status)}</span>
        <select class="idr-select" data-edit-prop="status">${statusOpts}</select>
      </div>
    </div>
    <div class="idr-prop">
      <span class="idr-prop-k">负责人</span>
      <div class="idr-select-wrap">
        <span class="idr-prop-holder">${holder ? avatar(holder, 'sm') + esc(holder.name) : '<span class="idr-prop-v none">未分配</span>'}</span>
        <select class="idr-select" data-edit-prop="holder">${holderOpts}</select>
      </div>
    </div>
    <div class="idr-prop">
      <span class="idr-prop-k">优先级</span>
      <div class="idr-select-wrap">
        <span class="idr-prop-v">${esc(prio)}</span>
        <select class="idr-select" data-edit-prop="prio">${prioOpts}</select>
      </div>
    </div>
    <div class="idr-prop">
      <span class="idr-prop-k">硬门</span>
      <span class="idr-prop-v">${iss.gate ? `<span class="idr-gate">${esc(iss.gate.kind)}</span>` : '无'}</span>
    </div>
    <div class="idr-prop">
      <span class="idr-prop-k">派驻队</span>
      <span class="idr-prop-v">${esc((team(p.team_id) || {}).name || '-')}</span>
    </div>
    <div class="idr-prop col">
      <span class="idr-prop-k">时间</span>
      <span class="idr-prop-time">创建 3d 前 · 更新 12m 前</span>
    </div>
  </aside>`;

  return `<div class="idr-wrap">${main}${side}</div>`;
}

/* ============================================================
   TEAM · 派驻花名册 + 记忆分层 + 成长三桶
   ============================================================ */
const GROWTH_LABEL = { principle: '原则', pattern: '套路', scar: '疤' };

function renderTeam(pid) {
  const p = project(pid);
  const t = team(p.team_id);
  const members = (p.member_ids || []).map(soul).filter(Boolean);
  const mem = DATA.memory[pid] || { base: [], slice: [], growth: [] };

  // 每个 soul 在本项目的当前 session 状态（从 threads 汇总取最活跃）
  const soulStatus = {};
  threadsFor(pid).forEach((th) => (th.sessions || []).forEach((sess) => {
    const rank = { active: 3, blocked: 2, done: 1, idle: 0 };
    if (!soulStatus[sess.soul] || (rank[sess.status] || 0) > (rank[soulStatus[sess.soul]] || 0)) {
      soulStatus[sess.soul] = sess.status;
    }
  }));
  const ST_TXT = { active: '在工作', blocked: '被阻塞', done: '已交付', idle: '空闲' };

  // ① 派驻成员条（每张卡 = 一条 Posting）
  const roster = members.map((s) => {
    const st = soulStatus[s.id] || 'idle';
    const stCls = st === 'active' ? 'active' : st === 'blocked' ? 'blocked' : '';
    // 本项目 role 从 team 里取，autonomy 用 mock 档
    const auto = s.family === 'gpt' ? 'L1' : s.family === 'claude' ? 'L2' : 'L1';
    return `
    <article class="posting-card">
      <div class="posting-top">
        ${avatar(s, 'lg')}
        <div class="posting-id">
          <div class="posting-name">${esc(s.name)}</div>
          <div class="posting-role">${esc(s.role)}</div>
        </div>
        <span class="posting-status ${stCls}" title="本项目当前状态">${esc(ST_TXT[st] || st)}</span>
      </div>
      <div class="posting-meta">
        <span class="posting-model">${esc(s.model)}</span>
        <span class="posting-auto" title="autonomy 档">${auto}</span>
      </div>
    </article>`;
  }).join('');

  // ② 记忆分层：基座（弱化只读） | 切片（可编辑 + ↑提升）
  const baseList = (mem.base || []).map((x) => `<li class="mem-li">${esc(x)}</li>`).join('');
  const sliceList = (mem.slice || []).map((s) => `
    <li class="mem-li slice">
      <span class="mem-li-txt">${esc(s.text)}</span>
      ${s.promoted
        ? '<span class="mem-promoted" title="已提升到基座">已入基座</span>'
        : '<button class="mem-promote" title="泛化后固化进跨项目基座">↑ 提升</button>'}
    </li>`).join('');

  // ③ 成长时间线：三桶 filter + 卡片（出处 / 层级 / 被召回次数）
  const growth = mem.growth || [];
  const growthCards = growth.map((g) => {
    const recalls = g.recalls || 0;
    const recallCls = recalls >= 3 ? 'hot' : recalls === 0 ? 'cold' : '';
    return `
    <article class="growth-card" data-kind="${esc(g.kind)}">
      <div class="growth-top">
        <span class="growth-tag ${esc(g.kind)}">${esc(GROWTH_LABEL[g.kind] || g.kind)}</span>
        ${g.cat ? `<span class="growth-cat">${esc(g.cat)}</span>` : ''}
        <span class="growth-level ${g.level === 'base' ? 'base' : 'slice'}" title="${g.level === 'base' ? '已泛化进基座' : '本项目切片级'}">${g.level === 'base' ? '基座' : '切片'}</span>
      </div>
      <div class="growth-text">${esc(g.text)}</div>
      <div class="growth-foot">
        <span class="growth-src" title="出处，可回溯">${esc(g.src)}</span>
        <span class="growth-recalls ${recallCls}" title="被召回次数 · 召回才是经验">召回 ${recalls}</span>
      </div>
    </article>`;
  }).join('');

  const filters = ['all', 'principle', 'pattern', 'scar'].map((k) => {
    const lbl = k === 'all' ? '全部' : GROWTH_LABEL[k];
    return `<button class="growth-filter ${k === 'all' ? 'active' : ''}" data-filter="${k}">${lbl}</button>`;
  }).join('');

  return `
  <div class="team-wrap">
    <div class="team-bar">
      <h2 class="board-h">Team</h2>
      <span class="board-sub">派驻(Posting) 是 Project 所有的一等关系 · 同一 soul 派到不同项目挂不同 skill / 记忆切片 / role / autonomy</span>
    </div>

    <div class="team-sec-h">派驻本项目 <span class="n">${members.length} 人 · 来自 ${esc(t ? t.name : '')}</span></div>
    <div class="posting-strip">${roster}</div>

    <div class="team-sec-h">队 skill <span class="n">派驻时挂载</span></div>
    <div class="skill-strip">${(t ? t.skills : []).map((sk) => `<span class="skill-chip">${esc(sk)}</span>`).join('')}</div>

    <div class="team-sec-h">记忆分层 <span class="n">基座跨项目共享 · 切片本项目专属</span></div>
    <div class="mem-cols">
      <div class="mem-card base">
        <div class="mem-card-h">基座 <span class="mem-scope">跨项目 · 只读</span></div>
        <ul class="mem-list">${baseList || '<li class="mem-li empty">-</li>'}</ul>
      </div>
      <div class="mem-card slice">
        <div class="mem-card-h">本项目切片 <span class="mem-scope">可编辑</span></div>
        <ul class="mem-list">${sliceList || '<li class="mem-li empty">-</li>'}</ul>
      </div>
    </div>

    <div class="team-sec-h">成长 · 反思 · 学习 <span class="n">从这个项目学到 / 犯过什么 · 召回才是经验</span></div>
    <div class="growth-filters">${filters}</div>
    <div class="growth-list">${growthCards || '<p class="board-empty">这个项目还没有沉淀经验</p>'}</div>
  </div>`;
}

/* ============================================================
   ARTIFACTS · 全项目产物画廊 + Versions 时光机
   ============================================================ */
function renderArtifactsSection(pid) {
  const arts = artifactsFor(pid);
  if (!arts.length) {
    return `<div class="sec-wrap"><h2 class="sec-h">Artifacts</h2>
      <div class="sec-empty">这个项目还没有产物。去 Chat 让团队产出图片 / 视频 / 网站 / 文稿。</div></div>`;
  }
  const cards = arts.map((a) => {
    const fresh = a.unseen ? '<span class="agal-fresh" title="新版本未看"></span>' : '';
    const th = DATA.threads.find((t) => t.artifact_id === a.id);
    // 版本时光机：每个版本一个节点，current 高亮
    const timeline = (a.versions || []).map((v) => `
      <button class="agal-ver ${v === a.current ? 'cur' : ''}" data-artifact="${esc(a.id)}" data-ver="${esc(v)}" title="回看 ${esc(v)}">${esc(v)}</button>`).join('<span class="agal-ver-link"></span>');
    return `
    <article class="agal-card" data-artifact="${esc(a.id)}">
      <div class="agal-thumb ${esc(a.medium)}">
        ${a.medium === 'video' ? '<span class="play-tri"></span>' : a.medium === 'app' ? 'live preview' : a.medium === 'novel' || a.medium === 'doc' ? '<span class="agal-doc-lines"></span>' : ''}
        ${fresh}
        <span class="agal-medium">${esc(MEDIUM_LABEL[a.medium] || 'FILE')}</span>
      </div>
      <div class="agal-body">
        <div class="agal-title">${esc(a.title)}</div>
        <div class="agal-trace">溯源 ${esc(a.trace)}</div>
        <div class="agal-timeline">
          <span class="agal-tl-label">版本时光机</span>
          <div class="agal-vers">${timeline}</div>
        </div>
      </div>
    </article>`;
  }).join('');
  return `
  <div class="sec-wrap">
    <div class="sec-bar">
      <h2 class="sec-h">Artifacts</h2>
      <span class="sec-sub">全项目可预览产物 · 按版本迭代 · 旧版不覆盖可回看对比 · 点卡进对应 thread</span>
    </div>
    <div class="agal-grid">${cards}</div>
  </div>`;
}

/* ============================================================
   WORKSPACE · 真·树状视图 + diff（磁盘真相，非预览）
   ============================================================ */
// 从扁平路径数组构建嵌套树：{ name, path, dir, children[], file? }
function buildFileTree(files) {
  const root = { name: '', path: '', dir: true, children: [] };
  files.forEach((f) => {
    const explicitDir = f.ext === 'dir';
    const segs = f.p.replace(/\/$/, '').split('/');
    let node = root;
    segs.forEach((seg, i) => {
      const last = i === segs.length - 1;
      const isFileLeaf = last && !explicitDir;
      let child = node.children.find((c) => c.name === seg);
      if (!child) {
        child = {
          name: seg,
          path: segs.slice(0, i + 1).join('/'),
          dir: !isFileLeaf,
          children: [],
          file: isFileLeaf ? f : null,
        };
        node.children.push(child);
      }
      node = child;
    });
  });
  // 目录在前、文件在后，各自按名排序
  const sortRec = (n) => {
    n.children.sort((a, b) => (a.dir === b.dir ? a.name.localeCompare(b.name) : a.dir ? -1 : 1));
    n.children.forEach(sortRec);
  };
  sortRec(root);
  return root;
}

function renderTreeNodes(nodes, focus, depth) {
  return nodes.map((n) => {
    const pad = 8 + depth * 14;
    if (n.dir) {
      return `
      <div class="wt-dir" data-dir="${esc(n.path)}">
        <button class="wt-row wt-dir-row" style="padding-left:${pad}px" data-toggle="${esc(n.path)}">
          <span class="wt-caret">▾</span>
          <span class="wt-icon">▸</span>
          <span class="wt-name">${esc(n.name)}</span>
        </button>
        <div class="wt-children">${renderTreeNodes(n.children, focus, depth + 1)}</div>
      </div>`;
    }
    const f = n.file || {};
    const ext = (f.ext || '').toUpperCase();
    const changed = f.tag === '改' || f.tag === '产物';
    const tag = f.tag ? `<span class="ws-tag ${esc(f.tag)}">${esc(f.tag)}</span>` : '';
    const isFocus = n.path === focus;
    return `
    <button class="wt-row wt-file ${isFocus ? 'focus' : ''} ${changed ? 'changed' : ''}" style="padding-left:${pad}px" data-path="${esc(n.path)}">
      <span class="wt-ext">${esc(ext)}</span>
      <span class="wt-name">${esc(n.name)}</span>
      ${tag}
    </button>`;
  }).join('');
}

function renderWorkspaceSection(pid, focusPath) {
  const files = DATA.files[pid] || [];
  const cfg = (DATA.config || {})[pid] || {};
  const flatFiles = files.filter((f) => f.ext !== 'dir' || false);
  const focus = focusPath || (files.find((f) => f.tag === '改') || files.find((f) => f.ext !== 'dir') || {}).p || '';
  const tree = buildFileTree(files);
  const treeHtml = renderTreeNodes(tree.children, focus, 0) || '<div class="sec-empty">空</div>';

  const focusFile = files.find((f) => f.p === focus) || {};
  const diff = mockDiff(focus);
  const isChanged = focusFile.tag === '改' || focusFile.tag === '产物';
  const viewer = focus
    ? `
      <div class="ws2-diff-head">
        <span class="mono">${esc(focus)}</span>
        ${isChanged ? '<span class="ws2-changed">本轮有改动</span>' : '<span class="ws2-clean">无改动</span>'}
      </div>
      <pre class="ws2-diff-body">${esc(diff)}</pre>
      <div class="ws2-diff-foot">
        <span class="trace">chat 产出的文件 = workspace 一等节点，与代码同版本（git 化）</span>
        <button class="ws-commit">看 commit 锚</button>
      </div>`
    : '<div class="ws2-diff-empty">点左侧文件查看内容 / 改动。</div>';

  return `
  <div class="sec-wrap">
    <div class="sec-bar">
      <h2 class="sec-h">Workspace</h2>
      <span class="sec-sub">项目实际文件产出（磁盘真相 · 树状）· 根 <span class="mono">${esc(cfg.workspace_root || '~/' + pid)}</span></span>
    </div>
    <div class="ws2-layout">
      <div class="ws2-tree">${treeHtml}</div>
      <div class="ws2-diff" id="ws2-diff">${viewer}</div>
    </div>
  </div>`;
}

// mock diff 内容（按文件路径给点示意 diff）
function mockDiff(path) {
  const diffs = {
    "src/auth/oauth.ts": "@@ src/auth/oauth.ts @@\n+ export async function handleCallback(code, state) {\n+   if (!verifyState(state)) throw new CsrfError()   // 砚补的 state 校验\n+   const token = await exchange(code)\n+   return session.create(token)\n+ }",
    "src/pages/login.tsx": "@@ src/pages/login.tsx @@\n+ <button onClick={oauthLogin}>用 GitHub 登录</button>\n+ {loading && <Spinner />}   // 金建议补的 loading 态",
    "manuscript/ch07.md": "@@ manuscript/ch07.md @@\n- 她关上窗。\n+ 夜色像浸了墨的宣纸，一点点洇开。她推开窗，风里有远处火车的气味。\n+ （檀润色 · 结尾埋与第三章火车的呼应）",
    "ep3/out.mp4": "二进制产物 · v4 渲染成片\n分辨率 1080×1920 · 时长 58s · 烁渲染 / 弦配乐",
  };
  return diffs[path] || "（这个文件本次无改动记录）";
}

/* ============================================================
   项目设置 · 派驻配置 + autonomy + 权限矩阵 + 项目级配置
   ============================================================ */
const AUTO_DESC = { L0: '仅建议', L1: '可逆自动', L2: '可回滚自动', L3: '不可逆需人批' };
const PERM_ACTS = ['读文件', '写文件', '装依赖', 'push外发', '删除'];

function renderProjectSettings(pid) {
  const p = project(pid);
  const t = team(p.team_id);
  const postings = (DATA.postings || {})[pid] || [];
  const cfg = (DATA.config || {})[pid] || {};

  // 派驻成员配置卡
  const cards = postings.map((po, idx) => {
    const s = soul(po.soul);
    if (!s) return '';
    const autoBtns = ['L0', 'L1', 'L2', 'L3'].map((lv) =>
      `<button class="ps-auto ${lv === po.autonomy ? 'active' : ''}" data-posting="${idx}" data-auto="${lv}" title="${AUTO_DESC[lv]}">${lv}</button>`).join('');
    const skills = (po.skills || []).map((sk) => `<span class="skill-chip">${esc(sk)}</span>`).join('');
    const permRows = PERM_ACTS.map((act) => {
      const v = (po.perms || {})[act] || 'allow';
      const cell = (val, lbl) => `<button class="ps-perm ${v === val ? 'active ' + val : ''}" data-posting="${idx}" data-act="${esc(act)}" data-perm="${val}">${lbl}</button>`;
      return `
      <div class="ps-perm-row">
        <span class="ps-perm-act">${esc(act)}</span>
        <div class="ps-perm-cells">${cell('allow', '放行')}${cell('interrupt', '人批')}${cell('deny', '禁止')}</div>
      </div>`;
    }).join('');
    return `
    <article class="ps-card">
      <div class="ps-card-head">
        ${avatar(s, 'lg')}
        <div class="ps-card-id">
          <div class="ps-card-name">${esc(s.name)} <span class="ps-role" contenteditable="true" spellcheck="false" data-posting="${idx}">${esc(po.role)}</span></div>
          <div class="ps-card-model">${esc(s.model)} · 本项目派驻</div>
        </div>
        <button class="ps-remove" data-posting="${idx}" title="停用派驻（记忆切片保留）">停用</button>
      </div>
      <div class="ps-row">
        <span class="ps-k">autonomy 档</span>
        <div class="ps-autos">${autoBtns}<span class="ps-auto-desc">${esc(AUTO_DESC[po.autonomy] || '')}</span></div>
      </div>
      <div class="ps-row">
        <span class="ps-k">skill 挂载</span>
        <div class="skill-strip">${skills}<button class="ps-skill-add" data-posting="${idx}">+</button></div>
      </div>
      <div class="ps-row col">
        <span class="ps-k">权限矩阵 <span class="ps-k-hint">危险动作默认「人批」，主动放宽</span></span>
        <div class="ps-perms">${permRows}</div>
      </div>
    </article>`;
  }).join('');

  return `
  <div class="sec-wrap">
    <div class="sec-bar">
      <h2 class="sec-h">项目设置</h2>
      <span class="sec-sub">仅本项目 · 全局配置（Souls / 队模板 / Provider / 记忆基座）在左下角 ⚙</span>
    </div>

    <div class="ps-sec-h">派驻队 <span class="n">${esc(t ? t.name : '')} · ${postings.length} 人派驻本项目</span></div>
    <p class="ps-note">派驻(Posting)是 Project 所有的一等关系实体：同一 soul 派到不同项目，role / autonomy / skill / 权限各自独立。改这里只动本项目，不影响该 soul 在别的项目。</p>
    <div class="ps-cards">${cards}</div>
    <button class="ps-post-add">+ 从队里派驻更多成员</button>

    <div class="ps-sec-h">项目级配置</div>
    <div class="ps-config">
      <div class="ps-cfg-row"><span class="ps-cfg-k">Workspace 根</span><span class="ps-cfg-v mono" contenteditable="true" spellcheck="false" data-cfg="workspace_root">${esc(cfg.workspace_root || '')}</span></div>
      <div class="ps-cfg-row"><span class="ps-cfg-k">产物导出目标</span><span class="ps-cfg-v" contenteditable="true" spellcheck="false" data-cfg="export_target">${esc(cfg.export_target || '')}</span></div>
      <div class="ps-cfg-row"><span class="ps-cfg-k">loop 预算</span><span class="ps-cfg-v" contenteditable="true" spellcheck="false" data-cfg="loop_budget">${esc(cfg.loop_budget || '')}</span></div>
      <div class="ps-cfg-row"><span class="ps-cfg-k">协作模式</span>
        <div class="ps-collab">
          <button class="ps-collab-btn ${cfg.collab === 'free' ? 'active' : ''}" data-collab="free">自由对话</button>
          <button class="ps-collab-btn ${cfg.collab === 'workflow' ? 'active' : ''}" data-collab="workflow">工作流</button>
        </div>
      </div>
    </div>
  </div>`;
}

/* stub fallback（未知 section）*/
function renderStub(pid, sec) {
  return `<div class="sec-wrap"><h2 class="sec-h">${esc(sec)}</h2><div class="sec-empty">未实现</div></div>`;
}

/* ============================================================
   全局 Settings（跨项目：Teams 花名册 / Soul 库 / Provider / 记忆基座）
   —— 不在任何 project 下，Rail 左下角 ⚙ 进入
   ============================================================ */
const GS_TABS = [
  { id: 'teams', label: 'Teams' },
  { id: 'providers', label: 'Providers' },
  { id: 'memory', label: '记忆基座' },
];

function renderGlobalSettings(tab, teamId, soulId) {
  tab = tab || 'teams';
  const tabs = GS_TABS.map((t) =>
    `<button class="gs-tab ${t.id === tab ? 'active' : ''}" data-gs="${t.id}">${esc(t.label)}</button>`
  ).join('');

  let body = '';
  if (tab === 'teams') body = renderGSTeams(teamId, soulId);
  else if (tab === 'providers') body = renderGSProviders();
  else if (tab === 'memory') body = renderGSMemory();

  return `
  <div class="gs-wrap">
    <div class="gs-head">
      <h1 class="gs-h">全局设置</h1>
      <p class="gs-sub">跨项目的团队与资源配置。这些是全局资产；派哪支队到某个项目、每人 autonomy 等项目级配置在各 Project 的「项目设置」里。</p>
    </div>
    <div class="gs-tabs">${tabs}</div>
    <div class="gs-body">${body}</div>
  </div>`;
}

/* Teams：master-detail —— 左队列表 + 右选中队详情。
   与全 app 的列表/详情范式一致（Board→详情、Artifacts→详情、Workspace→viewer）。
   成员行点开 = soul 全局身份详情（persona/model 跨项目恒定，改的是全局 soul 本身）。 */
function renderGSTeams(teamId, soulId) {
  const sel = DATA.teams.find((t) => t.id === teamId) || DATA.teams[0];

  // 左：队列表
  const list = DATA.teams.map((t) => {
    const n = (t.member_ids || []).length;
    const postedN = DATA.projects.filter((p) => p.team_id === t.id).length;
    const isSel = sel && t.id === sel.id;
    return `
    <button class="gst-item ${isSel ? 'active' : ''}" data-team="${esc(t.id)}">
      <span class="gst-item-name">${esc(t.name)}</span>
      <span class="gst-item-sub">${esc(t.kind)} · ${n} 成员 · 派驻 ${postedN}</span>
    </button>`;
  }).join('');

  // 右：选中队详情
  const detail = sel ? renderGSTeamDetail(sel, soulId) : '<div class="sec-empty">还没有队。新建一支。</div>';

  return `
  <div class="gs-sec-h">团队 <span class="n">${DATA.teams.length} 支 · 队 = 一组成员 soul + 默认 skill；派驻到项目时可增删改</span></div>
  <div class="gst-layout">
    <div class="gst-list">
      ${list}
      <button class="gs-new-team gst-new">+ 新建团队</button>
    </div>
    <div class="gst-detail">${detail}</div>
  </div>`;
}

function renderGSTeamDetail(t, soulId) {
  const members = (t.member_ids || []).map(soul).filter(Boolean);
  const postedTo = DATA.projects.filter((p) => p.team_id === t.id);

  const memberRows = members.map((s) => {
    const postings = DATA.projects.filter((p) => (p.member_ids || []).includes(s.id)).length;
    const open = s.id === soulId;
    return `
    <div class="gst-member ${open ? 'open' : ''}" data-soul-row="${esc(s.id)}">
      <button class="gst-member-head" data-soul-toggle="${esc(s.id)}">
        ${avatar(s, 'sm')}
        <span class="gst-member-name">${esc(s.name)}</span>
        <span class="gst-member-role">${esc(s.role)}</span>
        <span class="gst-member-model">${esc(s.model)}</span>
        <span class="gst-member-postings" title="派驻项目数">${postings} 项目</span>
        <span class="gst-member-caret">▸</span>
      </button>
      ${open ? renderSoulDetail(s, t) : ''}
    </div>`;
  }).join('');

  const skills = (t.skills || []).map((sk) =>
    `<span class="skill-chip">${esc(sk)}<button class="gs-skill-del" data-team="${esc(t.id)}" data-skill="${esc(sk)}" title="删除">×</button></span>`).join('');
  const posted = postedTo.length
    ? postedTo.map((p) => `<span class="gs-posted" data-proj="${esc(p.id)}" style="--pc:${esc(p.color)}">${esc(p.name)}</span>`).join('')
    : '<span class="gs-posted none">未派驻</span>';

  return `
  <div class="gst-d-head">
    <span class="gst-d-name" contenteditable="true" spellcheck="false" data-team="${esc(t.id)}">${esc(t.name)}</span>
    <span class="gs-team-kind">${esc(t.kind)}</span>
    <button class="gs-team-del" data-team="${esc(t.id)}" title="删除队">删除队</button>
  </div>

  <div class="gst-d-sec">
    <div class="gst-d-sec-h">成员 <span class="gs-k-hint">点成员看/改其全局身份（persona / model 跨项目恒定）</span></div>
    <div class="gst-members">${memberRows || '<div class="sec-empty">还没有成员</div>'}</div>
    <button class="gs-soul-add" data-team="${esc(t.id)}">+ 加成员</button>
  </div>

  <div class="gst-d-sec">
    <div class="gst-d-sec-h">默认 skill <span class="gs-k-hint">派驻到项目时带上，可在项目设置里增减</span></div>
    <div class="skill-strip">${skills}<button class="gs-skill-add" data-team="${esc(t.id)}">+</button></div>
  </div>

  <div class="gst-d-sec">
    <div class="gst-d-sec-h">已派驻</div>
    <div class="gs-posted-row">${posted}</div>
  </div>`;
}

/* soul 全局身份详情（点成员行展开）——改的是全局 soul 本身，跨项目/跨队恒定 */
function renderSoulDetail(s, t) {
  const teams = DATA.teams.filter((x) => (x.member_ids || []).includes(s.id)).map((x) => x.name);
  const projs = DATA.projects.filter((p) => (p.member_ids || []).includes(s.id)).map((p) => p.name);
  return `
  <div class="soul-detail">
    <div class="soul-d-warn">改这里 = 改全局身份，影响 ${esc(s.name)} 所在的所有队与项目</div>
    <div class="soul-d-row"><span class="soul-d-k">名字</span><span class="soul-d-v" contenteditable="true" spellcheck="false" data-soul="${esc(s.id)}" data-field="name">${esc(s.name)}</span></div>
    <div class="soul-d-row"><span class="soul-d-k">角色</span><span class="soul-d-v" contenteditable="true" spellcheck="false" data-soul="${esc(s.id)}" data-field="role">${esc(s.role)}</span></div>
    <div class="soul-d-row"><span class="soul-d-k">模型</span><span class="soul-d-v mono">${esc(s.model)} · ${esc(s.family)}</span></div>
    <div class="soul-d-row"><span class="soul-d-k">声音</span><span class="soul-d-v" contenteditable="true" spellcheck="false" data-soul="${esc(s.id)}" data-field="voice">${esc(s.voice || '')}</span></div>
    <div class="soul-d-row col"><span class="soul-d-k">persona</span><span class="soul-d-v persona" contenteditable="true" spellcheck="false" data-soul="${esc(s.id)}" data-field="persona">${esc(s.persona || '')}</span></div>
    <div class="soul-d-row"><span class="soul-d-k">所属队</span><span class="soul-d-v">${esc(teams.join(' · ') || '未编队')}</span></div>
    <div class="soul-d-row"><span class="soul-d-k">派驻项目</span><span class="soul-d-v">${esc(projs.join(' · ') || '未派驻')}</span></div>
    <div class="soul-d-actions"><button class="gs-soul-del" data-team="${esc(t.id)}" data-soul="${esc(s.id)}">从「${esc(t.name)}」移除</button></div>
  </div>`;
}

/* Provider / 模型注册 */
function renderGSProviders() {
  const provs = [
    { name: 'Anthropic', model: 'Claude Code', souls: DATA.souls.filter((s) => s.family === 'claude').map((s) => s.name), status: '已连接' },
    { name: 'OpenAI', model: 'Codex', souls: DATA.souls.filter((s) => s.family === 'gpt').map((s) => s.name), status: '已连接' },
    { name: 'Google', model: 'Gemini', souls: DATA.souls.filter((s) => s.family === 'gemini').map((s) => s.name), status: '已连接' },
    { name: 'opencode', model: 'opencode (多模型)', souls: DATA.souls.filter((s) => s.family === 'oc').map((s) => s.name), status: '已连接' },
  ];
  const rows = provs.map((p) => `
    <div class="gs-prov-row">
      <span class="gs-prov-name">${esc(p.name)}</span>
      <span class="gs-prov-model">${esc(p.model)}</span>
      <span class="gs-prov-souls">${esc(p.souls.join(' · ') || '未使用')}</span>
      <span class="gs-prov-status">${esc(p.status)}</span>
    </div>`).join('');
  return `
  <div class="gs-sec-h">Provider / 模型注册 <span class="n">souls 各背不同引擎；跨 family 互审靠这里的多 Provider</span></div>
  <div class="gs-prov-table">
    <div class="gs-prov-row head"><span>Provider</span><span>模型 / CLI</span><span>使用的 soul</span><span>状态</span></div>
    ${rows}
  </div>
  <button class="gs-new-team">+ 接入 Provider（BYOK）</button>`;
}

/* 跨项目记忆基座：各队的 base 层（弱化只读，来自各项目切片提升） */
function renderGSMemory() {
  const cards = DATA.teams.map((t) => {
    // 汇总该队所属项目的 base（去重）
    const projs = DATA.projects.filter((p) => p.team_id === t.id);
    const baseSet = [];
    projs.forEach((p) => (DATA.memory[p.id] || { base: [] }).base.forEach((b) => { if (!baseSet.includes(b)) baseSet.push(b); }));
    // 已从切片提升进基座的成长条
    const promoted = [];
    projs.forEach((p) => (DATA.memory[p.id] || { growth: [] }).growth.forEach((g) => { if (g.level === 'base') promoted.push({ ...g, proj: p.name }); }));
    const baseList = baseSet.map((b) => `<li class="mem-li">${esc(b)}</li>`).join('') || '<li class="mem-li empty">-</li>';
    const promotedList = promoted.map((g) => `
      <li class="gs-mem-promoted">
        <span class="growth-tag ${esc(g.kind)}">${esc(GROWTH_LABEL[g.kind] || g.kind)}</span>
        <span class="gs-mem-ptext">${esc(g.text)}</span>
        <span class="gs-mem-psrc">从 ${esc(g.proj)} 提升 · 召回 ${g.recalls || 0}</span>
      </li>`).join('');
    return `
    <article class="gs-mem-card">
      <div class="gs-mem-team">${esc(t.name)} <span class="n">跨项目基座</span></div>
      <ul class="mem-list">${baseList}</ul>
      ${promoted.length ? `<div class="gs-mem-ph">已从项目切片提升</div><ul class="gs-mem-plist">${promotedList}</ul>` : ''}
    </article>`;
  }).join('');
  return `
  <div class="gs-sec-h">跨项目记忆基座 <span class="n">各队的长期资产 · 从项目切片泛化提升而来 · 派驻新项目时自动带上</span></div>
  <div class="gs-mem-grid">${cards}</div>`;
}

/* ---------- Inbox 抽屉 ---------- */
function renderInbox() {
  return `
  <div class="inbox-head">
    <span class="inbox-title">Inbox</span>
    <span class="inbox-sub">需要你介入</span>
    <button class="inbox-close" title="关闭 (Esc)">×</button>
  </div>
  <div class="inbox-list">
    ${DATA.inbox.map((e) => {
      const p = project(e.project_id);
      return `
      <button class="inbox-item" data-proj="${esc(e.project_id)}" data-thread="${esc(e.thread_id || '')}">
        <span class="inbox-kind ${esc(e.kind)}">${esc(e.kindLabel)}</span>
        <span class="inbox-main"><span class="inbox-text">${esc(e.text)}</span><span class="inbox-proj">${esc(p ? p.name : '')}</span></span>
        <span class="inbox-time">${esc(e.time)}</span>
      </button>`;
    }).join('')}
  </div>
  <p class="inbox-foot">Inbox = 跨项目的时间脸。同一批事件在各自 Project 的 Chat / Board 里也能就地看到。</p>`;
}
