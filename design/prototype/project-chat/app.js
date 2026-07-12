/* Hearth M0.5.0 prototype · app.js · 路由 + 事件
 * 心智：Project 是中心，Chat 是默认入口；Run 是独立执行工作面。
 *   home ──点 project──▶ project(section=chat 默认) ◀──竖排 section 切──▶ board/artifacts/...
 *   Chat 内 session 列表切 activeThread；右栏 dyad 式产物预览可折叠 + 四切换。
 *   session chain：issue 模式=接力卡（点卡头折叠/展开）+ 负责人轨；direct 模式=轻单流。 */

const shell = document.getElementById('shell');
const rail = {
  home: document.querySelector('.rail-home'),
  projects: document.getElementById('rail-projects'),
  settings: document.getElementById('rail-settings'),
};
const projNav = document.getElementById('proj-nav');
const work = document.getElementById('work');
const inboxBtn = document.getElementById('rail-inbox');
const inboxBadge = document.getElementById('inbox-badge');
const inboxDrawer = document.getElementById('inbox-drawer');
const scrim = document.getElementById('scrim');
const settingsBtn = document.getElementById('rail-settings');
const prototypeSwitcher = document.getElementById('prototype-switcher');

const PIPELINE_VARIANTS = [
  { id: 'A', label: 'Chat · Run 摘要' },
  { id: 'B', label: 'Run · Steps 工作台' },
  { id: 'C', label: 'Run · Graph 画布' },
];
const pipelineVariantFromUrl = () => {
  const v = new URLSearchParams(location.search).get('variant');
  return PIPELINE_VARIANTS.some((x) => x.id === v) ? v : 'A';
};

const state = {
  view: 'home',       // home | project | settings（全局设置）
  settingsTab: 'teams', // teams | souls | providers | memory（全局设置内的 tab）
  teamId: null,         // Teams tab：选中的队（master-detail 左选右详）
  soulId: null,         // Teams tab：展开的成员 soul 全局详情
  projectId: null,
  section: 'chat',    // chat | board | runs | artifacts | workspace | team | settings
  threadId: null,
  issueId: null,      // Board 下：选中 issue → 显示详情（Linear 式）
  previewTab: 'preview',
  collapsed: false,   // 右栏产物预览是否折叠（默认展开=分屏）
  chainView: 'relay', // relay 接力卡 | stream 对话流 | track 轨道（issue thread 的呈现方式）
  artifactId: null,   // Artifacts section 选中的产物
  wsPath: null,       // Workspace section 选中的文件
  pipelineVariant: pipelineVariantFromUrl(),
  pipelineStepId: null,
  runId: null,
  runView: 'steps',
  runInspectorTab: 'result',
};

function setPipelineVariant(id) {
  if (!PIPELINE_VARIANTS.some((v) => v.id === id)) return;
  const url = new URL(location.href);
  url.searchParams.set('variant', id);
  history.replaceState(null, '', url);
  state.pipelineVariant = id;
  state.pipelineStepId = null;
  if (state.view === 'project') {
    state.section = id === 'A' ? 'chat' : 'runs';
    state.runView = id === 'C' ? 'graph' : 'steps';
  }
  render();
}

function renderPrototypeSwitcher() {
  const idx = PIPELINE_VARIANTS.findIndex((v) => v.id === state.pipelineVariant);
  const cur = PIPELINE_VARIANTS[idx] || PIPELINE_VARIANTS[0];
  prototypeSwitcher.innerHTML = `
    <button data-variant-dir="prev" aria-label="上一个方案">←</button>
    <span><b>${cur.id}</b> · ${cur.label}</span>
    <button data-variant-dir="next" aria-label="下一个方案">→</button>`;
  prototypeSwitcher.querySelectorAll('[data-variant-dir]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const delta = btn.dataset.variantDir === 'next' ? 1 : -1;
      setPipelineVariant(PIPELINE_VARIANTS[(idx + delta + PIPELINE_VARIANTS.length) % PIPELINE_VARIANTS.length].id);
    })
  );
}

function setState(patch) {
  Object.assign(state, patch);
  render();
}

/* 进入 project：默认落 chat，activeThread = last_thread 或第一条 */
function openProject(pid, section) {
  const p = project(pid);
  const threads = threadsFor(pid);
  const first = (p && p.last_thread && threads.find((t) => t.id === p.last_thread)) || threads[0];
  setState({
    view: 'project', projectId: pid,
    section: section || (state.pipelineVariant === 'A' ? 'chat' : 'runs'),
    threadId: first ? first.id : null,
    previewTab: 'preview', collapsed: false, pipelineStepId: null,
    runId: (DATA.workflows || []).find((w) => w.project_id === pid)?.id || null,
    runView: state.pipelineVariant === 'C' ? 'graph' : 'steps', runInspectorTab: 'result',
  });
  scrollChatBottom();
}

