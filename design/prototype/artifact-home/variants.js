// PROTOTYPE — three structurally different shells
// Question: medium-first Home → gallery → previewer feel?

const H = window.HEARTH_HELPERS;
const D = () => window.HEARTH_DATA;

function previewHTML(art, rev) {
  const v = art.versions.find((x) => x.rev === rev) || art.versions[0];
  const m = art.medium;
  if (m === "novel" || m === "doc") {
    return `<div class="a-reader">${H.esc(art.body || "（无正文）")}</div>`;
  }
  if (m === "video") {
    return `<div class="a-player">
      <div class="big">▶</div>
      <div class="time">${H.esc(art.player_label || "00:00")} · v${v.rev}</div>
    </div>
    <p class="muted" style="margin-top:12px">Player 预览器 · 版本切换不覆盖源文件</p>`;
  }
  if (m === "image") {
    return `<div class="a-player" style="aspect-ratio:3/4;max-width:280px;margin:0 auto;background:${H.esc(art.cover_tone)}">
      <div class="big">${H.esc(art.cover)}</div>
    </div>
    <p class="muted" style="margin-top:12px;text-align:center">Gallery 灯箱 · 可并排对比版本</p>`;
  }
  if (m === "app") {
    return `<div class="a-app-frame">
      <div class="a-app-mock">
        <div class="muted" style="font-size:11px;margin-bottom:8px">live-app · localhost mock</div>
        <strong style="font-size:16px">Sign in</strong>
        <input placeholder="email" disabled />
        <input placeholder="password" type="password" disabled />
        <button class="primary" style="width:100%;margin-top:8px" disabled>Continue with OAuth</button>
        <p class="muted" style="font-size:11px;margin:10px 0 0">v${v.rev} · ${H.esc(v.note)}</p>
      </div>
    </div>`;
  }
  if (m === "code") {
    return `<pre class="a-reader" style="font-family:var(--mono);font-size:13px;color:#9fefb0">${H.esc(art.body || "")}</pre>`;
  }
  return `<p class="muted">Fallback：元信息 + 下载</p>`;
}

