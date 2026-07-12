/* board-chat prototype · M0.4.0 · 纯渲染，无框架
 * 一个对象(Issue)两张脸：Board 拉远 / Chat 拉近。
 * 视觉遵循 taste-skill/minimalist-ui：暖单色底、稀缺 pastel、无 emoji、
 * monogram 头像、几何状态点、排版层级。views.js 只生成 HTML 字符串；事件在 app.js 绑定。 */

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STATUS_LABEL = {
  triage: 'Triage',
  todo: 'Todo',
  doing: 'In Progress',
  review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
};
const STATUS_ORDER = ['triage', 'todo', 'doing', 'review', 'blocked', 'done'];

// medium → 极简标签文字（无 emoji）
const MEDIUM_LABEL = { novel: 'DOC', doc: 'DOC', image: 'IMG', video: 'VIDEO', audio: 'AUDIO', app: 'APP' };

function soul(id) {
  return DATA.souls.find((s) => s.id === id);
}
function project(id) {
  return DATA.projects.find((p) => p.id === id);
}
function issuesFor(scope) {
  return DATA.issues.filter((i) => scope === 'all' || i.project_id === scope);
}

// monogram 头像：取 soul 名首字 + family 色底
function avatar(s, size) {
  if (!s) return '';
  const cls = size ? `avatar avatar-${size}` : 'avatar';
  return `<span class="${cls} tint-${esc(s.tint)}" title="${esc(s.name)} · ${esc(s.model)}">${esc(s.name.slice(0, 1))}</span>`;
}

// 状态点：几何色点，无 emoji
function statusDot(status) {
  return `<span class="dot dot-${status}" title="${STATUS_LABEL[status]}"></span>`;
}

/* 卡角标：新版本 / 硬门 / @你。老设计的独立「新产物区」「硬门条」在这里塌成角标。 */
function cardBadges(issue) {
  const bits = [];
  if (issue.gate) bits.push(`<span class="badge gate" title="硬门待你处理">${esc(issue.gate.kind)}</span>`);
  if (issue.artifact && issue.artifact.unseen)
    bits.push(`<span class="badge fresh" title="新版本，未看">新 ${esc(issue.artifact.current)}</span>`);
  if (issue.mentionsYou) bits.push(`<span class="badge mention" title="有人 @你">@你</span>`);
  return bits.length ? `<div class="card-badges">${bits.join('')}</div>` : '';
}

function issueCard(issue) {
  const holder = soul(issue.holder);
  const p = project(issue.project_id);
  const art = issue.artifact
    ? `<span class="card-art" title="有活产物">${esc(MEDIUM_LABEL[issue.artifact.medium] || 'FILE')}</span>`
    : '';
  return `
  <article class="card${issue.gate ? ' has-gate' : ''}" data-issue="${esc(issue.id)}" tabindex="0">
    ${cardBadges(issue)}
    <div class="card-title">${esc(issue.title)}</div>
    <div class="card-foot">
      <span class="card-id mono">${esc(issue.id)}</span>
      <span class="card-proj" style="--c:${esc(p.color)}">${esc(p.name)}</span>
      <span class="card-spacer"></span>
      ${art}
      ${holder ? avatar(holder) : '<span class="unassigned" title="未分配">·</span>'}
    </div>
  </article>`;
}

/* ---------- Board：拉远的地图 ---------- */
function renderBoard(scope) {
  const issues = issuesFor(scope);
  const cols = STATUS_ORDER.map((st) => {
    const inCol = issues.filter((i) => i.status === st);
    return `
    <section class="col" data-col="${st}">
      <header class="col-head">
        ${statusDot(st)}<span class="col-name">${STATUS_LABEL[st]}</span>
        <span class="col-count mono">${inCol.length}</span>
      </header>
      <div class="col-body">
        ${inCol.map(issueCard).join('') || '<p class="col-empty">—</p>'}
      </div>
    </section>`;
  }).join('');

  return `
  <div class="board-wrap">
    <div class="board-toolbar">
      <button class="new-issue">新建 issue</button>
      <span class="toolbar-hint">点任意卡 — 拉近到「和团队的对话 + 活产物」</span>
    </div>
    <div class="board">${cols}</div>
  </div>`;
}

