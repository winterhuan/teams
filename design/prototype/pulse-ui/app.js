/** PROTOTYPE app shell */
(function () {
  const Store = window.Store;
  const Views = window.Views;

  if (!Store || !Views) {
    var err = document.getElementById("boot-error");
    if (err) {
      err.style.display = "block";
      err.textContent = "Store/Views 未加载。请用 http 服务打开本目录，勿用 file://";
    }
    return;
  }

  function render() {
    try {
      const s = Store.get();
      let html;
      if (s.view === "pulse") html = Views.pulse(s);
      else if (s.view === "teams") html = Views.teams(s);
      else html = Views.board(s);
      const root = document.getElementById("app");
      if (!root) throw new Error("#app missing");
      root.innerHTML = html;
      document.title = "PROTOTYPE · " + (s.uiVariant || "A") + " · " + s.view;
      if (s.view === "pulse" && (location.hash === "#gates" || s.scrollToGates)) {
        const el = document.getElementById("gates");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        if (s.scrollToGates && Store.clearScrollToGates) Store.clearScrollToGates();
      }
    } catch (e) {
      console.error(e);
      var el = document.getElementById("boot-error");
      if (el) {
        el.style.display = "block";
        el.textContent = "Render error: " + (e && e.message ? e.message : e);
      }
    }
  }

  function onClick(e) {
    const t = e.target.closest("[data-action]");
    if (!t) return;
    const a = t.getAttribute("data-action");
    const id = t.getAttribute("data-id");
    const s = Store.get();

    switch (a) {
      case "goto": {
        const view = t.getAttribute("data-view");
        if (view === "pulse" && (s.pendingDecisions || []).length) {
          Store.setView("pulse");
          if (Store.requestScrollToGates) Store.requestScrollToGates();
          location.hash = "gates";
        } else {
          Store.setView(view);
          if (view !== "pulse" && location.hash === "#gates") location.hash = "";
        }
        break;
      }
      case "switch-team":
        if (id) {
          Store.setTeam(id);
          if (Store.get().uiVariant === "C") Store.setView("board");
        }
        break;
      case "switch-project":
        if (id) Store.setProject(id);
        break;
      case "set-cell":
        Store.setCell(t.getAttribute("data-team"), t.getAttribute("data-project"));
        break;
      case "set-variant":
        Store.setUiVariant(id);
        break;
      case "variant-prev": {
        const order = ["A", "B", "C"];
        const i = order.indexOf(s.uiVariant || "A");
        Store.setUiVariant(order[(i + order.length - 1) % order.length]);
        break;
      }
      case "variant-next": {
        const order = ["A", "B", "C"];
        const i = order.indexOf(s.uiVariant || "A");
        Store.setUiVariant(order[(i + 1) % order.length]);
        break;
      }
      case "open-work":
        if (id) Store.openWork(id);
        break;
      case "select-work":
        Store.selectWork(id);
        break;
      case "detail-tab":
        Store.setDetailTab(t.getAttribute("data-tab"));
        break;
      case "member-tab":
        Store.setMemberTab(t.getAttribute("data-tab"));
        break;
      case "toggle-desc-edit":
        Store.setDescEdit(!Store.get().descEdit);
        break;
      case "tool-mode":
        Store.toggleMemberTool(
          t.getAttribute("data-team"),
          t.getAttribute("data-member"),
          t.getAttribute("data-tool"),
          t.getAttribute("data-mode")
        );
        break;
      case "select-live":
        Store.selectLive(id);
        break;
      case "focus-dec":
        Store.setFocusDecision(Number(t.getAttribute("data-index") || 0));
        break;
      case "grant":
        Store.grant(id);
        break;
      case "deny":
        Store.deny(id);
        break;
      case "reply": {
        const scope = t.closest(".card-gate, .gates-detail, .work-detail, .page") || document;
        const ta = scope.querySelector('textarea[name="reply"]');
        Store.reply(id, ta ? ta.value : "");
        break;
      }
      case "pause":
        Store.pause(id);
        break;
      case "nudge": {
        const ta = t.closest(".live-detail")?.querySelector('[name="nudge"]');
        Store.nudge(id, ta ? ta.value : "");
        break;
      }
      case "run": {
        const form = t.closest("form");
        const goal = form?.querySelector('[name="goal"]')?.value;
        let project;
        if (s.uiVariant === "B" || s.uiVariant === "C") project = s.projectId;
        else {
          const pf = s.projectFilter;
          project = pf && pf !== "all" && pf !== "none" ? pf : undefined;
        }
        Store.runWork({ goal, team: s.teamId, project });
        break;
      }
      case "add-artifact": {
        const form = t.closest("form");
        Store.addArtifact(t.getAttribute("data-work"), {
          kind: form?.querySelector('[name="akind"]')?.value,
          title: form?.querySelector('[name="atitle"]')?.value,
          path: form?.querySelector('[name="apath"]')?.value,
        });
        if (form) {
          const path = form.querySelector('[name="apath"]');
          const title = form.querySelector('[name="atitle"]');
          if (path) path.value = "";
          if (title) title.value = "";
        }
        break;
      }
      case "add-comment": {
        const form = t.closest("form");
        const body = form?.querySelector('[name="cbody"]')?.value;
        const kind = form?.querySelector('[name="ckind"]')?.value || "issue";
        Store.addComment(t.getAttribute("data-work"), body, kind);
        if (form) form.querySelector('[name="cbody"]').value = "";
        break;
      }
      case "toggle-cmt":
        break;
      case "select-issues-work":
        Store.selectOpenIssuesOnWork(id);
        break;
      case "bundle":
        Store.bundleComments({
          title: prompt("Goal 标题", "验收问题一轮修") || undefined,
          start: confirm("创建后立即 start？"),
        });
        break;
      case "toggle-acc":
        break;
      case "acc-to-comment":
        Store.accToComment(t.getAttribute("data-work"), t.getAttribute("data-acc"));
        break;
      case "edit-team":
        Store.setTeamEdit(id);
        break;
      case "create-team":
        Store.createTeam();
        break;
      case "select-member":
        Store.selectMember(id);
        break;
      case "add-member":
        Store.addMember(t.getAttribute("data-team"));
        break;
      case "remove-member":
        if (confirm("移除该成员？")) Store.removeMember(t.getAttribute("data-team"), t.getAttribute("data-member"));
        break;
      default:
        break;
    }
  }

  function onChange(e) {
    const t = e.target;
    if (t.matches("[data-action=switch-team]") || t.matches("select[data-action=switch-team]")) {
      Store.setTeam(t.value);
      return;
    }
    if (t.matches(".team-switch select")) {
      Store.setTeam(t.value);
      return;
    }
    if (t.matches("[data-action=switch-project]") || t.matches("select[data-action=switch-project]")) {
      Store.setProject(t.value);
      return;
    }
    if (t.matches(".project-hero-switch select")) {
      Store.setProject(t.value);
      return;
    }
    if (t.matches("[data-action=move-status]")) {
      Store.moveWork(t.getAttribute("data-id"), t.value);
      return;
    }
    if (t.matches("[data-action=assign-team]")) {
      if (t.value) Store.assignTeam(t.getAttribute("data-id"), t.value);
      return;
    }
    if (t.matches("[data-action=assign-project]")) {
      Store.assignProject(t.getAttribute("data-id"), t.value || null);
      return;
    }
    if (t.matches("[data-action=filter-project]")) {
      Store.setProjectFilter(t.value);
      return;
    }
    if (t.matches("[data-action=toggle-cmt]")) {
      Store.toggleCommentSelect(t.getAttribute("data-id"));
      return;
    }
    if (t.matches("[data-action=toggle-acc]")) {
      Store.toggleAcc(t.getAttribute("data-work"), t.getAttribute("data-acc"));
      return;
    }
    if (t.matches("[data-team-field]")) {
      Store.updateTeamField(t.getAttribute("data-team"), t.getAttribute("data-team-field"), t.value);
      return;
    }
    if (t.matches("[data-member-field]")) {
      const field = t.getAttribute("data-member-field");
      const val = t.type === "checkbox" ? (t.checked ? "true" : "false") : t.value;
      Store.updateMember(t.getAttribute("data-team"), t.getAttribute("data-member"), field, val);
      return;
    }
    if (t.matches("[data-work-field]")) {
      Store.updateWorkField(t.getAttribute("data-id"), t.getAttribute("data-work-field"), t.value);
    }
  }

  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches("[data-team-field]") && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
      Store.updateTeamField(t.getAttribute("data-team"), t.getAttribute("data-team-field"), t.value);
    }
    if (t.matches("[data-member-field]") && (t.tagName === "INPUT" || t.tagName === "TEXTAREA") && t.type !== "checkbox") {
      Store.updateMember(
        t.getAttribute("data-team"),
        t.getAttribute("data-member"),
        t.getAttribute("data-member-field"),
        t.value
      );
    }
    if (t.matches("[data-work-field]") && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) {
      Store.updateWorkField(t.getAttribute("data-id"), t.getAttribute("data-work-field"), t.value);
    }
  });

  document.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target?.isContentEditable) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      const s = Store.get();
      const order = ["A", "B", "C"];
      const i = order.indexOf(s.uiVariant || "A");
      Store.setUiVariant(order[(i + order.length - 1) % order.length]);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const s = Store.get();
      const order = ["A", "B", "C"];
      const i = order.indexOf(s.uiVariant || "A");
      Store.setUiVariant(order[(i + 1) % order.length]);
    }
  });

  Store.subscribe(render);
  render();
})();
