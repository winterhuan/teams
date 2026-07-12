/**
 * PROTOTYPE views — Project × Team shell variants
 * A Team-first · B Project-first · C Dual-axis matrix
 */
window.Views = {
  shell(s, body) {
    const v = s.uiVariant || "A";
    if (v === "B") return this.shellB(s, body);
    if (v === "C") return this.shellC(s, body);
    return this.shellA(s, body);
  },

  /** A — 队优先：顶栏切队，Project 只是 Board 过滤 */
  shellA(s, body) {
    const gates = s.pendingDecisions.length;
    return `
    <div class="app-shell var-a">
      <header class="topbar">
        <div class="brand">
          <span class="mark"></span>
          <div>
            <div class="name">Hearth</div>
            <div class="sub">A · 队优先 · Project 是过滤</div>
          </div>
        </div>
        <nav class="main-nav">
          ${navBtn("pulse", "Pulse", s.view, gates || null)}
          ${navBtn("board", "Board", s.view)}
          ${navBtn("teams", "Teams", s.view)}
        </nav>
        <div class="top-right">
          <label class="team-switch">
            <span class="lbl">当前队</span>
            <select data-action="switch-team">
              ${s.teamsList
                .map(
                  (t) =>
                    `<option value="${esc(t.id)}" ${t.id === s.teamId ? "selected" : ""}>${esc(t.name)}</option>`
                )
                .join("")}
            </select>
          </label>
          <span class="stat ok">quiet</span>
          <span class="stat">$${s.dayCost}/d</span>
        </div>
      </header>
      ${axisHint("A", "主轴 = Team 编制", "Project 仅在 Board 上过滤 · 适合「我以哪支队在干活」")}
      ${body}
      ${s.toast ? `<div class="toast">${esc(s.toast)}</div>` : ""}
      ${protoSwitcher(s)}
    </div>`;
  },

  /** B — 项目优先：顶栏切 Project，队变成默认主责标签 */
  shellB(s, body) {
    const gates = s.pendingDecisions.length;
    const p = s.project || s.projectsList[0];
    return `
    <div class="app-shell var-b">
      <header class="topbar project-top">
        <div class="brand">
          <span class="mark proj"></span>
          <div>
            <div class="name">Hearth</div>
            <div class="sub">B · 项目优先 · 队是主责</div>
          </div>
        </div>
        <label class="project-hero-switch">
          <span class="lbl">当前 Project</span>
          <select data-action="switch-project">
            ${s.projectsList
              .map(
                (x) =>
                  `<option value="${esc(x.id)}" ${x.id === s.projectId ? "selected" : ""}>${esc(x.name)} · ${esc(x.root_path)}</option>`
              )
              .join("")}
          </select>
        </label>
        <nav class="main-nav">
          ${navBtn("pulse", "Pulse", s.view, gates || null)}
          ${navBtn("board", "Work", s.view)}
          ${navBtn("teams", "Roster", s.view)}
        </nav>
        <div class="top-right">
          <span class="stat">主责 <b>${esc(s.team?.name || "—")}</b></span>
          <span class="stat mono">${esc(p?.root_path || "")}</span>
        </div>
      </header>
      ${axisHint("B", "主轴 = Project 交付树", "Board 显示该 Project 下全部 Work · 换项目会带 default_team")}
      ${body}
      ${s.toast ? `<div class="toast">${esc(s.toast)}</div>` : ""}
      ${protoSwitcher(s)}
    </div>`;
  },

  /** C — 双轴：左队轨 + 顶项目轨 + 矩阵 + 交点看板 */
  shellC(s, body) {
    const gates = s.pendingDecisions.length;
    const mx = s.matrix;
    return `
    <div class="app-shell var-c">
      <header class="topbar slim">
        <div class="brand">
          <span class="mark"></span>
          <div>
            <div class="name">Hearth</div>
            <div class="sub">C · 双轴矩阵 · 点格子=队×项目</div>
          </div>
        </div>
        <nav class="main-nav">
          ${navBtn("pulse", "Pulse", s.view, gates || null)}
          ${navBtn("board", "Board", s.view)}
          ${navBtn("teams", "Teams", s.view)}
        </nav>
        <div class="top-right">
          <span class="stat">交点 <b class="mono">${esc(s.teamId)}</b> × <b class="mono">${esc(s.projectId)}</b></span>
          <span class="stat ok">quiet</span>
        </div>
      </header>
      <div class="dual-layout">
        <aside class="team-rail">
          <div class="rail-h">Teams</div>
          ${s.teamsList
            .map(
              (t) => `
            <button type="button" class="rail-item ${t.id === s.teamId ? "on" : ""}" data-action="switch-team" data-id="${esc(t.id)}">
              <b>${esc(t.name)}</b>
              <span class="muted mono">${esc(t.id)}</span>
            </button>`
            )
            .join("")}
        </aside>
        <div class="dual-main">
          <div class="project-rail">
            ${s.projectsList
              .map(
                (p) => `
              <button type="button" class="proj-chip ${p.id === s.projectId ? "on" : ""}" data-action="switch-project" data-id="${esc(p.id)}">
                <b>${esc(p.name)}</b>
                <span class="mono">${esc(p.root_path)}</span>
              </button>`
              )
              .join("")}
          </div>
          ${
            s.view === "board"
              ? `<div class="matrix-strip">
            <div class="lbl">Team × Project 计数（点格切换交点）</div>
            <div class="matrix-grid" style="--pc:${mx.projects.length}">
              <div class="mx-corner"></div>
              ${mx.projects.map((p) => `<div class="mx-colh mono">${esc(p.id)}</div>`).join("")}
              ${mx.teams
                .map(
                  (t, ti) => `
                <div class="mx-rowh mono">${esc(t.id)}</div>
                ${mx.cells[ti]
                  .map(
                    (c) => `
                  <button type="button" class="mx-cell ${c.team_id === s.teamId && c.project_id === s.projectId ? "on" : ""} ${c.isDefault ? "def" : ""} ${!c.allowed ? "off" : ""}"
                    data-action="set-cell" data-team="${esc(c.team_id)}" data-project="${esc(c.project_id)}"
                    title="${esc(c.team_id)} × ${esc(c.project_id)}${c.isDefault ? " · default" : ""}${!c.allowed ? " · not allowed" : ""}">
                    ${c.count || "·"}
                  </button>`
                  )
                  .join("")}`
                )
                .join("")}
            </div>
            <p class="muted tiny">深色描边 = Project.default_team · 灰 = team_ids 不准入</p>
          </div>`
              : ""
          }
          ${body}
        </div>
      </div>
      ${s.toast ? `<div class="toast">${esc(s.toast)}</div>` : ""}
      ${protoSwitcher(s)}
    </div>`;
  },

  pulse(s) {
    const live = s.live.filter((x) => x.team_id === s.teamId || !x.team_id);
    const openIssues = s.allOpenIssues.filter((c) => c.team_id === s.teamId || !c.team_id);
    const pending = s.pendingDecisions;
    const focus = pending[s.focusDecisionIndex] || pending[0];
    return this.shell(
      s,
      `
      <div class="page pulse-page">
        <section class="return-card">
          <h1>Return · ${esc(s.team.name)}</h1>
          <p class="muted">硬门不单独成页 · 在下方处理或进 Board 卡内批</p>
          <div class="delta-grid">
            <div class="delta"><b>${s.boardWork.filter((w) => w.status === "in_progress").length}</b><span>In Progress</span></div>
            <div class="delta warn"><b>${s.boardWork.filter((w) => w.status === "blocked").length}</b><span>Blocked</span></div>
            <div class="delta warn"><b>${pending.length}</b><span>硬门</span></div>
            <div class="delta accent"><b>${openIssues.length}</b><span>open issues</span></div>
            <div class="delta"><b>${s.boardWork.filter((w) => w.status === "in_review").length}</b><span>In Review</span></div>
          </div>
        </section>

        <section class="panel gates-panel" id="gates">
          <div class="ph">
            <h2>Hard gates · quiet</h2>
            <span class="badge warn">${pending.length}</span>
          </div>
          ${
            pending.length
              ? `<div class="gates-layout">
            <div class="gates-list">
              ${pending
                .map(
                  (d, i) => `
                <button type="button" class="gate ${focus && focus.id === d.id ? "on" : ""}" data-action="focus-dec" data-index="${i}">
                  <span class="k ${d.kind}">${d.kind === "approval" ? d.level : "input"}</span>
                  <span class="mono">${esc(d.work)}</span>
                  <span class="t">${esc(d.title)}</span>
                </button>`
                )
                .join("")}
            </div>
            <div class="gates-detail">
              ${
                focus
                  ? `
                <h3>${esc(focus.title)}</h3>
                <p class="muted">${esc(focus.detail || "")} · ${esc(focus.work)} · ${esc(focus.team_id || "—")}</p>
                ${
                  focus.kind === "approval"
                    ? `<div class="row-btns">
                        <button type="button" class="btn primary" data-action="grant" data-id="${esc(focus.id)}">Grant</button>
                        <button type="button" class="btn danger" data-action="deny" data-id="${esc(focus.id)}">Deny</button>
                        <button type="button" class="btn" data-action="open-work" data-id="${esc(focus.work)}">→ 卡</button>
                      </div>`
                    : `<label class="field"><span class="lbl">Reply</span>
                        <textarea name="reply" rows="3" placeholder="产品决定…"></textarea></label>
                      <div class="row-btns">
                        <button type="button" class="btn primary" data-action="reply" data-id="${esc(focus.id)}">Send</button>
                        <button type="button" class="btn" data-action="open-work" data-id="${esc(focus.work)}">→ 卡</button>
                      </div>`
                }`
                  : ""
              }
            </div>
          </div>`
              : `<p class="empty-gates">无硬门 · 可以离开（quiet）</p>`
          }
        </section>

        <div class="two-col">
          <section class="panel">
            <div class="ph"><h2>Live · ${esc(s.teamId)}</h2></div>
            ${live
              .map(
                (x) => `
              <div class="live-row">
                <span class="dot ${x.status}"></span>
                <div class="grow">
                  <div><b class="mono">${esc(x.work)}</b> · ${esc(x.provider)} / ${esc(x.member)}</div>
                  <div class="muted">t${x.turn}/${x.maxTurns} · ${esc(x.checkpoint)}</div>
                </div>
                <button type="button" class="btn sm" data-action="pause" data-id="${esc(x.id)}">${x.status === "paused" ? "Resume" : "Pause"}</button>
              </div>`
              )
              .join("") || `<p class="muted">本队暂无 Live Session</p>`}
          </section>
          <section class="panel">
            <div class="ph"><h2>Open issues（卡上小本本）</h2></div>
            ${openIssues
              .slice(0, 8)
              .map(
                (c) => `
              <div class="issue-row">
                <button type="button" class="link mono" data-action="open-work" data-id="${esc(c.work_id)}">${esc(c.work_id)}</button>
                <span>${esc(c.body).slice(0, 80)}</span>
              </div>`
              )
              .join("") || `<p class="muted">无 open issue comments</p>`}
            <button type="button" class="btn primary" data-action="goto" data-view="board">去 Board</button>
          </section>
        </div>
      </div>`
    );
  },

  board(s) {
    const cols = [
      ["triage", "Triage"],
      ["todo", "Todo"],
      ["in_progress", "In Progress"],
      ["blocked", "Blocked"],
      ["in_review", "In Review"],
      ["done", "Done"],
      ["failed", "Failed"],
    ];
    // also show backlog collapsed as optional last mini - include backlog in boardWork
    const backlog = s.boardWork.filter((w) => w.status === "backlog");
    const w = s.selectedWork;
    const team = s.team;
    const v = s.uiVariant || "A";
    const title =
      v === "B"
        ? `Work · ${s.project?.name || s.projectId}`
        : v === "C"
          ? `Board · ${s.teamId} × ${s.projectId}`
          : `Board · ${team.name}`;
    const sub =
      v === "B"
        ? `Project-primary · cwd ${s.project?.root_path || "—"} · 主责 ${team?.name || "—"}`
        : v === "C"
          ? `交点看板 · 仅显示队 ${s.teamId} 与项目 ${s.projectId} 相关卡`
          : `Team-primary · Project 过滤 · 卡 Files = Artifact`;

    return this.shell(
      s,
      `
      <div class="page board-page">
        <div class="board-toolbar">
          <div>
            <h1>${esc(title)}</h1>
            <p class="muted">${esc(sub)}</p>
          </div>
          ${
            v === "A"
              ? `<label class="field inline-filter">
            <span class="lbl">Project 过滤</span>
            <select data-action="filter-project">
              <option value="all" ${s.projectFilter === "all" ? "selected" : ""}>全部</option>
              <option value="none" ${s.projectFilter === "none" ? "selected" : ""}>未绑 Project</option>
              ${(s.projectsList || [])
                .map(
                  (p) =>
                    `<option value="${esc(p.id)}" ${s.projectFilter === p.id ? "selected" : ""}>${esc(p.name)}</option>`
                )
                .join("")}
            </select>
          </label>`
              : v === "B"
                ? `<label class="field inline-filter">
            <span class="lbl">主责队（显示）</span>
            <select data-action="switch-team">
              ${s.teamsList
                .map(
                  (t) =>
                    `<option value="${esc(t.id)}" ${t.id === s.teamId ? "selected" : ""}>${esc(t.name)}</option>`
                )
                .join("")}
            </select>
          </label>`
                : ""
          }
          <form class="run-inline" onsubmit="return false">
            <input name="goal" type="text" placeholder="${v === "B" ? "New work on this project…" : "New work…"}" />
            <button type="button" class="btn primary" data-action="run">Run</button>
          </form>
        </div>
        ${
          backlog.length
            ? `<div class="backlog-strip"><span class="lbl">Backlog</span>${backlog
                .map(
                  (b) =>
                    `<button type="button" class="chip" data-action="select-work" data-id="${esc(b.id)}">${esc(b.id)} ${esc(b.title)}</button>`
                )
                .join("")}</div>`
            : ""
        }
        <div class="board-layout">
          <div class="kanban">
            ${cols
              .map(([st, label]) => {
                const items = s.boardWork.filter((x) => x.status === st);
                return `
                <div class="kcol" data-status="${st}">
                  <header><span>${label}</span><em>${items.length}</em></header>
                  <div class="klist">
                    ${items
                      .map((card) => {
                        const n = (card.comments || []).filter((c) => c.kind === "issue" && c.status === "open").length;
                        const hasGate = s.pendingDecisions.some((d) => d.work === card.id);
                        const arts = (card.artifacts || []).length;
                        return `
                        <button type="button" class="kcard ${card.id === s.selectedWorkId ? "on" : ""} ${card.fromBundle ? "goal" : ""} ${hasGate ? "has-gate" : ""}" data-action="select-work" data-id="${esc(card.id)}">
                          <div class="kid mono">${esc(card.id)}${card.fromBundle ? " · goal" : ""}${!card.team_id ? " · no team" : ""}${!card.project_id ? " · no project" : ""}${hasGate ? " · gate" : ""}</div>
                          <div class="ktitle">${esc(card.title)}</div>
                          <div class="kmeta">
                            ${card.project_id ? `<span class="proj-pill">${esc(card.project_id)}</span>` : ""}
                            ${card.assignee ? `<span>${esc(card.assignee)}</span>` : ""}
                            ${hasGate ? `<span class="gate-pill">硬门</span>` : ""}
                            ${arts ? `<span class="iss">📎 ${arts}</span>` : ""}
                            ${n ? `<span class="iss">💬 ${n}</span>` : ""}
                          </div>
                        </button>`;
                      })
                      .join("")}
                  </div>
                </div>`;
              })
              .join("")}
          </div>
          <aside class="detail-panel">
            ${w ? workDetail(s, w) : `<div class="empty">选择一张卡</div>`}
          </aside>
        </div>
      </div>`
    );
  },

  teams(s) {
    const t = s.editTeam || s.team;
    const m = t.members.find((x) => x.id === s.memberEditId) || t.members[0];
    return this.shell(
      s,
      `
      <div class="page teams-page">
        <div class="teams-layout">
          <aside class="team-list">
            <div class="ph">
              <h2>Teams</h2>
              <button type="button" class="btn sm primary" data-action="create-team">+ New</button>
            </div>
            ${s.teamsList
              .map(
                (tm) => `
              <button type="button" class="team-item ${tm.id === t.id ? "on" : ""}" data-action="edit-team" data-id="${esc(tm.id)}">
                <b>${esc(tm.name)}</b>
                <span class="mono">${esc(tm.id)}</span>
                <span class="muted">${tm.members.length} members · ${esc(tm.autonomy_default)}</span>
              </button>`
              )
              .join("")}
            <div class="role-catalog projects-catalog">
              <h3>Projects（登记）</h3>
              <p class="muted tiny">长期容器 · 非 Board 卡 · 默认 cwd</p>
              ${(s.projectsList || [])
                .map(
                  (p) => `
                <div class="role-pill project-pill">
                  <b>${esc(p.name)}</b>
                  <span class="mono">${esc(p.id)} · ${esc(p.root_path)}</span>
                  <span class="muted">default ${esc(p.default_team_id || "—")} · ${esc(p.status)}</span>
                </div>`
                )
                .join("")}
            </div>
            <div class="role-catalog">
              <h3>Role 模板</h3>
              ${s.roleCatalog
                .map(
                  (r) => `
                <div class="role-pill">
                  <b>${esc(r.label)}</b>
                  <span>${esc(r.desc)}</span>
                </div>`
                )
                .join("")}
            </div>
          </aside>
          <section class="team-editor panel">
            <h1>${esc(t.name)}</h1>
            <p class="muted mono">${esc(t.id)} · 维护原型（内存，不落盘）</p>
            <div class="form-grid">
              <label class="field"><span class="lbl">显示名</span>
                <input data-team-field="name" data-team="${esc(t.id)}" value="${esc(t.name)}" /></label>
              <label class="field"><span class="lbl">domains（逗号分隔）</span>
                <input data-team-field="domains" data-team="${esc(t.id)}" value="${esc(t.domains.join(", "))}" /></label>
              <label class="field"><span class="lbl">autonomy_default</span>
                <select data-team-field="autonomy_default" data-team="${esc(t.id)}">
                  ${["L0", "L1", "L2", "L3"]
                    .map((l) => `<option ${t.autonomy_default === l ? "selected" : ""}>${l}</option>`)
                    .join("")}
                </select></label>
              <label class="field"><span class="lbl">concurrency</span>
                <input type="number" min="1" data-team-field="concurrency" data-team="${esc(t.id)}" value="${t.concurrency}" /></label>
              <label class="field"><span class="lbl">default_orchestration</span>
                <select data-team-field="default_orchestration" data-team="${esc(t.id)}">
                  ${["solo", "thread", "pipeline", "swarm"]
                    .map((o) => `<option ${t.default_orchestration === o ? "selected" : ""}>${o}</option>`)
                    .join("")}
                </select></label>
              <label class="field"><span class="lbl">lead member id</span>
                <select data-team-field="lead" data-team="${esc(t.id)}">
                  ${t.members.map((mm) => `<option ${t.lead === mm.id ? "selected" : ""}>${esc(mm.id)}</option>`).join("")}
                </select></label>
              <label class="field"><span class="lbl">default_responder</span>
                <select data-team-field="default_responder" data-team="${esc(t.id)}">
                  ${t.members
                    .map((mm) => `<option ${t.default_responder === mm.id ? "selected" : ""}>${esc(mm.id)}</option>`)
                    .join("")}
                </select></label>
              <label class="field full"><span class="lbl">work_roots</span>
                <input data-team-field="work_roots" data-team="${esc(t.id)}" value="${esc(t.work_roots.join(", "))}" /></label>
            </div>
            <div class="yaml-preview">
              <div class="lbl">team.yaml 预览</div>
              <pre>${esc(yamlPreview(t))}</pre>
            </div>
          </section>
          <section class="member-editor panel">
            <div class="ph">
              <h2>Members</h2>
              <button type="button" class="btn sm primary" data-action="add-member" data-team="${esc(t.id)}">+ Member</button>
            </div>
            <div class="member-tabs">
              ${t.members
                .map(
                  (mm) => `
                <button type="button" class="tab ${mm.id === m.id ? "on" : ""}" data-action="select-member" data-id="${esc(mm.id)}">
                  <span class="${mm.enabled === false ? "off" : ""}">${esc(mm.display_name || mm.id)}</span>
                  <span class="muted">${esc(mm.role)} · ${esc(mm.provider)}</span>
                </button>`
                )
                .join("")}
            </div>
            ${m ? memberEditor(s, t, m) : ""}
          </section>
        </div>
      </div>`
    );
  },

};