function scrollChatBottom() {
  requestAnimationFrame(() => {
    const s = document.getElementById('chat-stream');
    if (s) s.scrollTop = s.scrollHeight;
  });
}

/* ---------- render ---------- */
function render() {
  renderPrototypeSwitcher();
  // Inbox badge
  const n = DATA.inbox.length;
  inboxBadge.textContent = n;
  inboxBadge.dataset.zero = n === 0 ? '1' : '0';

  // Rail：Home 高亮 + project 列表
  rail.home.classList.toggle('active', state.view === 'home');
  rail.projects.innerHTML = renderRailProjects(state.projectId);
  rail.projects.querySelectorAll('.rail-proj[data-proj]').forEach((el) =>
    el.addEventListener('click', () => openProject(el.dataset.proj))
  );

  rail.settings?.classList.toggle('active', state.view === 'settings');

  if (state.view === 'home') {
    shell.classList.add('home');
    projNav.hidden = true;
    work.innerHTML = renderHome();
    work.querySelectorAll('.proj-card[data-proj]').forEach((el) =>
      el.addEventListener('click', () => openProject(el.dataset.proj))
    );
    return;
  }

  // 新建 Project 表单
  if (state.view === 'newproj') {
    shell.classList.add('home');
    projNav.hidden = true;
    work.innerHTML = renderNewProject();
    wireNewProject();
    return;
  }

  // 全局 Settings（跨项目：Teams 花名册 / Soul 库 / Provider / 记忆基座）
  if (state.view === 'settings') {
    shell.classList.add('home');
    projNav.hidden = true;
    work.innerHTML = renderGlobalSettings(state.settingsTab, state.teamId, state.soulId);
    wireGlobalSettings();
    return;
  }

  // project 视图
  shell.classList.remove('home');
  projNav.hidden = false;
  projNav.innerHTML = renderProjNav(state.projectId, state.section, state.threadId);
  wireProjNav();

  if (state.section === 'chat') {
    work.innerHTML = renderChat(state.projectId, state.threadId, state.previewTab, state.collapsed, state.chainView);
    wireChat();
    scrollChatBottom();
  } else if (state.section === 'runs') {
    work.innerHTML = renderRunsSection(
      state.projectId, state.runId, state.runView, state.pipelineStepId, state.runInspectorTab
    );
    wireRuns();
  } else if (state.section === 'board') {
    if (state.issueId) {
      work.innerHTML = renderIssueDetail(state.projectId, state.issueId);
      wireIssueDetail();
    } else {
      work.innerHTML = renderBoard(state.projectId);
      wireBoard();
    }
  } else if (state.section === 'team') {
    work.innerHTML = renderTeam(state.projectId);
    wireTeam();
  } else if (state.section === 'artifacts') {
    work.innerHTML = renderArtifactsSection(state.projectId, state.artifactId);
    wireArtifactsSection();
  } else if (state.section === 'workspace') {
    work.innerHTML = renderWorkspaceSection(state.projectId, state.wsPath);
    wireWorkspaceSection();
  } else if (state.section === 'settings') {
    work.innerHTML = renderProjectSettings(state.projectId);
    wireProjectSettings();
  } else {
    work.innerHTML = renderStub(state.projectId, state.section);
  }
}

/* ---------- 事件：Project 导航（section + session 列表）---------- */
function wireProjNav() {
  projNav.querySelectorAll('.pn-sec[data-sec]').forEach((el) =>
    el.addEventListener('click', () => setState({ section: el.dataset.sec, issueId: null }))
  );
  projNav.querySelectorAll('.sess-item[data-thread]').forEach((el) =>
    el.addEventListener('click', () => {
      markThreadSeen(el.dataset.thread);
      setState({ section: 'chat', threadId: el.dataset.thread, previewTab: 'preview', pipelineStepId: null });
    })
  );
  projNav.querySelector('.newthread')?.addEventListener('click', () =>
    flash('开新 thread：可直接聊（无 issue）。认真了再从对话里"提升为 Issue"，团队自动拉取跟进。')
  );
}