/* ---------- Issue = Chat（拉近）+ 活产物（有则） ---------- */
function renderIssue(issue) {
  const hasArtifact = !!issue.artifact;
  const holder = soul(issue.holder);
  const p = project(issue.project_id);

  const accCount = (issue.acceptance || []).length;
  const accDone = (issue.acceptance || []).filter((a) => a.done).length;

  const header = `
  <div class="issue-header">
    <button class="back" title="返回 Board (Esc)">Board</button>
    <span class="crumb-sep">/</span>
    <span class="issue-id mono">${esc(issue.id)}</span>
    <div class="issue-h-title">${esc(issue.title)}</div>
    <div class="issue-h-meta">
      <span class="meta-pill state-${issue.status}">${statusDot(issue.status)}${STATUS_LABEL[issue.status]}</span>
      <span class="meta-pill proj" style="--c:${esc(p.color)}">${esc(p.name)}</span>
      ${holder ? `<span class="meta-pill holder">${avatar(holder)}${esc(holder.name)}</span>` : '<span class="meta-pill holder none">未分配</span>'}
      ${accCount ? `<span class="meta-pill acc">验收 ${accDone}/${accCount}</span>` : ''}
    </div>
  </div>`;

  const chat = `
  <div class="chat-pane">
    <div class="chat-stream" id="chat-stream">
      ${issue.chat.map(renderMsg).join('')}
    </div>
    <div class="composer">
      <div class="mention-row">
        <span class="mention-label mono">派球给</span>
        ${p.souls.map((sid) => {
          const s = soul(sid);
          return `<button class="mention-chip" data-mention="${esc(s.id)}">${avatar(s)}${esc(s.name)}</button>`;
        }).join('')}
      </div>
      <textarea class="composer-input" placeholder="对团队说…  说完就走，souls 异步继续"></textarea>
      <div class="composer-actions">
        <div class="turn-mode" role="group" aria-label="回合模式">
          <button class="tm active">build</button><button class="tm">plan</button><button class="tm">ask</button>
        </div>
        <button class="send">发送</button>
      </div>
    </div>
  </div>`;

  const artifact = hasArtifact
    ? `<div class="artifact-pane">${renderArtifact(issue.artifact)}</div>`
    : '';

  return `
  ${header}
  <div class="issue-body ${hasArtifact ? 'split' : 'solo'}">
    ${chat}
    ${artifact}
  </div>`;
}

/* 消息：区分 you / soul / 富块(diff/decision/approval/error) */
function renderMsg(m) {
  if (m.kind === 'approval') {
    return `
    <div class="msg block approval">
      <div class="block-head"><span class="block-tag tag-gate">硬门 L0</span>${esc(m.title)}</div>
      <div class="block-body">${esc(m.detail)}</div>
      <div class="block-actions">
        <button class="grant primary">放行</button>
        <button class="deny">拒绝</button>
      </div>
    </div>`;
  }
  if (m.kind === 'diff') {
    const s = soul(m.from);
    return `
    <div class="msg block diff">
      <div class="block-head">${avatar(s)}<span class="block-who">${esc(s.name)}</span><span class="block-tag">变更包</span><span class="mono file">${esc(m.file)}</span></div>
      <pre class="diff-body">${esc(m.body)}</pre>
      <div class="block-actions"><button class="apply primary">应用</button><button class="reject">丢弃</button></div>
    </div>`;
  }
  if (m.kind === 'decision') {
    return `
    <div class="msg block decision">
      <div class="block-head"><span class="block-tag tag-decision">决策</span>${esc(m.title)}</div>
      <div class="block-opts">${m.options.map((o) => `<button class="opt">${esc(o)}</button>`).join('')}</div>
    </div>`;
  }
  if (m.kind === 'error') {
    return `
    <div class="msg block error">
      <div class="block-head"><span class="block-tag tag-error">运行错误</span><span class="err-note">不写进对话正文</span></div>
      <pre class="err-body">${esc(m.body)}</pre>
      <div class="block-actions"><button class="retry">重试</button></div>
    </div>`;
  }
  // 普通话轮
  if (m.from === 'you') {
    return `
    <div class="msg turn you">
      <span class="avatar avatar-you" title="你（CVO）">你</span>
      <div class="msg-bubble"><div class="msg-text">${esc(m.text)}</div></div>
    </div>`;
  }
  const s = soul(m.from);
  return `
  <div class="msg turn soul">
    ${avatar(s)}
    <div class="msg-bubble"><div class="msg-who">${esc(s.name)} <span class="msg-model mono">${esc(s.model)}</span></div><div class="msg-text">${esc(m.text)}</div></div>
  </div>`;
}