/* ========== A · 画廊架 ========== */
window.VariantA = {
  name: "A · 画廊架",
  render(nav) {
    const { view, projectId, artifactId, tab, rev } = nav;
    const gates = D().gates;
    let main = "";
    if (view === "home") main = this.home(gates);
    else if (view === "project") main = this.project(projectId, tab || "gallery");
    else if (view === "artifact") main = this.artifact(artifactId, rev);
    else main = this.home(gates);

    return `<div class="a-shell">
      <header class="a-top">
        <span class="a-brand">HEARTH</span>
        <button class="a-nav ${view === "home" ? "active" : ""}" data-nav='{"view":"home"}'>
          Home ${gates.length ? `<span class="badge">${gates.length}</span>` : ""}
        </button>
        <button class="a-nav ${view === "project" || view === "artifact" ? "active" : ""}" data-nav='{"view":"home","scroll":"projects"}'>Projects</button>
        <button class="a-nav" disabled title="原型未做">Teams</button>
        <div class="a-top-spacer"></div>
        <button class="sm primary" data-nav='{"view":"home"}'>+ 派活</button>
      </header>
      <div class="a-body">${main}</div>
    </div>`;
  },
  home(gates) {
    const unseen = H.unseenArtifacts();
    const projects = Object.values(D().projects);
    return `
      ${
        gates.length
          ? `<div class="a-gates">
        <strong>🔔 硬门 ${gates.length}</strong>
        ${gates
          .map(
            (g) => `<div class="a-gate-chip">
            <span class="pill gate">${H.esc(g.kind)}</span>
            <span>${H.esc(g.title)}</span>
            <span class="muted">${H.esc(H.projectName(g.project_id))}</span>
            <button class="sm primary" data-action="grant" data-id="${H.esc(g.id)}">Grant</button>
          </div>`
          )
          .join("")}
      </div>`
          : ""
      }

      <div class="a-section-h">
        <h2>新产物 <span class="pill unseen">${unseen.length} unseen</span></h2>
        <span class="muted">回来第一眼 · 取代旧 Return view</span>
      </div>
      <div class="a-new-row">
        ${unseen
          .map(
            (a) => `<button class="a-new-card" data-nav='{"view":"artifact","artifactId":"${a.id}"}'>
          <div class="a-new-thumb" style="background:${H.esc(a.cover_tone)}">${H.esc(a.cover)}</div>
          <div>
            <div class="meta">${H.esc(H.projectName(a.project_id))} · ${H.esc(H.mediumLabel(a.medium))} · v${a.current_rev}</div>
            <h3>${H.esc(a.title)}</h3>
            <div class="meta">${H.esc(a.versions[0]?.note || "")} · ${H.esc(a.versions[0]?.at || "")}</div>
          </div>
        </button>`
          )
          .join("")}
      </div>

      <div class="a-section-h" id="projects">
        <h2>项目</h2>
        <span class="muted">点进 = 产物画廊（默认）</span>
      </div>
      <div class="a-proj-grid">
        ${projects
          .map((p) => {
            const team = H.teamName(p.primary_team_id);
            const n = H.projectArtifacts(p.id).length;
            return `<button class="a-proj-card" data-nav='{"view":"project","projectId":"${p.id}","tab":"gallery"}'>
            <div style="display:flex;gap:6px;margin-bottom:8px">
              <span class="pill">${H.esc(H.mediumLabel(p.medium))}</span>
              ${p.gates ? `<span class="pill gate">硬门 ${p.gates}</span>` : ""}
              ${p.running ? `<span class="pill">在跑 ${p.running}</span>` : ""}
            </div>
            <h3>${H.esc(p.name)}</h3>
            <p>${H.esc(p.summary)}</p>
            <p style="margin-top:8px">${H.esc(team)} · ${n} 产物</p>
          </button>`;
          })
          .join("")}
      </div>`;
  },
  project(pid, tab) {
    const p = D().projects[pid];
    if (!p) return `<p>未知项目</p>`;
    const arts = H.projectArtifacts(pid);
    const works = H.projectWork(pid);
    const tabs = [
      ["gallery", "产物"],
      ["progress", "进展"],
      ["team", "团队"],
      ["settings", "设置"],
    ];
    let body = "";
    if (tab === "gallery") {
      if (!arts.length) {
        body = `<div class="a-empty">
          <p>还没有产物</p>
          <p class="muted">空项目 CTA：先派一单，或手动登记产物</p>
          <button class="primary" style="margin-top:12px">+ 派活</button>
          <button class="ghost" style="margin-top:12px">+ 登记产物</button>
        </div>`;
      } else {
        body = `<div class="a-gallery">
          ${arts
            .map(
              (a) => `<button class="a-art-tile" data-nav='{"view":"artifact","artifactId":"${a.id}"}'>
              <div class="a-art-cover" style="background:${H.esc(a.cover_tone)}">
                ${H.esc(a.cover)}
                ${a.unseen ? `<span class="pill unseen" style="position:absolute;top:8px;right:8px">NEW</span>` : ""}
              </div>
              <div class="body">
                <h3>${H.esc(a.title)}</h3>
                <div class="muted" style="font-size:11px">
                  ${H.esc(H.mediumLabel(a.medium))} · v${a.current_rev} · ${H.esc(H.statusLabel(a.status))}
                </div>
              </div>
            </button>`
            )
            .join("")}
        </div>`;
      }
    } else if (tab === "progress") {
      const cols = ["todo", "in_progress", "blocked", "in_review", "done"];
      body = `<p class="muted" style="margin:0 0 12px">Board 降为子页 · 本项目 WorkItem</p>
        <div class="a-board">
        ${cols
          .map((c) => {
            const list = works.filter((w) => w.status === c);
            return `<div class="a-col">
              <h4>${c} (${list.length})</h4>
              ${list.map((w) => `<div class="a-wi"><strong>${H.esc(w.id)}</strong><br>${H.esc(w.title)}</div>`).join("") || `<div class="muted" style="font-size:11px">—</div>`}
            </div>`;
          })
          .join("")}
        </div>`;
    } else if (tab === "team") {
      body = `<p>主责：<strong>${H.esc(H.teamName(p.primary_team_id))}</strong></p>
        <p class="muted">协作队可在设置里加 · 原型略</p>`;
    } else {
      body = `<pre class="muted" style="font-family:var(--mono);font-size:12px">
id: ${H.esc(p.id)}
medium: ${H.esc(p.medium)}
primary_team_id: ${H.esc(p.primary_team_id)}
root_path: ~/work/${H.esc(p.id)}
</pre>`;
    }

    return `
      <button class="ghost sm" data-nav='{"view":"home"}'>← Home</button>
      <div class="a-proj-head" style="margin-top:12px">
        <div>
          <h1>${H.esc(p.name)}</h1>
          <div class="muted" style="margin-top:4px">
            <span class="pill">${H.esc(H.mediumLabel(p.medium))}</span>
            主责 ${H.esc(H.teamName(p.primary_team_id))}
          </div>
        </div>
        <div style="margin-left:auto;display:flex;gap:8px">
          <button class="sm">+ 新产物</button>
          <button class="sm primary">▶ 派活</button>
        </div>
      </div>
      <div class="a-tabs">
        ${tabs
          .map(
            ([k, label]) =>
              `<button class="a-tab ${tab === k ? "active" : ""}" data-nav='{"view":"project","projectId":"${pid}","tab":"${k}"}'>${label}</button>`
          )
          .join("")}
      </div>
      ${body}`;
  },
  artifact(aid, rev) {
    const a = D().artifacts[aid];
    if (!a) return `<p>未知产物</p>`;
    const r = rev || a.current_rev;
    const p = D().projects[a.project_id];
    return `
      <button class="ghost sm" data-nav='{"view":"project","projectId":"${a.project_id}","tab":"gallery"}'>← ${H.esc(p?.name || a.project_id)}</button>
      <div class="a-proj-head" style="margin-top:12px">
        <div>
          <h1 style="font-size:18px">${H.esc(a.title)}</h1>
          <div class="muted" style="margin-top:4px">
            ${H.esc(H.mediumLabel(a.medium))} · ${H.esc(H.statusLabel(a.status))}
            ${a.unseen ? `<span class="pill unseen">unseen</span>` : ""}
          </div>
        </div>
      </div>
      <div class="a-art-layout">
        <div class="a-preview-pane">
          <div class="a-preview-toolbar">
            <span class="pill">${H.esc(H.mediumLabel(a.medium))} 预览器</span>
            <span class="muted">v${r}</span>
            <div style="flex:1"></div>
            <button class="sm">对比版本</button>
            <button class="sm">导出 ▾</button>
            <button class="sm primary">发布</button>
          </div>
          <div class="a-preview-body">${previewHTML(a, r)}</div>
          <div style="padding:10px 14px;border-top:1px solid var(--line);font-size:12px;color:var(--muted)">
            溯源：${H.esc(a.versions.find((v) => v.rev === r)?.produced_by || "—")}
            · 预览后清除 unseen
          </div>
        </div>
        <aside class="a-ver-rail">
          <h3>版本</h3>
          ${a.versions
            .map(
              (v) => `<button class="a-ver ${v.rev === r ? "active" : ""}" data-nav='{"view":"artifact","artifactId":"${aid}","rev":${v.rev}}'>
              <div class="rev">v${v.rev} ${v.rev === a.current_rev ? "· current" : ""}</div>
              <div class="note">${H.esc(v.note)}</div>
              <div class="note">${H.esc(v.at)}</div>
            </button>`
            )
            .join("")}
          <hr style="border:none;border-top:1px solid var(--line);margin:12px 0" />
          <p class="muted" style="font-size:11px;margin:0">版本 append-only · 永不覆盖</p>
        </aside>
      </div>`;
  },
};