/* ---------- 事件：Chat 主面 ---------- */
function wireChat() {
  // 接力呈现方式切换（接力卡 / 对话流 / 轨道）
  work.querySelectorAll('.cv-btn[data-cv]').forEach((el) =>
    el.addEventListener('click', () => setState({ chainView: el.dataset.cv }))
  );

  // 接力卡折叠/展开
  work.querySelectorAll('.sess-card').forEach((card) => {
    card.querySelector('.sess-card-head')?.addEventListener('click', () => {
      card.classList.toggle('open');
    });
  });

  // 轨道视图：点一段 → 就地展开/收起该段内容（不切视图）
  work.querySelectorAll('.track-step[data-sess]').forEach((el) => {
    el.querySelector('.track-step-head')?.addEventListener('click', () => {
      el.classList.toggle('open');
    });
  });

  // 右栏预览折叠切换
  work.querySelector('.preview-toggle')?.addEventListener('click', () =>
    setState({ collapsed: !state.collapsed })
  );

  // 预览四切换
  work.querySelectorAll('.pv-tab[data-pv]').forEach((el) =>
    el.addEventListener('click', () => setState({ previewTab: el.dataset.pv }))
  );

  // 版本轨
  work.querySelectorAll('.ver').forEach((b) =>
    b.addEventListener('click', () => {
      work.querySelectorAll('.ver').forEach((x) => x.classList.remove('cur'));
      b.classList.add('cur');
      flash(`切到 ${b.textContent}（旧版不覆盖，可回看 / 对比）。`);
    })
  );

  // 产物网格 → 跳对应 thread
  work.querySelectorAll('.proj-card[data-artifact]').forEach((el) =>
    el.addEventListener('click', () => {
      const aid = el.dataset.artifact;
      const th = DATA.threads.find((t) => t.artifact_id === aid);
      const a = DATA.artifacts.find((x) => x.id === aid);
      if (a) a.unseen = false;
      if (th) setState({ threadId: th.id, previewTab: 'preview' });
      else flash('这个产物跨多 issue 迭代，没有单一 thread 承载。');
    })
  );

  // 内联动作
  work.querySelectorAll('.grant, .apply, .opt').forEach((b) =>
    b.addEventListener('click', (e) => { e.stopPropagation(); flash('已在对话流内联处理（放行 / 应用 / 决策）—— 不跳页。'); })
  );
  work.querySelectorAll('.deny, .reject, .retry, .run, .export').forEach((b) =>
    b.addEventListener('click', (e) => { e.stopPropagation(); flash(`「${b.textContent.trim()}」内联动作（原型示意）。`); })
  );
  work.querySelector('.promote-btn')?.addEventListener('click', () =>
    flash('提升为 Issue：这条随手 thread 变成 Board 卡，团队正式拉取跟进，原对话成为 chain 第一段 session。')
  );

  work.querySelector('[data-open-run]')?.addEventListener('click', (e) => {
    state.runId = e.currentTarget.dataset.openRun;
    state.runInspectorTab = 'result';
    setPipelineVariant('B');
  });

  // @mention chip
  work.querySelectorAll('.mention-chip').forEach((b) =>
    b.addEventListener('click', () => {
      const ta = work.querySelector('.composer-input');
      if (ta) { ta.value = (ta.value + ` @${b.textContent.trim()} `).trimStart(); ta.focus(); }
    })
  );

  // 回合模式
  work.querySelectorAll('.tm').forEach((b) =>
    b.addEventListener('click', () => {
      work.querySelectorAll('.tm').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
    })
  );

  // 发送
  work.querySelector('.send')?.addEventListener('click', sendMsg);
  work.querySelector('.composer-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendMsg(); }
  });
}

function wireRuns() {
  work.querySelectorAll('[data-run-view]').forEach((el) =>
    el.addEventListener('click', () => setPipelineVariant(el.dataset.runView === 'graph' ? 'C' : 'B'))
  );
  work.querySelectorAll('[data-wf-step]').forEach((el) =>
    el.addEventListener('click', () => setState({ pipelineStepId: el.dataset.wfStep, runInspectorTab: 'result' }))
  );
  work.querySelectorAll('[data-run-tab]').forEach((el) =>
    el.addEventListener('click', () => setState({ runInspectorTab: el.dataset.runTab }))
  );
  work.querySelectorAll('[data-open-thread]').forEach((el) =>
    el.addEventListener('click', () => {
      const threadId = el.dataset.openThread;
      if (threadId) {
        state.threadId = threadId;
        state.previewTab = 'preview';
        setPipelineVariant('A');
      }
    })
  );
  work.querySelectorAll('[data-wf-action]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const wf = workflow(state.runId) || (DATA.workflows || [])[0];
      const step = wf && wf.steps.find((s) => s.id === el.dataset.step);
      if (!wf || !step) return;
      const action = el.dataset.wfAction;
      if (action === 'approve') {
        step.status = 'done';
        const next = wf.steps[wf.steps.indexOf(step) + 1];
        if (next) { next.status = 'running'; wf.current_step_id = next.id; }
        wf.status = next ? 'running' : 'done';
        state.pipelineStepId = next ? next.id : step.id;
        render(); flash('已放行当前 Gate，Run 解锁下一步；Chat 只收到结构化事件回声。');
      } else if (action === 'deny') {
        flash('已拒绝：Run 保持 blocked，Lead 需要改计划或取消执行。');
      } else if (action === 'retry') {
        step.status = 'running'; wf.current_step_id = step.id; wf.status = 'running';
        render(); flash('已创建新的 Step attempt；旧结果保留用于审计。');
      }
    })
  );
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const target = e.target;
  if (target && (target.matches('input, textarea, select, [contenteditable="true"]'))) return;
  const idx = PIPELINE_VARIANTS.findIndex((v) => v.id === state.pipelineVariant);
  const delta = e.key === 'ArrowRight' ? 1 : -1;
  setPipelineVariant(PIPELINE_VARIANTS[(idx + delta + PIPELINE_VARIANTS.length) % PIPELINE_VARIANTS.length].id);
});