function navBtn(id, label, cur, badge) {
  return `<button type="button" class="nav ${cur === id ? "on" : ""}" data-action="goto" data-view="${id}">${label}${
    badge ? `<i>${badge}</i>` : ""
  }</button>`;
}

function axisHint(key, title, detail) {
  return `<div class="axis-hint"><span class="axis-key">${esc(key)}</span><b>${esc(title)}</b><span class="muted">${esc(detail)}</span></div>`;
}

function protoSwitcher(s) {
  const labels = {
    A: "A · 队优先",
    B: "B · 项目优先",
    C: "C · 双轴矩阵",
  };
  const cur = s.uiVariant || "A";
  return `
  <div class="proto-switcher" role="toolbar" aria-label="UI variant">
    <button type="button" class="ps-arrow" data-action="variant-prev" title="上一变体 ←">‹</button>
    <div class="ps-label"><span class="ps-tag">PROTOTYPE</span> ${esc(labels[cur] || cur)}</div>
    <button type="button" class="ps-arrow" data-action="variant-next" title="下一变体 →">›</button>
    <div class="ps-dots">
      ${["A", "B", "C"]
        .map(
          (k) =>
            `<button type="button" class="ps-dot ${k === cur ? "on" : ""}" data-action="set-variant" data-id="${k}" title="${esc(labels[k])}">${k}</button>`
        )
        .join("")}
    </div>
  </div>`;
}