/* ========== B · 回来简报 ========== */
window.VariantB = {
  name: "B · 回来简报",
  render(nav) {
    const { view, projectId, artifactId, rev } = nav;
    if (view === "artifact" && artifactId) return this.immersive(artifactId, rev);
    if (view === "project" && projectId) return this.drawer(projectId);
    return this.brief();
  },
  brief() {
    const gates = D().gates;
    const unseen = H.unseenArtifacts();
    const projects = Object.values(D().projects);
    return `<div class="b-shell">
      <div class="b-hero">
        <h1>你离开期间</h1>
        <p>${unseen.length} 件新产物可逛 · ${gates.length} 个硬门 · 异步 CVO 第一眼</p>
      </div>

      ${
        gates.length
          ? `<div class="b-gate-stack">
        ${gates
          .map(
            (g) => `<div class="b-gate">
            <div>
              <div><span class="pill gate">${H.esc(g.kind)}</span> ${H.esc(g.title)}</div>
              <div class="muted" style="font-size:12px;margin-top:4px">${H.esc(H.projectName(g.project_id))} · ${H.esc(g.workitem_id)}</div>
            </div>
            <div class="actions">
              <button class="sm" data-action="deny" data-id="${H.esc(g.id)}">Deny</button>
              <button class="sm primary" data-action="grant" data-id="${H.esc(g.id)}">Grant</button>
            </div>
          </div>`
          )
          .join("")}
      </div>`
          : ""
      }

      <div class="muted" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px">新产物 · 全幅优先</div>
      ${unseen
        .map(
          (a) => `<button class="b-feature" data-nav='{"view":"artifact","artifactId":"${a.id}"}'>
          <div class="b-feature-cover" style="background:linear-gradient(160deg, ${H.esc(a.cover_tone)} 0%, #0e1014 100%)">
            <div class="med">${H.esc(H.mediumLabel(a.medium))} · ${H.esc(H.projectName(a.project_id))}</div>
            <h2>${H.esc(a.title)}</h2>
            <div class="sub">v${a.current_rev} · ${H.esc(a.versions[0]?.note || "")}</div>
          </div>
          <div class="b-feature-body">
            <span>${H.esc(a.versions[0]?.at || "")}</span>
            <span class="pill unseen">点开预览</span>
          </div>
        </button>`
        )
        .join("")}

      <div class="muted" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:24px 0 10px">项目 · 次要入口</div>
      <div class="b-proj-strip">
        ${projects
          .map(
            (p) =>
              `<button class="b-proj-chip" data-nav='{"view":"project","projectId":"${p.id}"}'>${H.esc(p.name)} · ${H.esc(H.mediumLabel(p.medium))}</button>`
          )
          .join("")}
      </div>
    </div>`;
  },
  drawer(pid) {
    const p = D().projects[pid];
    if (!p) return `<p>未知项目</p>`;
    const arts = H.projectArtifacts(pid);
    const works = H.projectWork(pid);
    return `<div class="b-shell">
      <div class="b-drawer-head">
        <button class="ghost sm" data-nav='{"view":"home"}'>← 简报</button>
        <h1>${H.esc(p.name)}</h1>
        <span class="pill">${H.esc(H.mediumLabel(p.medium))}</span>
      </div>
      <p class="muted" style="margin-top:0">${H.esc(p.summary)}</p>

      <div class="muted" style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;margin:20px 0 10px">产物列表</div>
      ${
        arts.length
          ? `<div class="b-list-art">
        ${arts
          .map(
            (a) => `<button class="b-list-row" data-nav='{"view":"artifact","artifactId":"${a.id}"}'>
            <div class="b-list-ico" style="background:${H.esc(a.cover_tone)}">${H.esc(a.cover)}</div>
            <div style="flex:1">
              <strong>${H.esc(a.title)}</strong>
              <div class="muted" style="font-size:12px">v${a.current_rev} · ${H.esc(H.statusLabel(a.status))}</div>
            </div>
            ${a.unseen ? `<span class="pill unseen">NEW</span>` : ""}
          </button>`
          )
          .join("")}
      </div>`
          : `<div class="a-empty"><p>空项目</p><button class="primary">+ 派活开第一单</button></div>`
      }

      <details style="margin-top:28px">
        <summary class="muted" style="cursor:pointer">进展（旧 Board · 折叠）</summary>
        <div style="margin-top:10px">
          ${works
            .map(
              (w) =>
                `<div class="a-wi" style="margin-bottom:6px"><span class="pill">${H.esc(w.status)}</span> ${H.esc(w.title)}</div>`
            )
            .join("") || `<p class="muted">无任务</p>`}
        </div>
      </details>
    </div>`;
  },
  immersive(aid, rev) {
    const a = D().artifacts[aid];
    if (!a) return `<p>未知产物</p>`;
    const r = rev || a.current_rev;
    return `<div class="b-immersive">
      <div class="b-imm-bar">
        <button class="ghost sm" data-nav='{"view":"home"}'>✕ 关闭</button>
        <h2>${H.esc(a.title)}</h2>
        <span class="pill">${H.esc(H.mediumLabel(a.medium))}</span>
        <button class="sm">导出</button>
        <button class="sm primary">发布</button>
      </div>
      <div class="b-imm-body">
        ${previewHTML(a, r)}
        <div class="b-imm-versions">
          ${a.versions
            .map(
              (v) =>
                `<button class="sm ${v.rev === r ? "primary" : ""}" data-nav='{"view":"artifact","artifactId":"${aid}","rev":${v.rev}}'>v${v.rev} · ${H.esc(v.note)}</button>`
            )
            .join("")}
        </div>
        <p class="muted" style="margin-top:16px;font-size:12px">
          沉浸式预览 · 溯源 ${H.esc(a.versions.find((v) => v.rev === r)?.produced_by || "—")}
          · 属于 ${H.esc(H.projectName(a.project_id))}
          · <button class="ghost sm" data-nav='{"view":"project","projectId":"${a.project_id}"}'>打开项目</button>
        </p>
      </div>
    </div>`;
  },
};