/* ---------- 事件：Board ---------- */
function wireBoard() {
  // 点 issue 卡 → 进 issue 详情（Linear 式），详情里再有 thread 链接
  work.querySelectorAll('.issue-card[data-issue]').forEach((el) =>
    el.addEventListener('click', () => setState({ issueId: el.dataset.issue }))
  );
  work.querySelector('.board-new')?.addEventListener('click', () => {
    const title = prompt('新 issue 标题：');
    if (!title || !title.trim()) return;
    const id = state.projectId.replace(/[^a-z0-9]/gi, '').slice(0, 4) + '-' + Date.now().toString(36).slice(-3);
    DATA.issues.push({
      id, project_id: state.projectId, status: 'todo', title: title.trim(),
      holder: null, gate: null, thread_ids: [], acceptance: [], claim: 'unclaimed',
    });
    render();
    flash(`已建 issue「${title.trim()}」→ 落 Board（Todo）。点开它 → 团队拉取开工。`);
  });
}

/* ---------- 事件：Issue 详情（Linear 式，可编辑）---------- */
function wireIssueDetail() {
  const iss = DATA.issues.find((i) => i.id === state.issueId);
  if (!iss) return;

  // 返回 Board
  work.querySelector('.idr-back')?.addEventListener('click', () => setState({ issueId: null }));

  // 关联 thread / session chain 链接 → 跳 Chat
  work.querySelectorAll('.idr-thread[data-thread]').forEach((el) =>
    el.addEventListener('click', () => {
      const tid = el.dataset.thread;
      markThreadSeen(tid);
      setState({ section: 'chat', threadId: tid, issueId: null, previewTab: 'preview' });
    })
  );

  // 尚无 thread 的 issue：Symphony 式自动拉取 → claim → 开 thread + 首 session
  work.querySelector('.idr-pull')?.addEventListener('click', () => pullIssue(iss.id));

  // 标题 / 描述 inline 编辑：失焦存回内存
  const titleEl = work.querySelector('[data-edit="title"]');
  titleEl?.addEventListener('blur', () => {
    const v = titleEl.textContent.trim();
    if (v && v !== iss.title) { iss.title = v; flash('标题已更新。'); }
  });
  const descEl = work.querySelector('[data-edit="desc"]');
  descEl?.addEventListener('blur', () => {
    const v = descEl.textContent.trim();
    iss.desc = v;
    descEl.classList.toggle('empty', !v);
  });

  // 验收项：勾选 / 删除 / 新增
  const acc = iss.acceptance || (iss.acceptance = []);
  const refreshAccCount = () => {
    const c = work.querySelector('#acc-count');
    if (c) c.textContent = `${acc.filter((a) => a.done).length}/${acc.length}`;
  };
  work.querySelectorAll('.acc-item[data-acc]').forEach((el) => {
    const box = el.querySelector('.acc-box');
    box?.addEventListener('click', () => {
      const ai = +el.dataset.acc;
      acc[ai].done = !acc[ai].done;
      el.classList.toggle('done', acc[ai].done);
      box.textContent = acc[ai].done ? '✓' : '';
      refreshAccCount();
    });
    el.querySelector('.acc-del')?.addEventListener('click', (e) => {
      e.stopPropagation();
      acc.splice(+el.dataset.acc, 1);
      render();
    });
  });
  const accInput = work.querySelector('.acc-add-input');
  accInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && accInput.value.trim()) {
      acc.push({ text: accInput.value.trim(), done: false });
      render();
    }
  });

  // 属性下拉：状态 / 负责人 / 优先级 即改
  work.querySelectorAll('.idr-select[data-edit-prop]').forEach((sel) =>
    sel.addEventListener('change', () => {
      const prop = sel.dataset.editProp;
      if (prop === 'status') iss.status = sel.value;
      else if (prop === 'holder') iss.holder = sel.value || null;
      else if (prop === 'prio') iss.prio = sel.value;
      render();
      flash('属性已更新（原型改内存，不持久化）。');
    })
  );

  // 评论：发送 → 追加到 iss.comments
  const ccInput = work.querySelector('.idr-cc-input');
  const postComment = () => {
    if (!ccInput || !ccInput.value.trim()) return;
    (iss.comments || (iss.comments = [])).push({ from: 'you', text: ccInput.value.trim(), time: '刚刚' });
    render();
  };
  work.querySelector('.idr-cc-send')?.addEventListener('click', postComment);
  ccInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); postComment(); }
  });
}

