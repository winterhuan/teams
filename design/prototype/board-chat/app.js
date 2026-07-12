/* board-chat prototype · app.js · 路由 + 事件
 * 路由是"缩放级别"，不是宇宙跳转：
 *   board(scope) ←zoom→ issue(id)   —— 同一批数据的两张脸
 *   projects / teams —— 侧入口；inbox —— 抽屉 */

const app = document.getElementById('app');
const topnav = document.getElementById('nav');
const inboxBtn = document.getElementById('inbox-btn');
const inboxBadge = document.getElementById('inbox-badge');
const inboxDrawer = document.getElementById('inbox-drawer');
const scrim = document.getElementById('scrim');
const routeBar = document.getElementById('route-bar');

const state = {
  view: 'board', // board | issue | projects | teams
  scope: 'all', // board scope
  issueId: null,
};

function setRoute(patch) {
  Object.assign(state, patch);
  render();
}

function crumb() {
  if (state.view === 'issue') {
    const i = DATA.issues.find((x) => x.id === state.issueId);
    return `Board › <b>${i ? i.title : state.issueId}</b>　(拉近 = 和团队对话)`;
  }
  if (state.view === 'board')
    return state.scope === 'all'
      ? 'Board · 全部 issue（拉远 = 地图）'
      : `Board · ${project(state.scope).name}`;
  if (state.view === 'projects') return 'Projects';
  if (state.view === 'teams') return 'Teams';
  return '';
}

function render() {
  routeBar.innerHTML = crumb();

  // 顶栏高亮
  [...topnav.querySelectorAll('.nav-btn')].forEach((b) =>
    b.classList.toggle('active', b.dataset.nav === (state.view === 'issue' ? 'board' : state.view))
  );
  const inboxCount = DATA.inbox.length;
  if (inboxBadge) inboxBadge.textContent = inboxCount;

  if (state.view === 'board') app.innerHTML = renderBoard(state.scope);
  else if (state.view === 'issue') app.innerHTML = renderIssue(DATA.issues.find((i) => i.id === state.issueId));
  else if (state.view === 'projects') app.innerHTML = renderProjects();
  else if (state.view === 'teams') app.innerHTML = renderTeams();

  wire();
}

/* 事件绑定（每次 render 后重挂——原型够用） */
function wire() {
  // 卡片 → 进 issue（拉近）
  app.querySelectorAll('.card[data-issue]').forEach((el) => {
    const go = () => openIssue(el.dataset.issue);
    el.addEventListener('click', go);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') go();
    });
  });

  // 点开产物 issue 时清 unseen
  app.querySelector('.back')?.addEventListener('click', () => setRoute({ view: 'board', issueId: null }));

  // 新 issue（落 inbox 项目）
  app.querySelector('.new-issue')?.addEventListener('click', () => {
    flash('建 issue → 默认落 inbox 项目（轻到像开个对话）。原型不持久化。');
  });

  // project 卡 → 该项目 board
  app.querySelectorAll('.proj-card[data-proj]').forEach((el) =>
    el.addEventListener('click', () => setRoute({ view: 'board', scope: el.dataset.proj }))
  );

  // 内联审批 / apply / 决策：都在对话流里完成，不跳页
  app.querySelectorAll('.grant, .apply, .opt').forEach((b) =>
    b.addEventListener('click', () => flash('已在对话流内联处理（Grant/Apply/决策）——不跳页。'))
  );
  app.querySelectorAll('.deny, .reject, .retry, .run, .export').forEach((b) =>
    b.addEventListener('click', () => flash(`「${b.textContent.trim()}」内联动作（原型示意）。`))
  );

  // @mention chip → 插入 composer
  app.querySelectorAll('.mention-chip').forEach((b) =>
    b.addEventListener('click', () => {
      const ta = app.querySelector('.composer-input');
      if (ta) {
        ta.value = (ta.value + ` @${b.textContent.replace(/^.*@/, '')} `).trimStart();
        ta.focus();
      }
    })
  );

  // 发送（异步语义：说完就走）
  app.querySelector('.send')?.addEventListener('click', () => {
    const ta = app.querySelector('.composer-input');
    if (ta && ta.value.trim()) {
      appendYou(ta.value.trim());
      ta.value = '';
      flash('已发给团队 · souls 异步继续 · 你可以离开，回来看 Board 角标。');
    }
  });

  // 版本轨切换
  app.querySelectorAll('.ver').forEach((b) =>
    b.addEventListener('click', () => {
      app.querySelectorAll('.ver').forEach((x) => x.classList.remove('cur'));
      b.classList.add('cur');
      flash(`切到版本 ${b.textContent}（旧版不覆盖，可回看/对比）。`);
    })
  );
}

function openIssue(id) {
  const i = DATA.issues.find((x) => x.id === id);
  if (i && i.artifact) i.artifact.unseen = false; // 点开清 unseen
  if (i) {
    i.gate = i.gate; // 保留
    i.mentionsYou = false;
  }
  setRoute({ view: 'issue', issueId: id });
  // 滚到对话底部
  requestAnimationFrame(() => {
    const s = document.getElementById('chat-stream');
    if (s) s.scrollTop = s.scrollHeight;
  });
}

function appendYou(text) {
  const i = DATA.issues.find((x) => x.id === state.issueId);
  if (!i) return;
  i.chat.push({ kind: 'turn', from: 'you', text });
  const stream = document.getElementById('chat-stream');
  if (stream) {
    stream.insertAdjacentHTML('beforeend', renderMsg({ kind: 'turn', from: 'you', text }));
    stream.scrollTop = stream.scrollHeight;
  }
}

/* 顶栏导航 */
topnav.addEventListener('click', (e) => {
  const btn = e.target.closest('.nav-btn');
  if (!btn) return;
  const nav = btn.dataset.nav;
  if (nav === 'board') setRoute({ view: 'board', scope: 'all', issueId: null });
  else setRoute({ view: nav });
});

/* Inbox 按钮（独立于顶栏 nav） */
inboxBtn.addEventListener('click', toggleInbox);

/* Inbox 抽屉 */
function toggleInbox() {
  const open = inboxDrawer.classList.toggle('open');
  inboxDrawer.hidden = !open;
  scrim.hidden = !open;
  if (open) {
    inboxDrawer.innerHTML = renderInbox();
    inboxDrawer.querySelector('.inbox-close')?.addEventListener('click', toggleInbox);
    inboxDrawer.querySelectorAll('.inbox-item[data-issue]').forEach((el) =>
      el.addEventListener('click', () => {
        toggleInbox();
        openIssue(el.dataset.issue);
      })
    );
  }
}
scrim.addEventListener('click', toggleInbox);

/* Esc 返回 */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (inboxDrawer.classList.contains('open')) return toggleInbox();
    if (state.view === 'issue') setRoute({ view: 'board', issueId: null });
  }
});

/* 轻提示 */
let flashTimer;
function flash(msg) {
  let el = document.getElementById('flash');
  if (!el) {
    el = document.createElement('div');
    el.id = 'flash';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

render();