/* ---------- Artifact 预览器：按 medium 切换 ---------- */
function renderArtifact(a) {
  const versionRail = `
  <div class="ver-rail">
    ${a.versions.map((v) => `<button class="ver ${v === a.current ? 'cur' : ''}">${esc(v)}</button>`).join('')}
  </div>`;

  let preview = '';
  if (a.medium === 'novel' || a.medium === 'doc') {
    preview = `<div class="prev reader"><h3>${esc(a.title)}</h3><p class="reader-body">${esc(a.sample || '')}</p><p class="muted">分章分页阅读…</p></div>`;
  } else if (a.medium === 'image') {
    preview = `<div class="prev gallery">${(a.thumbs || [0, 0, 0, 0]).map(() => '<div class="thumb"></div>').join('')}</div>`;
  } else if (a.medium === 'video' || a.medium === 'audio') {
    preview = `<div class="prev player"><div class="video-frame"><span class="play-tri"></span></div><div class="timeline"><span class="tl-fill"></span></div><div class="muted">${esc(a.title)}</div></div>`;
  } else if (a.medium === 'app') {
    preview = `<div class="prev live"><div class="win-chrome"><span></span><span></span><span></span></div><div class="iframe-mock">live preview · ${esc(a.title)}<button class="run">运行</button></div></div>`;
  } else {
    preview = `<div class="prev file"><span class="file-name">${esc(a.title)}</span><button class="export">下载</button></div>`;
  }

  return `
  <div class="artifact-head">
    <div class="art-title-row">
      <span class="medium-tag mono">${esc(MEDIUM_LABEL[a.medium] || 'FILE')}</span>
      <span class="art-title">${esc(a.title)}</span>
    </div>
    ${versionRail}
  </div>
  ${preview}
  <div class="artifact-foot">
    <span class="trace mono">溯源 ${esc(a.trace)}</span>
    <button class="export">导出</button>
  </div>`;
}

/* ---------- Projects ---------- */
function renderProjects() {
  return `
  <div class="page-wrap">
    <h2 class="page-h">Projects</h2>
    <p class="page-sub">Project 是装 issue + 产物的盒子（必选）。<span class="mono">inbox</span> 兜住"随手探一下"的游离 issue，认真了再移进正式 project。</p>
    <div class="proj-grid">
      ${DATA.projects.map((p) => {
        const open = DATA.issues.filter((i) => i.project_id === p.id && i.status !== 'done').length;
        const arts = DATA.issues.filter((i) => i.project_id === p.id && i.artifact).length;
        return `
        <article class="proj-card" data-proj="${esc(p.id)}" tabindex="0">
          <div class="proj-bar" style="--c:${esc(p.color)}"></div>
          <div class="proj-name">${esc(p.name)}</div>
          <div class="proj-meta mono">${esc(p.medium)} · 主责 ${esc(p.team)}</div>
          <div class="proj-stats"><span>${open}</span> 开放 · <span>${arts}</span> 产物</div>
        </article>`;
      }).join('')}
    </div>
  </div>`;
}

/* ---------- Teams（花名册，不是日常导航） ---------- */
function renderTeams() {
  return `
  <div class="page-wrap">
    <h2 class="page-h">Teams</h2>
    <p class="page-sub">Team 是"谁"。日常你不按 team 导航，你在 issue 对话里 @ 他们。<span class="mono">In Review</span> = 球传给不同模型族的审查 soul。</p>
    <div class="soul-grid">
      ${DATA.souls.map((s) => `
        <article class="soul-card">
          ${avatar(s, 'lg')}
          <div class="soul-name">${esc(s.name)}</div>
          <div class="soul-role">${esc(s.role)}</div>
          <div class="soul-model mono">${esc(s.model)}</div>
        </article>`).join('')}
    </div>
  </div>`;
}

/* ---------- Inbox 抽屉：时间序事件（异步 CVO 回声） ---------- */
function renderInbox() {
  return `
  <div class="inbox-head">
    <span class="inbox-title">Inbox</span>
    <span class="inbox-sub">需要你介入</span>
    <button class="inbox-close" title="关闭 (Esc)">×</button>
  </div>
  <div class="inbox-list">
    ${DATA.inbox.map((e) => `
      <button class="inbox-item" data-issue="${esc(e.issue)}">
        <span class="inbox-kind kind-${esc(e.kind)}">${esc(e.kindLabel)}</span>
        <span class="inbox-text">${esc(e.text)}</span>
        <span class="inbox-time mono">${esc(e.time)}</span>
      </button>`).join('')}
  </div>
  <p class="inbox-foot">Inbox = 时间脸 · Board = 空间脸。同一批 issue 的两个投影。</p>`;
}