/* ---------- 事件：Team ---------- */
function wireTeam() {
  // 切片「↑ 提升到基座」
  work.querySelectorAll('.mem-promote').forEach((el) =>
    el.addEventListener('click', () =>
      flash('提升到基座：这条经验从本项目切片泛化为跨项目团队资产（base）。其它项目派驻同队时即可复用。')
    )
  );
  // 成长条出处链接 → 回溯来源（原型示意）
  work.querySelectorAll('.growth-src').forEach((el) =>
    el.addEventListener('click', () =>
      flash('出处回溯：跳回产生这条经验的 session / 复盘。可回看当时的对话与决策。')
    )
  );
  // 成长三桶筛选
  work.querySelectorAll('.growth-filter[data-filter]').forEach((el) =>
    el.addEventListener('click', () => {
      const f = el.dataset.filter;
      work.querySelectorAll('.growth-filter').forEach((x) => x.classList.remove('active'));
      el.classList.add('active');
      work.querySelectorAll('.growth-card').forEach((card) => {
        card.hidden = f !== 'all' && card.dataset.kind !== f;
      });
    })
  );
  // 派驻成员卡 → 提示进设置
  work.querySelectorAll('.posting-card').forEach((el) =>
    el.addEventListener('click', () =>
      flash('成员派驻详情（role / autonomy L0-L3 / skill 挂载 / 权限矩阵）在项目设置里配。')
    )
  );
}

/* ---------- 事件：Artifacts section ---------- */
function wireArtifactsSection() {
  // 版本时光机节点：回看某版本
  work.querySelectorAll('.agal-ver[data-ver]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      flash(`版本 ${el.dataset.ver}：回看 / 对比 / 导出（原型示意，旧版不覆盖）。`);
    })
  );
  // 点产物卡 → 跳到承载它的 thread（在 Chat 右栏看预览）
  work.querySelectorAll('.agal-card[data-artifact]').forEach((el) =>
    el.addEventListener('click', () => {
      const aid = el.dataset.artifact;
      const a = DATA.artifacts.find((x) => x.id === aid);
      if (a) a.unseen = false;
      const th = DATA.threads.find((t) => t.artifact_id === aid);
      if (th) setState({ section: 'chat', threadId: th.id, previewTab: 'preview' });
      else flash('这个产物跨多 issue 迭代，没有单一 thread 承载。');
    })
  );
}

/* ---------- 事件：Workspace section ---------- */
function wireWorkspaceSection() {
  work.querySelectorAll('.ws-file[data-path]').forEach((el) =>
    el.addEventListener('click', () => setState({ wsPath: el.dataset.path }))
  );
  work.querySelector('.ws-commit')?.addEventListener('click', () =>
    flash('commit 锚：这份文件产出锚定到一个 git commit，与对话消息、产物版本对齐（原型示意）。')
  );
}

/* ---------- 事件：项目设置 ---------- */
function wireProjectSettings() {
  const postings = (DATA.postings || {})[state.projectId] || [];
  // autonomy 档切换
  work.querySelectorAll('.ps-auto[data-auto]').forEach((el) =>
    el.addEventListener('click', () => {
      const po = postings[+el.dataset.posting];
      if (po) { po.autonomy = el.dataset.auto; render(); flash(`autonomy 改为 ${el.dataset.auto}（仅本项目派驻，不影响该 soul 在别处）。`); }
    })
  );
  // 权限矩阵三态切换
  work.querySelectorAll('.ps-perm[data-perm]').forEach((el) =>
    el.addEventListener('click', () => {
      const po = postings[+el.dataset.posting];
      if (po) { (po.perms || (po.perms = {}))[el.dataset.act] = el.dataset.perm; render(); }
    })
  );
  // role inline 编辑
  work.querySelectorAll('.ps-role[data-posting]').forEach((el) =>
    el.addEventListener('blur', () => {
      const po = postings[+el.dataset.posting];
      const v = el.textContent.trim();
      if (po && v) po.role = v;
    })
  );
  // 协作模式
  work.querySelectorAll('.ps-collab-btn[data-collab]').forEach((el) =>
    el.addEventListener('click', () => {
      const cfg = (DATA.config || {})[state.projectId];
      if (cfg) { cfg.collab = el.dataset.collab; render(); }
    })
  );
  // 项目级配置 inline 编辑
  work.querySelectorAll('.ps-cfg-v[data-cfg]').forEach((el) =>
    el.addEventListener('blur', () => {
      const cfg = (DATA.config || {})[state.projectId];
      if (cfg) cfg[el.dataset.cfg] = el.textContent.trim();
    })
  );
  // 停用 / 派驻更多 / 加 skill（示意）
  work.querySelectorAll('.ps-remove').forEach((el) =>
    el.addEventListener('click', () => flash('停用派驻：该成员退出本项目，但记忆切片保留，重新派驻可恢复。'))
  );
  work.querySelector('.ps-post-add')?.addEventListener('click', () =>
    flash('从队里派驻更多成员：选 soul 加入本项目，挂本项目 skill、接记忆切片、设 autonomy。')
  );
  work.querySelectorAll('.ps-skill-add').forEach((el) =>
    el.addEventListener('click', () => flash('挂载 skill：从队 skill 库给这个成员在本项目增挂能力。'))
  );
}