function workDetail(s, w) {
  const teamName = w.team_id ? s.teams[w.team_id]?.name || w.team_id : "（未分队）";
  const tab = s.detailTab || "overview";
  const md = window.md ? window.md.render : (x) => "<p>" + esc(x || "") + "</p>";
  const live = s.live.find((x) => x.work === w.id);
  const cardGates = s.pendingDecisions.filter((d) => d.work === w.id);

  return `
  <div class="work-detail">
    ${
      cardGates.length
        ? `<div class="card-gates">
      <div class="card-gates-h">⚠ 本卡硬门 · ${cardGates.length}</div>
      ${cardGates
        .map(
          (d) => `
        <div class="card-gate">
          <div class="card-gate-meta">
            <span class="k ${d.kind}">${d.kind === "approval" ? d.level : "input"}</span>
            <b>${esc(d.title)}</b>
          </div>
          <p class="muted tiny">${esc(d.detail || "")}</p>
          ${
            d.kind === "approval"
              ? `<div class="row-btns">
                  <button type="button" class="btn primary sm" data-action="grant" data-id="${esc(d.id)}">Grant</button>
                  <button type="button" class="btn danger sm" data-action="deny" data-id="${esc(d.id)}">Deny</button>
                </div>`
              : `<label class="field"><span class="lbl">Reply</span>
                  <textarea name="reply" rows="2" placeholder="产品决定…"></textarea></label>
                <button type="button" class="btn primary sm" data-action="reply" data-id="${esc(d.id)}">Send</button>`
          }
        </div>`
        )
        .join("")}
    </div>`
        : ""
    }
    <div class="ph">
      <h2 class="mono">${esc(w.id)}</h2>
      <select data-action="move-status" data-id="${esc(w.id)}">
        ${["triage", "backlog", "todo", "in_progress", "blocked", "in_review", "done", "failed", "cancelled"]
          .map((st) => `<option value="${st}" ${w.status === st ? "selected" : ""}>${st}</option>`)
          .join("")}
      </select>
    </div>
    <label class="field">
      <span class="lbl">Title</span>
      <input data-work-field="title" data-id="${esc(w.id)}" value="${esc(w.title)}" />
    </label>
    <div class="meta-line">
      <span>队 <b>${esc(teamName)}</b></span>
      ${
        !w.team_id
          ? `<select data-action="assign-team" data-id="${esc(w.id)}">
              <option value="">分队…</option>
              ${s.teamsList.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}
            </select>`
          : ""
      }
      <label class="inline-proj">
        <span class="lbl">Project</span>
        <select data-action="assign-project" data-id="${esc(w.id)}">
          <option value="">（未绑）</option>
          ${(s.projectsList || [])
            .map(
              (p) =>
                `<option value="${esc(p.id)}" ${w.project_id === p.id ? "selected" : ""}>${esc(p.name)}</option>`
            )
            .join("")}
        </select>
      </label>
      ${s.selectedCwd ? `<span class="mono cwd-pill" title="Session.cwd">cwd ${esc(s.selectedCwd)}</span>` : `<span class="muted">无 cwd</span>`}
      ${w.assignee ? `<span>@${esc(w.assignee)}</span>` : ""}
      <span>P${w.priority != null ? w.priority : "—"}</span>
      ${(w.labels || []).map((l) => `<span class="tag">${esc(l)}</span>`).join("")}
      ${live ? `<span class="live-pill"><span class="dot ${live.status}"></span>t${live.turn}/${live.maxTurns}</span>` : ""}
    </div>
    <div class="meta-edit form-grid compact">
      <label class="field"><span class="lbl">priority</span>
        <input type="number" min="0" max="4" data-work-field="priority" data-id="${esc(w.id)}" value="${w.priority != null ? w.priority : 0}" /></label>
      <label class="field"><span class="lbl">labels</span>
        <input data-work-field="labels" data-id="${esc(w.id)}" value="${esc((w.labels || []).join(", "))}" /></label>
      <label class="field"><span class="lbl">assignee</span>
        <input data-work-field="assignee" data-id="${esc(w.id)}" value="${esc(w.assignee || "")}" placeholder="member id" /></label>
    </div>

    <div class="detail-tabs">
      ${["overview", "acceptance", "comments", "files"]
        .map(
          (t) =>
            `<button type="button" class="tab ${tab === t ? "on" : ""}" data-action="detail-tab" data-tab="${t}">${
              t === "overview" ? "Description" : t === "acceptance" ? "Acceptance" : t === "comments" ? "Comments" : "Files"
            }</button>`
        )
        .join("")}
    </div>

    ${
      tab === "overview"
        ? `
    <div class="block tight">
      <div class="ph tight">
        <div class="lbl">Description · Markdown</div>
        <button type="button" class="link" data-action="toggle-desc-edit">${s.descEdit ? "预览" : "编辑"}</button>
      </div>
      ${
        s.descEdit
          ? `<textarea class="md-editor" rows="14" data-work-field="description" data-id="${esc(w.id)}">${esc(w.description || "")}</textarea>
             <p class="muted tiny">支持 # 标题、**粗体**、_斜体_、\`code\`、列表、链接、代码块</p>`
          : md(w.description || "_暂无描述_")
      }
    </div>`
        : ""
    }

    ${
      tab === "acceptance"
        ? `
    <div class="block tight">
      <div class="lbl">Acceptance / Review</div>
      ${
        (w.acceptance || [])
          .map(
            (a) => `
        <label class="acc-row">
          <input type="checkbox" ${a.done ? "checked" : ""} data-action="toggle-acc" data-work="${esc(w.id)}" data-acc="${esc(a.id)}" />
          <span class="acc-md">${md(a.text)}</span>
          <button type="button" class="link" data-action="acc-to-comment" data-work="${esc(w.id)}" data-acc="${esc(a.id)}">→ issue</button>
        </label>`
          )
          .join("") || `<p class="muted">无 Acceptance</p>`
      }
    </div>`
        : ""
    }

    ${
      tab === "comments"
        ? `
    <div class="block tight">
      <div class="ph tight">
        <div class="lbl">Comments · 卡上小本本（Markdown）</div>
        <button type="button" class="link" data-action="select-issues-work" data-id="${esc(w.id)}">全选 open issues</button>
      </div>
      <ul class="comments rich">
        ${(w.comments || [])
          .map(
            (c) => `
          <li class="${c.kind}">
            ${
              c.kind === "issue" && c.status === "open"
                ? `<input type="checkbox" ${s.selectedCommentIds.has(c.id) ? "checked" : ""} data-action="toggle-cmt" data-id="${esc(c.id)}" />`
                : `<span class="sp"></span>`
            }
            <div class="cmt-main">
              <div class="cmt-head">
                <span class="k ${c.kind}">${esc(c.kind)}</span>
                <span class="muted mono">${esc(c.status)} · ${esc(c.at)}</span>
              </div>
              ${md(c.body)}
            </div>
          </li>`
          )
          .join("") || `<li class="muted">暂无评论</li>`}
      </ul>
      <form class="cmt-form col" onsubmit="return false">
        <div class="row-btns">
          <select name="ckind">
            <option value="issue">issue（待修）</option>
            <option value="note">note（备忘）</option>
          </select>
          <button type="button" class="btn primary" data-action="add-comment" data-work="${esc(w.id)}">Comment</button>
        </div>
        <textarea name="cbody" rows="4" placeholder="支持 Markdown：&#10;### 问题&#10;- 步骤&#10;- **期望**"></textarea>
      </form>
      <button type="button" class="btn wide" data-action="bundle" ${s.selectedCommentIds.size ? "" : "disabled"}>
        Bundle fix → 新 Goal 卡（已选 ${s.selectedCommentIds.size}）
      </button>
    </div>`
        : ""
    }

    ${
      tab === "files"
        ? `
    <div class="block tight">
      <div class="ph tight">
        <div class="lbl">Artifacts · 产出索引</div>
        <span class="muted tiny">非 Workspace 浏览器 · M1 挂本卡</span>
      </div>
      <ul class="artifact-list">
        ${(w.artifacts || [])
          .map(
            (a) => `
          <li class="artifact ${esc(a.status || "draft")}">
            <span class="k">${esc(a.kind || "file")}</span>
            <div class="grow">
              <div><b>${esc(a.title || a.path || a.url || a.id)}</b>
                <span class="muted mono">${esc(a.status || "")}</span></div>
              ${a.path ? `<div class="mono path">${esc(a.path)}</div>` : ""}
              ${a.url ? `<div class="mono path"><a href="${esc(a.url)}" target="_blank" rel="noreferrer">${esc(a.url)}</a></div>` : ""}
              ${a.summary ? `<div class="muted">${esc(a.summary)}</div>` : ""}
            </div>
          </li>`
          )
          .join("") ||
        `<li class="muted empty-art">尚无 publish · 约定写 {cwd}/.hearth/out/**</li>`}
      </ul>
      <form class="art-form" onsubmit="return false">
        <div class="row-btns">
          <select name="akind">
            <option value="file">file</option>
            <option value="log">log</option>
            <option value="report">report</option>
            <option value="diff">diff</option>
            <option value="pr">pr</option>
            <option value="image">image</option>
            <option value="url">url</option>
          </select>
          <input name="atitle" type="text" placeholder="标题（可选）" />
        </div>
        <input name="apath" type="text" placeholder="path 如 .hearth/out/note.md" />
        <div class="row-btns">
          <button type="button" class="btn primary sm" data-action="add-artifact" data-work="${esc(w.id)}">登记 Artifact</button>
        </div>
      </form>
      ${
        live
          ? `<div class="live-box">
          <div class="lbl">Linked session</div>
          <div class="mono">${esc(live.id)} · ${esc(live.provider)} · ${esc(live.status)}</div>
          <div class="muted mono">cwd ${esc(live.cwd || s.selectedCwd || "—")} · project ${esc(live.project_id || w.project_id || "—")}</div>
          <div class="muted">${esc(live.checkpoint)}</div>
          <label class="field"><span class="lbl">Nudge (md plain)</span>
            <textarea name="nudge" rows="2" placeholder="继续…"></textarea></label>
          <div class="row-btns">
            <button type="button" class="btn sm" data-action="pause" data-id="${esc(live.id)}">${live.status === "paused" ? "Resume" : "Pause"}</button>
            <button type="button" class="btn sm primary" data-action="nudge" data-id="${esc(live.id)}">Nudge</button>
          </div>
        </div>`
          : `<p class="muted">无关联 Live Session</p>`
      }
    </div>`
        : ""
    }
  </div>`;
}