/* ========== C · 制作台 ========== */
window.VariantC = {
  name: "C · 制作台",
  render(nav) {
    const projectId = nav.projectId || "novel-x";
    const arts = H.projectArtifacts(projectId);
    const artifactId = nav.artifactId || arts[0]?.id || null;
    const a = artifactId ? D().artifacts[artifactId] : null;
    const rev = nav.rev || a?.current_rev;
    const p = D().projects[projectId];
    const works = H.projectWork(projectId);
    const gates = D().gates.filter((g) => g.project_id === projectId);
    const allGates = D().gates;

    return `<div class="c-shell">
      <aside class="c-left">
        <div class="c-pane-h">
          <span>Projects</span>
          <span class="pill gate" title="全局硬门">${allGates.length}</span>
        </div>
        ${
          allGates.length
            ? `<div class="c-gates-mini">
          ${allGates
            .map(
              (g) =>
                `<button class="c-gate-mini" data-nav='{"view":"studio","projectId":"${g.project_id}"}' title="Grant 在卡内">🔔 ${H.esc(g.title)}</button>`
            )
            .join("")}
        </div>`
            : ""
        }
        ${Object.values(D().projects)
          .map((pr) => {
            const nUnseen = H.projectArtifacts(pr.id).filter((x) => x.unseen).length;
            return `<button class="c-proj-item ${pr.id === projectId ? "active" : ""}" data-nav='{"view":"studio","projectId":"${pr.id}"}'>
              <div class="name">${H.esc(pr.name)} ${nUnseen ? `<span class="dot"></span>` : ""}</div>
              <div class="sub">${H.esc(H.mediumLabel(pr.medium))} · ${H.esc(H.teamName(pr.primary_team_id))}</div>
            </button>`;
          })
          .join("")}
        <div class="c-pane-h" style="margin-top:auto">本项目产物</div>
        ${
          arts.length
            ? arts
                .map(
                  (art) => `<button class="c-art-item ${art.id === artifactId ? "active" : ""}" data-nav='{"view":"studio","projectId":"${projectId}","artifactId":"${art.id}"}'>
                  <span>${H.esc(art.cover)}</span>
                  <span class="t">
                    <strong>${H.esc(art.title)}</strong>
                    <div class="muted">v${art.current_rev}${art.unseen ? " · NEW" : ""}</div>
                  </span>
                </button>`
                )
                .join("")
            : `<p class="muted" style="padding:12px;font-size:12px">无产物 — 派活或登记</p>`
        }
      </aside>

      <main class="c-center">
        ${
          a
            ? `<div class="c-center-toolbar">
            <strong>${H.esc(a.title)}</strong>
            <span class="pill">${H.esc(H.mediumLabel(a.medium))}</span>
            <span class="muted">v${rev}</span>
            ${a.unseen ? `<span class="pill unseen">unseen</span>` : ""}
            <div style="flex:1"></div>
            <button class="sm">导出</button>
            <button class="sm primary">发布</button>
          </div>
          <div class="c-center-body">${previewHTML(a, rev)}</div>`
            : `<div class="c-center-empty">
            <div>
              <h2 style="margin:0 0 8px">${H.esc(p?.name || "项目")}</h2>
              <p>选左侧产物，预览<strong>永远在中栏</strong></p>
              <p class="muted">空项目？先派活</p>
              <button class="primary" style="margin-top:12px">+ 派活</button>
            </div>
          </div>`
        }
      </main>

      <aside class="c-right">
        <div class="c-pane-h">版本</div>
        ${
          a
            ? a.versions
                .map(
                  (v) => `<button class="c-ver-item ${v.rev === rev ? "active" : ""}" data-nav='{"view":"studio","projectId":"${projectId}","artifactId":"${a.id}","rev":${v.rev}}'>
                  <div class="rev">v${v.rev}</div>
                  <div class="note">${H.esc(v.note)}</div>
                  <div class="note">${H.esc(v.at)} · ${H.esc(v.produced_by)}</div>
                </button>`
                )
                .join("")
            : `<p class="muted" style="padding:12px;font-size:12px">无选中产物</p>`
        }
        <div class="c-pane-h">进展（次要）</div>
        ${works
          .map(
            (w) =>
              `<div class="c-wi-mini"><span class="pill">${H.esc(w.status)}</span> ${H.esc(w.title)}</div>`
          )
          .join("") || `<p class="muted" style="padding:12px;font-size:12px">无任务</p>`}
        ${
          gates.length
            ? `<div class="c-pane-h">本项目硬门</div>
          ${gates
            .map(
              (g) =>
                `<div class="c-wi-mini" style="color:#ffb0b0">${H.esc(g.kind)} · ${H.esc(g.title)}
                <div style="margin-top:4px"><button class="sm primary" data-action="grant" data-id="${H.esc(g.id)}">Grant</button></div>
              </div>`
            )
            .join("")}`
            : ""
        }
      </aside>
    </div>`;
  },
};