/* ---------- 事件：全局 Settings（跨项目）---------- */
function wireGlobalSettings() {
  work.querySelectorAll('.gs-tab[data-gs]').forEach((el) =>
    el.addEventListener('click', () => setState({ settingsTab: el.dataset.gs, teamId: null, soulId: null }))
  );

  // 左：选中队（master）
  work.querySelectorAll('.gst-item[data-team]').forEach((el) =>
    el.addEventListener('click', () => setState({ teamId: el.dataset.team, soulId: null }))
  );

  // 成员行点开 / 收起 soul 全局详情
  work.querySelectorAll('.gst-member-head[data-soul-toggle]').forEach((el) =>
    el.addEventListener('click', () => {
      const sid = el.dataset.soulToggle;
      setState({ soulId: state.soulId === sid ? null : sid });
    })
  );

  // 队名 inline 编辑（详情头）
  work.querySelectorAll('.gst-d-name[data-team]').forEach((el) =>
    el.addEventListener('blur', () => {
      const t = DATA.teams.find((x) => x.id === el.dataset.team);
      const v = el.textContent.trim();
      if (t && v) t.name = v;
    })
  );

  // soul 全局身份字段 inline 编辑（改的是全局 soul 本身）：实时存 + 同步成员行头部显示
  work.querySelectorAll('.soul-d-v[data-soul][data-field]').forEach((el) =>
    el.addEventListener('input', () => {
      const s = DATA.souls.find((x) => x.id === el.dataset.soul);
      if (!s) return;
      const field = el.dataset.field;
      const v = el.textContent.trim();
      if (field === 'name' && !v) return; // 名字不许空
      s[field] = v;
      // 同步成员行头部（不重渲染，保住光标）
      const row = work.querySelector(`.gst-member[data-soul-row="${s.id}"]`);
      if (row) {
        if (field === 'name') row.querySelector('.gst-member-name').textContent = v;
        if (field === 'role') row.querySelector('.gst-member-role').textContent = v;
      }
    })
  );

  // 从队里移除成员
  work.querySelectorAll('.gs-soul-del[data-team][data-soul]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = DATA.teams.find((x) => x.id === el.dataset.team);
      if (t) { t.member_ids = t.member_ids.filter((id) => id !== el.dataset.soul); setState({ soulId: null }); flash('已从队里移除该成员（soul 本身保留，可再加回）。'); }
    })
  );

  // 加成员：列出未在本队的 soul 供选（原型用 confirm 逐个，真实系统弹选择面板）
  work.querySelectorAll('.gs-soul-add[data-team]').forEach((el) =>
    el.addEventListener('click', () => {
      const t = DATA.teams.find((x) => x.id === el.dataset.team);
      if (!t) return;
      const cands = DATA.souls.filter((s) => !t.member_ids.includes(s.id));
      if (!cands.length) { flash('所有 soul 都已在本队。真实系统这里可新建 soul。'); return; }
      const list = cands.map((s, i) => `${i + 1}. ${s.name}（${s.role} · ${s.model}）`).join('\n');
      const pick = prompt(`加哪个 soul 进「${t.name}」？输入编号：\n${list}`);
      const idx = parseInt(pick, 10) - 1;
      if (idx >= 0 && idx < cands.length) {
        t.member_ids.push(cands[idx].id);
        render(); flash(`已把 ${cands[idx].name} 加入 ${t.name}。`);
      }
    })
  );

  // 删 skill / 加 skill
  work.querySelectorAll('.gs-skill-del[data-team][data-skill]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = DATA.teams.find((x) => x.id === el.dataset.team);
      if (t) { t.skills = (t.skills || []).filter((sk) => sk !== el.dataset.skill); render(); }
    })
  );
  work.querySelectorAll('.gs-skill-add[data-team]').forEach((el) =>
    el.addEventListener('click', () => {
      const t = DATA.teams.find((x) => x.id === el.dataset.team);
      if (!t) return;
      const name = prompt('新 skill 名称：');
      if (name && name.trim()) { (t.skills || (t.skills = [])).push(name.trim()); render(); }
    })
  );

  // 删队
  work.querySelectorAll('.gs-team-del[data-team]').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const t = DATA.teams.find((x) => x.id === el.dataset.team);
      if (!t) return;
      const posted = DATA.projects.filter((p) => p.team_id === t.id);
      if (posted.length) { flash(`「${t.name}」已派驻 ${posted.length} 个项目，先改派再删。`); return; }
      DATA.teams = DATA.teams.filter((x) => x.id !== t.id);
      setState({ teamId: null, soulId: null }); flash(`已删除队「${t.name}」。`);
    })
  );

  // 新建队
  work.querySelector('.gs-new-team')?.addEventListener('click', () => {
    if (state.settingsTab === 'providers') { flash('接入 Provider（BYOK）：原型示意，真实系统这里填 API key / endpoint。'); return; }
    const name = prompt('新团队名称：');
    if (name && name.trim()) {
      const id = 'team-' + Date.now().toString(36);
      DATA.teams.push({ id, name: name.trim(), kind: 'custom', member_ids: [], skills: [] });
      setState({ teamId: id, soulId: null }); flash(`已建队「${name.trim()}」。加成员、挂 skill，再去项目里派驻。`);
    }
  });

  // 点已派驻的项目 chip → 进该项目 Team
  work.querySelectorAll('.gs-posted[data-proj]').forEach((el) =>
    el.addEventListener('click', () => openProject(el.dataset.proj, 'team'))
  );
}