function memberEditor(s, t, m) {
  const tab = s.memberTab || "identity";
  const role = s.roleCatalog.find((r) => r.id === m.role);
  const effectiveAutonomy = m.autonomy_cap || t.autonomy_default;
  const md = window.md ? window.md.render : (x) => "<p>" + esc(x || "") + "</p>";
  const prov = (s.providers || []).find((p) => p.id === m.provider || p === m.provider);
  const provId = typeof m.provider === "string" ? m.provider : m.provider;
  const provLabel = prov?.label || provId;
  const health = prov?.health || "ok";

  return `
    <div class="member-head">
      <div>
        <h3>${esc(m.display_name || m.id)}</h3>
        <p class="muted mono">${esc(m.id)} · role=${esc(m.role)} · cap=${esc(effectiveAutonomy)} · ${m.enabled === false ? "disabled" : "enabled"}</p>
      </div>
      <label class="switch">
        <input type="checkbox" data-member-field="enabled" data-team="${esc(t.id)}" data-member="${esc(m.id)}" ${m.enabled !== false ? "checked" : ""} />
        <span>Enabled</span>
      </label>
    </div>

    <div class="detail-tabs">
      ${["identity", "tools", "soul", "runtime"]
        .map(
          (x) =>
            `<button type="button" class="tab ${tab === x ? "on" : ""}" data-action="member-tab" data-tab="${x}">${
              { identity: "身份", tools: "工具与路径", soul: "SOUL", runtime: "运行时" }[x]
            }</button>`
        )
        .join("")}
    </div>

    ${
      tab === "identity"
        ? `
    <div class="form-grid">
      <label class="field"><span class="lbl">id（稳定）</span>
        <input value="${esc(m.id)}" disabled /></label>
      <label class="field"><span class="lbl">display_name</span>
        <input data-member-field="display_name" data-team="${esc(t.id)}" data-member="${esc(m.id)}" value="${esc(m.display_name || "")}" /></label>
      <label class="field"><span class="lbl">role 模板</span>
        <select data-member-field="role" data-team="${esc(t.id)}" data-member="${esc(m.id)}">
          ${s.roleCatalog
            .map((r) => `<option value="${esc(r.id)}" ${m.role === r.id ? "selected" : ""}>${esc(r.label)}</option>`)
            .join("")}
        </select></label>
      <label class="field"><span class="lbl">provider</span>
        <select data-member-field="provider" data-team="${esc(t.id)}" data-member="${esc(m.id)}">
          ${(s.providers || [])
            .map((p) => {
              const id = p.id || p;
              const label = p.label || p;
              return `<option value="${esc(id)}" ${provId === id ? "selected" : ""}>${esc(label)}</option>`;
            })
            .join("")}
        </select></label>
      <label class="field"><span class="lbl">model_hint</span>
        <input data-member-field="model_hint" data-team="${esc(t.id)}" data-member="${esc(m.id)}" value="${esc(m.model_hint || "")}" placeholder="sonnet / default" /></label>
      <label class="field"><span class="lbl">autonomy_cap</span>
        <select data-member-field="autonomy_cap" data-team="${esc(t.id)}" data-member="${esc(m.id)}">
          <option value="" ${!m.autonomy_cap ? "selected" : ""}>跟队 (${esc(t.autonomy_default)})</option>
          ${["L0", "L1", "L2", "L3"]
            .map((l) => `<option ${m.autonomy_cap === l ? "selected" : ""}>${l}</option>`)
            .join("")}
        </select></label>
      <label class="field full"><span class="lbl">note</span>
        <input data-member-field="note" data-team="${esc(t.id)}" data-member="${esc(m.id)}" value="${esc(m.note || "")}" /></label>
    </div>
    <div class="role-hint">
      <b>${esc(role?.label || m.role)}</b> — ${esc(role?.desc || "")}
      <div class="perm-row">
        默认写码 ${role?.defaults?.write ? "✓" : "✗"} ·
        测试 ${role?.defaults?.test ? "✓" : "✗"} ·
        push ${role?.defaults?.push ? "✓" : "✗"} ·
        网络 ${esc(role?.defaults?.network || "ask")}
      </div>
    </div>`
        : ""
    }

    ${
      tab === "tools"
        ? `
    <p class="muted tiny">Session 启动时固化。allow 空=默认全开再减 deny；verifier 建议显式 allow 白名单。</p>
    <div class="tool-matrix">
      <div class="tool-head"><span>tool</span><span>level</span><span>allow</span><span>deny</span><span>default</span></div>
      ${(s.toolCatalog || [])
        .map((tool) => {
          const allowed = (m.tools_allow || []).includes(tool.id);
          const denied = (m.tools_deny || []).includes(tool.id);
          const mode = denied ? "deny" : allowed ? "allow" : "default";
          return `
          <div class="tool-row ${mode}">
            <span class="mono">${esc(tool.id)}</span>
            <span class="k">${esc(tool.level)}</span>
            <button type="button" class="btn sm ${mode === "allow" ? "primary" : ""}" data-action="tool-mode" data-team="${esc(t.id)}" data-member="${esc(m.id)}" data-tool="${esc(tool.id)}" data-mode="allow">allow</button>
            <button type="button" class="btn sm ${mode === "deny" ? "danger" : ""}" data-action="tool-mode" data-team="${esc(t.id)}" data-member="${esc(m.id)}" data-tool="${esc(tool.id)}" data-mode="deny">deny</button>
            <button type="button" class="btn sm" data-action="tool-mode" data-team="${esc(t.id)}" data-member="${esc(m.id)}" data-tool="${esc(tool.id)}" data-mode="clear">default</button>
          </div>`;
        })
        .join("")}
    </div>
    <div class="form-grid" style="margin-top:12px">
      <label class="field full"><span class="lbl">path_allow</span>
        <input data-member-field="path_allow" data-team="${esc(t.id)}" data-member="${esc(m.id)}" value="${esc((m.path_allow || []).join(", "))}" /></label>
      <label class="field full"><span class="lbl">path_deny</span>
        <input data-member-field="path_deny" data-team="${esc(t.id)}" data-member="${esc(m.id)}" value="${esc((m.path_deny || []).join(", "))}" /></label>
      <label class="field"><span class="lbl">network</span>
        <select data-member-field="network" data-team="${esc(t.id)}" data-member="${esc(m.id)}">
          ${["deny", "ask", "allow"]
            .map((n) => `<option ${m.network === n ? "selected" : ""}>${n}</option>`)
            .join("")}
        </select></label>
    </div>`
        : ""
    }

    ${
      tab === "soul"
        ? `
    <label class="field"><span class="lbl">soul path</span>
      <input data-member-field="soul" data-team="${esc(t.id)}" data-member="${esc(m.id)}" value="${esc(m.soul || "")}" /></label>
    <label class="field"><span class="lbl">SOUL.md（Markdown，每 Session 注入）</span>
      <textarea class="md-editor" rows="12" data-member-field="soul_md" data-team="${esc(t.id)}" data-member="${esc(m.id)}">${esc(m.soul_md || "")}</textarea></label>
    <div class="lbl">预览</div>
    ${md(m.soul_md || "")}`
        : ""
    }

    ${
      tab === "runtime"
        ? `
    <div class="form-grid">
      <label class="field"><span class="lbl">max_parallel_sessions</span>
        <input type="number" min="1" data-member-field="max_parallel_sessions" data-team="${esc(t.id)}" data-member="${esc(m.id)}" value="${m.max_parallel_sessions || 1}" /></label>
      <label class="field"><span class="lbl">provider health</span>
        <input value="${esc(provLabel)} · ${esc(health)}" disabled /></label>
    </div>
    <div class="runtime-card">
      <div class="lbl">合成 autonomy（示意）</div>
      <p class="mono">allowed = min(global, team=${esc(t.autonomy_default)}, member=${esc(m.autonomy_cap || "L3")})</p>
      <p class="muted">有效上限 ≈ <b>${esc(effectiveAutonomy)}</b>（队与成员取更严）</p>
    </div>
    <div class="callout">
      <b>角色纪律</b>
      <ul>
        <li>M1 可用单 Member 兼 lead</li>
        <li>M3：builder ≠ verifier；verifier 无业务写权</li>
        <li>工具/路径在 Session 启动时固化，交互不能抬权</li>
      </ul>
    </div>`
        : ""
    }

    <div class="row-btns" style="margin-top:14px">
      <button type="button" class="btn danger sm" data-action="remove-member" data-team="${esc(t.id)}" data-member="${esc(m.id)}">移除成员</button>
      <button type="button" class="btn" data-action="switch-team" data-id="${esc(t.id)}">在 Board 查看该队</button>
    </div>`;
}

function yamlPreview(t) {
  return `id: ${t.id}
name: ${t.name}
domains: [${t.domains.join(", ")}]
default_orchestration: ${t.default_orchestration}
autonomy_default: ${t.autonomy_default}
concurrency: ${t.concurrency}
lead: ${t.lead}
default_responder: ${t.default_responder}
work_roots: [${t.work_roots.join(", ")}]
members:
${t.members
  .map(
    (m) =>
      `  - id: ${m.id}\n    role: ${m.role}\n    provider: ${m.provider}\n    autonomy_cap: ${m.autonomy_cap || "null"}\n    network: ${m.network || "ask"}`
  )
  .join("\n")}`;
}

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
