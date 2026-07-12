// PROTOTYPE — router + variant switcher + in-memory actions
(function () {
  const VARIANTS = [
    { key: "A", name: "A · 画廊架", impl: () => window.VariantA },
    { key: "B", name: "B · 回来简报", impl: () => window.VariantB },
    { key: "C", name: "C · 制作台", impl: () => window.VariantC },
  ];

  // nav: { view, projectId?, artifactId?, tab?, rev? }
  let nav = { view: "home" };

  function qs() {
    return new URLSearchParams(location.search);
  }

  function currentKey() {
    const v = (qs().get("variant") || "A").toUpperCase();
    return VARIANTS.some((x) => x.key === v) ? v : "A";
  }

  function setVariant(key) {
    const u = new URL(location.href);
    u.searchParams.set("variant", key);
    history.replaceState(null, "", u);
    // reset nav when switching shell structure
    nav = key === "C" ? { view: "studio", projectId: "novel-x" } : { view: "home" };
    render();
  }

  function cycle(dir) {
    const i = VARIANTS.findIndex((x) => x.key === currentKey());
    const next = VARIANTS[(i + dir + VARIANTS.length) % VARIANTS.length];
    setVariant(next.key);
  }

  function markSeen(artifactId) {
    const a = HEARTH_DATA.artifacts[artifactId];
    if (a && a.unseen) a.unseen = false;
  }

  function removeGate(id) {
    HEARTH_DATA.gates = HEARTH_DATA.gates.filter((g) => g.id !== id);
    // light project.gates count
    Object.values(HEARTH_DATA.projects).forEach((p) => {
      p.gates = HEARTH_DATA.gates.filter((g) => g.project_id === p.id).length || undefined;
    });
  }

  function routeLabel() {
    const k = currentKey();
    const parts = [`variant=${k}`, `view=${nav.view}`];
    if (nav.projectId) parts.push(`project=${nav.projectId}`);
    if (nav.artifactId) parts.push(`artifact=${nav.artifactId}`);
    if (nav.tab) parts.push(`tab=${nav.tab}`);
    if (nav.rev) parts.push(`rev=${nav.rev}`);
    const unseen = HEARTH_HELPERS.unseenArtifacts().length;
    parts.push(`unseen=${unseen}`);
    parts.push(`gates=${HEARTH_DATA.gates.length}`);
    return parts.join(" · ");
  }

  function applyNav(partial) {
    nav = { ...nav, ...partial };
    if (partial.view === "home") {
      nav = { view: "home" };
    }
    if (partial.view === "project") {
      nav = {
        view: "project",
        projectId: partial.projectId,
        tab: partial.tab || "gallery",
      };
    }
    if (partial.view === "artifact") {
      nav = {
        view: "artifact",
        artifactId: partial.artifactId,
        projectId: HEARTH_DATA.artifacts[partial.artifactId]?.project_id,
        rev: partial.rev,
      };
      markSeen(partial.artifactId);
    }
    if (partial.view === "studio") {
      nav = {
        view: "studio",
        projectId: partial.projectId || nav.projectId || "novel-x",
        artifactId: partial.artifactId,
        rev: partial.rev,
      };
      if (partial.artifactId) markSeen(partial.artifactId);
      // switching project without artifact → first art
      if (partial.projectId && !partial.artifactId) {
        const first = HEARTH_HELPERS.projectArtifacts(partial.projectId)[0];
        nav.artifactId = first?.id;
        nav.rev = first?.current_rev;
        if (first) markSeen(first.id);
      }
    }
    render();
  }

  function render() {
    const key = currentKey();
    const meta = VARIANTS.find((x) => x.key === key);
    const impl = meta.impl();
    const app = document.getElementById("app");
    const routeBar = document.getElementById("route-bar");
    const switcher = document.getElementById("switcher");

    if (!impl) {
      app.innerHTML = `<p class="loading">Variant ${key} missing</p>`;
      return;
    }

    // C always studio nav
    if (key === "C" && nav.view !== "studio") {
      nav = { view: "studio", projectId: nav.projectId || "novel-x", artifactId: nav.artifactId };
    }

    app.innerHTML = impl.render(nav);
    routeBar.textContent = `state · ${routeLabel()}`;

    switcher.hidden = false;
    switcher.innerHTML = `
      <button type="button" data-cycle="-1" aria-label="prev">‹</button>
      <div class="label">${HEARTH_HELPERS.esc(meta.name)}</div>
      <button type="button" data-cycle="1" aria-label="next">›</button>
    `;
  }

  document.addEventListener("click", (e) => {
    const cycleBtn = e.target.closest("[data-cycle]");
    if (cycleBtn) {
      cycle(Number(cycleBtn.getAttribute("data-cycle")));
      return;
    }

    const actionEl = e.target.closest("[data-action]");
    if (actionEl) {
      const action = actionEl.getAttribute("data-action");
      const id = actionEl.getAttribute("data-id");
      if (action === "grant" || action === "deny") {
        removeGate(id);
        render();
      }
      return;
    }

    const navEl = e.target.closest("[data-nav]");
    if (navEl) {
      try {
        const partial = JSON.parse(navEl.getAttribute("data-nav"));
        applyNav(partial);
      } catch (err) {
        console.error(err);
      }
    }
  });

  document.addEventListener("keydown", (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      cycle(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      cycle(1);
    }
  });

  // boot
  if (currentKey() === "C") nav = { view: "studio", projectId: "novel-x" };
  render();
})();