/* ---------- 事件：新建 Project ---------- */
const npDraft = { medium: 'app', team: null };
function wireNewProject() {
  npDraft.team = npDraft.team || (DATA.teams[0] || {}).id;
  work.querySelector('.np-back')?.addEventListener('click', () => setState({ view: 'home' }));
  work.querySelector('.np-cancel')?.addEventListener('click', () => setState({ view: 'home' }));

  // 类型选择
  work.querySelectorAll('.np-medium[data-medium]').forEach((el) =>
    el.addEventListener('click', () => {
      npDraft.medium = el.dataset.medium;
      work.querySelectorAll('.np-medium').forEach((x) => x.classList.remove('active'));
      el.classList.add('active');
    })
  );
  // 派驻队选择
  work.querySelectorAll('.np-team[data-team]').forEach((el) => {
    el.classList.toggle('active', el.dataset.team === npDraft.team);
    el.addEventListener('click', () => {
      npDraft.team = el.dataset.team;
      work.querySelectorAll('.np-team').forEach((x) => x.classList.remove('active'));
      el.classList.add('active');
    });
  });
  // 创建
  work.querySelector('.np-create')?.addEventListener('click', () => {
    const name = (work.querySelector('.np-name') || {}).value || '';
    if (!name.trim()) { flash('先给项目起个名。'); return; }
    const t = DATA.teams.find((x) => x.id === npDraft.team) || DATA.teams[0];
    const id = 'proj-' + Date.now().toString(36);
    const colors = { app: '#7c9cf5', novel: '#8b6fb0', video: '#c98fd6', image: '#6b8fae' };
    const kindTxt = { app: 'App 开发', novel: '小说', video: '短剧 / 视频', image: '图像 / 设计' };
    DATA.projects.push({
      id, name: name.trim(), color: colors[npDraft.medium] || '#7c9cf5',
      medium: npDraft.medium, kind: kindTxt[npDraft.medium] || '项目',
      desc: '新建项目 · 待补充描述。', team_id: t.id,
      member_ids: [...(t.member_ids || [])], last_thread: null,
    });
    // 从队模板生成派驻记录
    DATA.postings[id] = (t.member_ids || []).map((sid) => {
      const s = soul(sid) || {};
      return {
        soul: sid, role: s.role || '成员', autonomy: 'L1', skills: [...(t.skills || [])].slice(0, 3),
        perms: { 读文件: 'allow', 写文件: 'allow', 装依赖: 'interrupt', push外发: 'interrupt', 删除: 'interrupt' },
      };
    });
    DATA.config[id] = { workspace_root: '~/' + id, export_target: '待配置', loop_budget: '默认', collab: 'free' };
    // 继承同队既有项目的基座（跨项目团队资产），切片/成长从零积累
    const sibling = DATA.projects.find((p) => p.team_id === t.id && p.id !== id);
    const inheritedBase = sibling ? [...((DATA.memory[sibling.id] || {}).base || [])] : [];
    DATA.memory[id] = { base: inheritedBase, slice: [], growth: [] };
    npDraft.team = null;
    openProject(id);
    flash(`已建「${name.trim()}」并派驻 ${t.name}。团队记忆基座已带上，切片从零积累。`);
  });
}

function sendMsg() {
  const ta = work.querySelector('.composer-input');
  if (!ta || !ta.value.trim()) return;
  const th = DATA.threads.find((t) => t.id === state.threadId);
  if (!th) return;
  const text = ta.value.trim();
  const lastS = th.messages.length ? (th.messages[th.messages.length - 1].s || 0) : 0;
  th.messages.push({ s: lastS, from: 'you', text });
  ta.value = '';
  render();
  flash('已发给团队 · souls 异步继续 · 你可以离开，回来看 Inbox / Rail 圆点。');
}

function markThreadSeen(tid) {
  const th = DATA.threads.find((t) => t.id === tid);
  if (th && th.artifact_id) {
    const a = DATA.artifacts.find((x) => x.id === th.artifact_id);
    if (a) a.unseen = false;
  }
}

/* ---------- Symphony 式自动拉取：issue → claim 生命周期 → 开 thread + 首个 session ----------
 * 参 symphony：Orchestrator 轮询看板 → 选合格 issue → claim 态（Unclaimed→Claimed→Running，
 * 独立于 issue 业务状态）→ 建隔离 workspace + session（session_id = thread_id-turn_id）→
 * 成功 = 进入 Human Review 交接态（不必是 Done）。这里用分阶段 flash 演示 claim 生命周期。 */
function pullIssue(issueId) {
  const iss = DATA.issues.find((i) => i.id === issueId);
  if (!iss) return;
  if ((iss.thread_ids || []).length) { // 已有 thread，直接进
    setState({ section: 'chat', threadId: iss.thread_ids[0], issueId: null, previewTab: 'preview' });
    return;
  }
  const pid = iss.project_id;
  const postings = (DATA.postings || {})[pid] || [];
  // 资格路由：优先 issue 指定 holder；否则派驻名单里第一个能 build 的成员
  const firstSoul = iss.holder || (postings[0] || {}).soul || (project(pid).member_ids || [])[0];
  if (!firstSoul) { flash('这个项目还没派驻成员，先去项目设置派驻。'); return; }

  // 阶段 1：Claimed（预留，防重复派发）
  iss.claim = 'claimed';
  render();
  flash('Orchestrator 认领 issue（Claimed）· 建隔离 workspace…');

  setTimeout(() => {
    // 阶段 2：Running（建 thread + 首个 session，session_id = thread_id-turn_id）
    const tid = 'th-' + issueId + '-' + Date.now().toString(36);
    const s = soul(firstSoul) || {};
    const th = {
      id: tid, project_id: pid, issue_id: issueId, kind: 'issue',
      title: iss.title, status: 'doing', artifact_id: null,
      sessions: [{ soul: firstSoul, role: 'build', status: 'active', label: '拉取后起草', sid: tid + '-t1' }],
      messages: [
        { s: 0, from: firstSoul, text: `我接手了 issue「${iss.title}」。已建隔离 workspace，正在按验收标准起草。有阻塞会交回负责人或请你放行。` },
      ],
    };
    DATA.threads.push(th);
    iss.thread_ids = [tid];
    iss.claim = 'running';
    iss.holder = firstSoul;
    if (iss.status === 'todo' || iss.status === 'triage') iss.status = 'doing';
    const p = project(pid);
    if (p) p.last_thread = tid;
    setState({ section: 'chat', threadId: tid, issueId: null, previewTab: 'preview' });
    flash(`${s.name || firstSoul} 已开工（Running）· 同 thread 续跑，完成后进 In Review 交你验收。`);
  }, 620);
}

/* ---------- Rail: Home ---------- */
rail.home.addEventListener('click', () => setState({ view: 'home', projectId: null }));
rail.settings?.addEventListener('click', () => setState({ view: 'settings' }));
document.querySelector('.rail-new')?.addEventListener('click', () => setState({ view: 'newproj' }));

/* ---------- Inbox 抽屉 ---------- */
inboxBtn.addEventListener('click', toggleInbox);
scrim.addEventListener('click', toggleInbox);

function toggleInbox() {
  const open = inboxDrawer.classList.toggle('open');
  inboxDrawer.hidden = !open;
  scrim.hidden = !open;
  if (open) {
    inboxDrawer.innerHTML = renderInbox();
    inboxDrawer.querySelector('.inbox-close')?.addEventListener('click', toggleInbox);
    inboxDrawer.querySelectorAll('.inbox-item[data-proj]').forEach((el) =>
      el.addEventListener('click', () => {
        const pid = el.dataset.proj;
        const tid = el.dataset.thread;
        toggleInbox();
        markThreadSeen(tid);
        openProject(pid, 'chat');
        if (tid) setState({ threadId: tid });
      })
    );
  }
}

/* ---------- Esc 返回 ---------- */
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (inboxDrawer.classList.contains('open')) return toggleInbox();
  if (state.view === 'project') setState({ view: 'home', projectId: null });
});

/* ---------- flash ---------- */
let flashTimer;
function flash(msg) {
  let el = document.getElementById('flash');
  if (!el) { el = document.createElement('div'); el.id = 'flash'; document.body.appendChild(el); }
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(flashTimer);
  flashTimer = setTimeout(() => el.classList.remove('show'), 2800);
}

render();
