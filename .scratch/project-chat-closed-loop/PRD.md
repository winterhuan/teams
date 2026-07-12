# Hearth Project Chat 完整闭环

Status: ready-for-agent

## Problem Statement

Hearth 已经确定 Project 中心、chat-first 的产品方向，但现有设计是在多轮 IA 转向中演化出来的，当前合同仍有关键分叉：Thread 一方面被定义为自由协作面，另一方面仍残留 pipeline 模式；WorkflowRun 已被确立为独立受控执行对象，Session 却仍被部分文档限定为只归 Thread；Issue 业务状态被声明为唯一业务真相，同时又可能被 Daemon 因运行故障自动改写；全局 Soul、Team 成员关系和 Project Posting 的身份边界不完整；Workspace 有名词和字段，却缺少获取、并发写、合并、冲突、恢复和归档闭环；Artifact 仍可能按标题误合并版本；Runs 已在原型中成立，却没有稳定的正式入口。

从 Principal 的视角，这些问题会表现为同一件工作在 Chat、Board、Runs、Workspace、Artifacts 与 Inbox 之间没有可靠的因果链：用户无法确定谁正在负责、执行为何阻塞、业务状态是否被系统误改、产物来自哪次执行、验收对照的是哪个版本、离开后运行能否可靠恢复。原型已经证明顶层 IA 可用，但尚未证明真实 Daemon、Session、Claim、Workspace、Artifact 与 Approval 能形成可恢复、可审计、无双跑的端到端产品闭环。

Hearth 需要停止继续探索顶层 IA，修复当前设计冲突，并以最终对象模型一次性交付 Project Chat 完整闭环，而不是先实现临时 Work/Session 模型后再次迁移。

## Solution

Hearth 将 Project 作为长期工作的中心容器，用户进入 Project 默认落在 Chat。Project 内提供 Chat、Board、Runs、Artifacts、Workspace、Team、项目设置七个稳定 section，Rail 负责跨 Project 切换、Inbox 与全局设置。

自由协作与受控执行明确分离：Thread 承载自由讨论、@协作和由隔离 Session 构成的接力链；WorkflowRun 固定 WorkflowDefinition 版本、Step DAG、Attempt、审批、结果和诊断。Team 提供 Soul、Posting、skills 与权限，不作为运行模式。Session 必须明确归属 Thread Turn 或 Workflow Attempt，二者互斥。

Issue 只承载承诺推进的业务工作、负责人、验收清单、评论与业务状态。Claim、Session、Run 和 Approval 的运行状态与 Issue.status 正交；Daemon 不因运行故障自动改写业务状态，而通过执行诊断、Board 角标和 Inbox 浮现。Soul 或 Principal 使用 tracker 显式推进 Issue。

Workspace 成为真正可执行、可恢复的沙箱对象，具备 owner、锁、路径策略、worktree、合并事务、冲突处理和归档语义。Artifact 归 Project 所有，版本 append-only，通过稳定标识追加，记录 Thread Session 或 Workflow Attempt、Workspace 与 commit 溯源。Review 固定引用具体 ArtifactVersion，避免 current 指针变化造成验收漂移。

所有关键行为通过一个最高层测试 seam 闭环验证：Daemon 应用命令驱动持久事件与聚合状态，再生成 Chat、Board、Runs、Artifacts、Workspace、Inbox 读模型。UI 只补关键用户路径的浏览器冒烟，不复制业务状态机。

## User Stories

1. As a Principal, I want to see all Projects in one grid, so that I can enter the right long-term body of work without first choosing an Issue or Team.
2. As a Principal, I want entering a Project to open Chat by default, so that conversation and delegation remain the primary interaction.
3. As a Principal, I want Chat, Board, Runs, Artifacts, Workspace, Team, and project settings to have stable Project-level entries, so that every durable object has a predictable home.
4. As a Principal, I want Inbox to aggregate only events that need my attention across Projects, so that I can leave while work continues and return to a quiet, actionable list.
5. As a Principal, I want to create a Thread without creating an Issue, so that exploratory questions and casual collaboration stay lightweight.
6. As a Principal, I want to promote useful Thread context into an Issue explicitly, so that exploration does not silently become committed work.
7. As a Principal, I want to create an Issue without immediately starting execution, so that planning and commitment can precede delegation.
8. As a Principal, I want an eligible Issue to be automatically claimed once, so that a Team can pull work without duplicate execution.
9. As a Principal, I want to manually trigger an unclaimed Issue, so that I can start urgent work without waiting for the scheduler.
10. As a Principal, I want an Issue to show when it is awaiting claim, claimed, running, blocked by execution, or awaiting review without conflating those signals with its business status, so that I understand both commitment and runtime truth.
11. As a Principal, I want Provider or Workspace startup failures to leave Issue.status unchanged, so that infrastructure failures do not rewrite business intent.
12. As a Principal, I want a Soul to explicitly move an Issue to In Progress or In Review through the tracker, so that business transitions are auditable actions.
13. As a Principal, I want to change Issue.status myself, so that I retain final control over business truth.
14. As a Principal, I want cancelled Issues to remain discoverable but leave the active Board, so that history is preserved without clutter.
15. As a Principal, I want backlog work separated from actionable Todo work, so that automatic claiming only considers work that is ready.
16. As a Principal, I want every Issue to have Acceptance items when completion needs proof, so that “done” has an explicit meaning.
17. As a Principal, I want Acceptance items to support manual and command checks, so that human judgment and deterministic verification can coexist.
18. As a Principal, I want Review to pin a specific Artifact version, so that the evidence cannot change while I am evaluating it.
19. As a Principal, I want a failed Review to create an Issue comment or reopen work without destroying prior evidence, so that correction remains traceable.
20. As a Principal, I want to bundle open issue comments into one Goal Issue, so that related defects can be fixed as a coherent batch rather than fragmented cards.
21. As a Principal, I want normal discussion comments excluded from Bundle by default, so that notes do not accidentally become acceptance criteria.
22. As a Principal, I want to @ a Project Posting in a Thread, so that the selected Soul uses the correct project-specific role, skills, memory, permissions, and Provider override.
23. As a Principal, I want each Soul handoff to start an isolated Session, so that roles and transcripts do not blur together.
24. As a Principal, I want the handover to include a concise summary, Artifact references, and relevant paths rather than another Soul’s full tool trace, so that context stays bounded and auditable.
25. As a Principal, I want the Thread to show the current responsible Soul and the sequence of handoffs, so that I can understand who owns the next action.
26. As a Principal, I want to view a multi-Soul Thread as relay segments, a conversation flow, or a compact track, so that I can choose the right level of detail.
27. As a Principal, I want single-Soul Threads to remain visually simple, so that lightweight work does not inherit unnecessary orchestration UI.
28. As a Principal, I want the same Provider type to be usable by multiple Souls through separate Sessions, so that model choice does not weaken role isolation.
29. As a Principal, I want detach to leave running Sessions alive, so that closing the UI does not cancel work.
30. As a Principal, I want to resume, steer, or cancel an active Session from Hearth, so that long-running work remains controllable.
31. As a Principal, I want stalled Sessions detected from missing events and heartbeats, so that “running” never hides a dead process indefinitely.
32. As a Principal, I want retry attempts to be explicit and bounded, so that recovery does not burn budget silently.
33. As a Principal, I want a completion, failure, need-input request, or hard gate to appear as a structured event rather than assistant prose, so that runtime truth does not pollute the transcript.
34. As a Principal, I want to create a WorkflowRun from Runs, an Issue, Automation, or a Thread, so that controlled execution does not depend on Chat.
35. As a Principal, I want creating a Run from a Thread to preserve the Thread unchanged and record it only as a source or Discussion link, so that conversation and execution keep independent lifecycles.
36. As a Principal, I want to preview a Run plan before starting it, so that WorkflowDefinition version, role bindings, Workspace plan, permissions, and inputs are visible.
37. As a Principal, I want a started Run to preserve an assignment snapshot, so that later Team edits do not rewrite execution history.
38. As a Principal, I want unexecuted Steps to be reassignable with an audit event, so that a Run can adapt safely.
39. As a Principal, I want changing the Team after Steps have executed to require fork or re-plan, so that completed evidence remains coherent.
40. As a Principal, I want AI, Command, and Approval Steps to have distinct behavior, so that deterministic work does not consume an LLM and human gates cannot be bypassed.
41. As a Principal, I want every Step retry to create a distinct Attempt, so that logs, costs, Workspace changes, and results remain attributable.
42. As a Principal, I want StepResult to unlock downstream Steps, so that Workflow progress depends on structured results rather than conversational claims.
43. As a Principal, I want Run Steps as the default view and Graph as an alternate diagnostic view, so that simple flows remain readable and complex dependencies remain inspectable.
44. As a Principal, I want Chat to show only an associated Run summary, current blocker, and link, so that Chat preserves intent continuity without becoming a second Run controller.
45. As a Principal, I want a Discussion Thread to remain optional for a Run, so that automation can execute without manufacturing conversation.
46. As a Principal, I want pausing or cancelling a Run to leave any Discussion Thread intact, so that decisions and context are not lost.
47. As a Principal, I want Approval grant or deny to be idempotent, so that retries and double clicks cannot resume a Step twice.
48. As a Principal, I want dangerous actions such as publishing, pushing, deleting, or changing credentials to stop before side effects, so that governance is preventative rather than retrospective.
49. As a Principal, I want an unavailable pre-tool gate to disable the dangerous capability, so that an adapter cannot claim safety it cannot enforce.
50. As a Principal, I want the same Approval accessible from its execution context and Inbox, so that there is one gate with multiple projections rather than duplicate gates.
51. As a Principal, I want Project Team to show each Posting’s source Team, role, autonomy, skills, permissions, memory slice, and Provider override, so that project-specific identity is inspectable.
52. As a Principal, I want one global Soul identity to participate in multiple Teams, so that persona and voice remain stable across organizational contexts.
53. As a Principal, I want Team membership separated from Project Posting, so that belonging to a Team does not automatically grant access to every Project.
54. As a Principal, I want duplicate Postings for the same Soul in one Project prevented, so that permissions from multiple Teams are not silently merged.
55. As a Principal, I want to choose the source Team when the same Soul is available through multiple Teams, so that Project defaults and accountability stay explicit.
56. As a Principal, I want global Soul edits to warn that every Team and Project may be affected, so that identity changes are intentional.
57. As a Principal, I want Project Posting changes to affect only that Project, so that local role and permission adjustments do not leak globally.
58. As a Principal, I want Session startup to resolve Provider from explicit override, Thread or Run context, Posting, Member default, and global default in a fixed order, so that engine selection is predictable.
59. As a Principal, I want local-only privacy mode to reject cloud Providers before Session creation, so that privacy policy cannot silently degrade.
60. As a Principal, I want Provider fallback only when no explicit override was chosen, so that deliberate model selection is respected.
61. As a Principal, I want every running Session to show its owner, Provider, cwd, Project, budget, and last event time, so that Live HUD is operationally useful.
62. As a Principal, I want a Thread Session and Workflow Attempt Session to use explicit mutually exclusive ownership, so that costs, events, cancellation, and recovery resolve to one execution context.
63. As a Principal, I want direct Project Workspace writing limited to one writer, so that concurrent Sessions cannot corrupt the same tree.
64. As a Principal, I want concurrent writing to use isolated worktrees, so that independent attempts remain safe and mergeable.
65. As a Principal, I want a Workflow AI Attempt to receive its own worktree by default, so that retry and verification evidence are isolated.
66. As a Principal, I want retry to create a fresh Attempt and Workspace unless checkpoint recovery is explicitly chosen, so that stale partial state is not mistaken for a clean retry.
67. As a Principal, I want Workspace acquisition to validate repository cleanliness, locks, and path policy before execution, so that failures happen before edits.
68. As a Principal, I want out-of-policy writes rejected or gated, so that a Soul cannot expand its blast radius through prompts.
69. As a Principal, I want Workspace merging to use prepare, verify, and apply stages, so that validation occurs before source state changes.
70. As a Principal, I want merge conflicts to enter awaiting-merge and notify Inbox, so that Hearth never resolves destructive conflicts silently.
71. As a Principal, I want an archived Workspace to preserve Artifact readability, so that durable products never depend on a temporary worktree remaining mounted.
72. As a Principal, I want Workspace to expose files, diffs, owner, cwd, policy, lock, and merge state, so that the section represents the real execution sandbox rather than a generic file browser.
73. As a Principal, I want to publish a new Artifact with a stable identity, so that later executions can safely add versions.
74. As a Principal, I want Artifact versions appended rather than overwritten, so that I can compare, audit, and restore prior results.
75. As a Principal, I want title, path, and hash matching to suggest but not automatically merge Artifacts, so that two items named “report” do not corrupt one version chain.
76. As a Principal, I want an ArtifactVersion to record its producing Thread Session or Workflow Attempt, Workspace, Member, and commit when available, so that provenance is complete.
77. As a Principal, I want deleting a Thread, Run, or Issue not to delete Project-owned Artifacts, so that durable products outlive execution records.
78. As a Principal, I want novel and document Artifacts rendered in a Reader, so that long-form output is readable in place.
79. As a Principal, I want image Artifacts rendered in a Gallery with version comparison, so that visual changes are reviewable.
80. As a Principal, I want video and audio Artifacts rendered in a Player, so that media output can be reviewed without leaving Hearth.
81. As a Principal, I want app and code Artifacts to provide live preview or a safe fallback, so that runnable work is inspectable without assuming every preview can start.
82. As a Principal, I want dataset and report Artifacts to have structured views, so that tabular and JSON output is not reduced to downloads.
83. As a Principal, I want unknown media to fall back to metadata and file export, so that unsupported types never become dead ends.
84. As a Principal, I want export to read a fixed version without changing Artifact state, so that downloading is safe and repeatable.
85. As a Principal, I want external publishing separated from export and protected by a hard gate, so that local access does not imply permission to distribute.
86. As a Principal, I want a new Artifact version to set unseen and create a Project indicator and Inbox event, so that completed output is discoverable after I return.
87. As a Principal, I want previewing the new version to clear unseen idempotently, so that attention state reflects what I have actually reviewed.
88. As a Principal, I want the Chat inspector collapsed by default when a Thread has no Artifact, so that discussion has enough space.
89. As a Principal, I want my inspector choice remembered per Project, so that opening Files or Workspace does not cause unpredictable layout changes.
90. As a Principal, I want Board cards to show execution attention badges without deriving Issue.status from Session state, so that both truths remain visible.
91. As a Principal, I want Board status labels to map to stable API slugs, so that UI wording can evolve without data migration.
92. As a Principal, I want all read models sourced from Daemon state and events, so that the browser never becomes a competing source of truth.
93. As a Principal, I want Timeline events to contain actor, object, reason, idempotency key, and timestamps, so that every transition is explainable.
94. As a Principal, I want Daemon restart to reconstruct active Claims from journaled execution truth, so that local-first reliability survives process restarts.
95. As a Principal, I want Claim recovery to verify the underlying process before starting a replacement, so that lease expiry cannot create duplicate work.
96. As a Principal, I want scheduler eligibility and ordering to be predictable, so that ready work is claimed fairly within Team and Project concurrency limits.
97. As a Principal, I want all completion, Artifact publication, Claim release, and Inbox projection operations to be idempotent, so that retries do not duplicate output or notifications.
98. As a Principal, I want at least two Teams to operate concurrently with isolated knowledge and permissions, so that Hearth proves it is a personal Agent OS rather than a single universal agent.
99. As a Principal, I want a coding fixture to exercise writing, cross-model review, command verification, hard approval, Artifact publication, and Issue Review, so that the full system is proven on one coherent path.
100. As a Principal, I want a creative-work fixture to exercise Reader or media preview and multi-version Artifact review, so that the product is not validated only as a coding tool.
101. As a developer, I want domain integration tests to invoke public Daemon application commands, so that tests verify external behavior rather than implementation details.
102. As a developer, I want the same integration fixture to assert Chat, Board, Runs, Artifacts, Workspace, and Inbox projections, so that the system has one high-level test seam.
103. As a developer, I want fault injection at Provider start, Session exit, Approval resume, Workspace merge, and Daemon restart, so that failure recovery is tested at transaction boundaries.
104. As a developer, I want browser tests limited to critical navigation and action paths, so that UI coverage remains stable without duplicating domain state-machine tests.
105. As a developer, I want historical M0.3 and M0.4 designs clearly marked as superseded, so that implementation agents do not treat obsolete IA as current requirements.

## Implementation Decisions

- Project is the top-level product container and owns Issues, Threads, Artifacts, Workspaces, and Postings. Entering a Project opens Chat.
- Project has seven stable sections: Chat, Board, Runs, Artifacts, Workspace, Team, and project settings. Inbox and global settings remain cross-Project surfaces.
- Thread is exclusively the free-collaboration surface. It holds append-only messages, participants, responsibility, Thread Turn Sessions, and Thread Closeout. It has no persisted solo, team, or pipeline orchestration mode.
- WorkflowDefinition is versioned. WorkflowRun pins one version and owns Step state, Attempts, approvals, results, diagnostics, assignment snapshot, and Run Closeout.
- WorkflowRun may reference a source Thread, Discussion Thread, and Issue, but none are required. Linking a Run never transforms the Thread.
- Session ownership is a discriminated union: Thread Turn or Workflow Attempt. Exactly one owner is required. Provider, policy, Posting, Workspace, and owner are immutable after start.
- Step types are AI, Command, and Approval. AI creates a Session; Command runs deterministically without an LLM; Approval stops before the side effect.
- Team is a durable supply of Members, defaults, and skills, not an execution mode.
- Product language remains Soul; implementation uses global Member as its corresponding identity record. TeamMembership models Team inclusion. Posting models one Member’s Project-specific deployment.
- A Project may have only one active Posting per Member. If multiple Team memberships can supply that Member, Posting creation requires an explicit source Team.
- Posting stores Project-specific role, autonomy, skills, permissions, memory slice, and optional Provider override. Global persona and voice remain on Member.
- Issue business statuses are triage, backlog, todo, in_progress, blocked, in_review, done, and cancelled. Failed belongs to execution diagnostics, not Issue status.
- Only Principal or a Soul acting through the tracker may modify Issue.status. Daemon never changes it as a consequence of Provider, Claim, Session, Run, Approval, or Workspace state.
- Claim lifecycle remains orthogonal to Issue.status. Board may project execution badges while preserving the stored business status.
- Claim uniqueness is scoped by Issue and execution generation. An active generation has at most one Claim.
- Claim eligibility requires an actionable Issue, a resolvable Posting and Provider, satisfied dependencies, available concurrency, and no active Claim for the generation.
- Scheduler ordering uses explicit priority followed by creation time, with Team and Project concurrency limits.
- Claim transitions are journaled even if active scheduling state is held in memory. Restart recovery inspects journaled Sessions or Attempts, process health, and heartbeat before resuming, retrying, or releasing.
- Issue creation and Claim creation are separate operations. Claim, execution owner record, idempotent start key, and initial Timeline event must commit before launching a Provider.
- Thread @ messages append atomically before wake-up. Missing recipients or exhausted concurrency leave a queued wake-up rather than losing the message.
- Responsibility in a Thread is advisory by default. Handover changes Thread responsibility but does not automatically change Issue assignee; UI may offer an explicit synchronized update.
- Issue Acceptance is an Issue child. Thread Closeout and Run Closeout are separate execution summaries and do not imply Issue completion.
- Review binds Acceptance evidence to an immutable ArtifactVersion ID and optional command result IDs.
- Issue comments remain attached to Issues. Only open comments explicitly marked as issues participate in Bundle. Bundle creates one Goal Issue with Acceptance items linked back to source comments.
- Workspace owner is either Thread or Workflow Attempt. Project kind represents direct use of the Project root and permits one writer. Worktree and scratch provide isolated execution.
- The initial implementation supports project, worktree, and scratch Workspace kinds. Vault and remote are deferred.
- Workspace lifecycle is preparing, ready, in_use, awaiting_merge, archived, or error.
- Concurrent writers must use isolated worktrees. Workflow AI Attempts default to a dedicated worktree. Retry creates a new Attempt and Workspace unless explicit checkpoint recovery is selected.
- Workspace acquisition checks path policy, repository cleanliness, base commit, and lock before Provider startup.
- Workspace merge uses prepare, verify, and apply stages. Conflict stops in awaiting_merge and emits an Inbox event; no automatic destructive resolution is allowed.
- Artifact is Project-owned and survives deletion or archival of its source Issue, Thread, Run, Session, Attempt, or Workspace.
- Artifact publication uses explicit Artifact ID or a stable Project-scoped publish key. Title, path, and content hash may suggest a candidate but cannot automatically merge version chains.
- ArtifactVersion is append-only and records immutable content or a durable pointer plus hash. Provenance supports either Thread Session or Workflow Attempt and may include Workspace, Member, and commit.
- Workspace archival must not invalidate an ArtifactVersion. Content needed for Review or export is snapshotted or moved to durable Project-owned storage.
- Supported preview classes in the closed loop are Reader, Gallery, Player, Live Preview or code view, structured Data or Report view, and metadata/download fallback.
- Export is a local read of a fixed version. External publishing is a separate hard-gated action.
- New Artifact versions set unseen and produce Project and Inbox projections. Clearing unseen is idempotent and based on opening the fixed version.
- Desktop Chat uses a collapsible inspector. It defaults closed when no Artifact is associated and remembers manual open state per Project.
- Errors, approvals, need-input, costs, checkpoints, and completion are structured execution records, not assistant transcript text.
- Provider resolution follows a fixed precedence: privacy filter, explicit override, execution-context override, Posting override, Member default, global default, sole enabled Provider. Explicit choices do not silently fall back.
- Provider ID is immutable after Session start. Changing Provider creates a new Session or Attempt.
- Local-only privacy removes cloud Providers before resolution and fails closed when no local Provider remains.
- Dangerous actions require a pre-side-effect gate. Adapters unable to enforce the gate cannot expose those actions.
- Approval grant and deny use idempotency keys. Resume occurs exactly once and creates auditable events.
- Daemon is the sole authority. Web and CLI consume its commands, events, and read models rather than talking directly to Provider processes.
- The implementation must preserve the final object model from the first vertical slice. Temporary WorkItem objects and Thread pipeline modes are prohibited.

## Implementation Stack and Code Philosophy

- The closed loop is TypeScript-first: production Daemon, CLI, domain/application modules, SQLite adapters, Provider adapters, Agnes compatibility bridge, and React Web UI use strict TypeScript on Node.js 22 LTS. pnpm is the workspace/package manager; Vite is preferred for Web; Vitest and Playwright cover domain/integration and critical browser paths.
- The first implementation is a modular monolith with one authoritative `hearthd` composition root. Web, CLI, and tests use the same public application commands and queries; they do not talk directly to SQLite or Provider processes.
- SQLite is the only required durable database. Redis, Kafka, a remote database, and microservice decomposition are prohibited unless a later measured requirement and ADR justify them.
- The implementation follows NanoClaw's useful principles without copying its product model: small enough to understand, host-owned durable truth, single writer by construction, isolation enforced by code and operating-system facilities rather than prompts, credentials retained by the host, and adapter growth constrained by conformance contracts.
- Docker is not required, installed, or started by the Project Chat closed loop. Project, worktree, scratch, path policy, minimal child-process environments, Provider-native sandboxing, and Daemon pre-side-effect gates are the current controls. The product must not claim these controls provide container-equivalent isolation.
- `hearthd` owns transactions, policy, scheduling, approvals, Workspace and Provider lifecycle, and read models, but does not reimplement every Provider's internal agent loop. Provider-private protocol details stay behind the Provider adapter seam.
- Interfaces are deliberately deep and few. A public adapter seam is introduced only where at least two real implementations exist or where an external process protocol requires it. Domain nouns must not mechanically become packages or pass-through services.
- Provider credentials are read by a host-side credential broker or supported native authentication. Raw keys never enter domain events, transcripts, Workspace files, Artifact content, command-line arguments, or persisted child-process environment snapshots.
- Codex-to-Agnes testing uses a narrow host-side Responses-to-Chat compatibility bridge because Codex CLI requires the Responses protocol while Agnes currently succeeds through Chat Completions. The bridge must cover streaming, tools, tool results, usage, cancellation, and errors; a text-only translator is not accepted.
- Real Provider validation preserves two matrices: same model/different harness (`Pi + Agnes` and `Codex CLI + bridge + Agnes`) and different model/different harness (`Pi + Agnes` and `Codex CLI + a native Codex-route model`). Only the latter is described as cross-model review.
- Rust, Go, Python, native addons, or sidecars may be introduced only after profiling demonstrates a concrete Node.js limitation and a separate ADR defines the narrow seam. Domain state machines and read models must not be duplicated across languages.
- The detailed rationale and constraints are frozen in `docs/adr/0005-typescript-first-small-host-nanoclaw-principles.md`.

## Testing Decisions

- The preferred and nearly singular high-level test seam is: public Daemon application command to persisted events and aggregate state to Project read models.
- Good tests assert externally visible behavior, durable state, emitted events, idempotency, authorization, and recovery. They do not assert internal function calls, private class shape, SQL query order, component internals, or exact incidental HTML.
- Domain integration tests cover Project, Member, TeamMembership, Posting, Issue, Thread, WorkflowDefinition, WorkflowRun, Step, Attempt, Session, Claim, Workspace, Artifact, Approval, Acceptance, Comment, Timeline, and Inbox through public commands.
- Read-model tests use the same domain scenario to assert Chat, Board, Runs, Artifacts, Workspace, Team, Live HUD, and Inbox projections. Each projection must agree on identifiers and provenance.
- A primary coding scenario covers: enter Project, create Todo Issue, atomic Claim, create or bind main Thread, start a writer Session, publish a version, hand over to a different-model verifier Session, create a Run, execute AI and Command Steps, stop at Approval, grant exactly once, publish the reviewed version, move Issue to In Review, bind Acceptance evidence, and complete Review.
- A primary creative scenario covers: direct Thread, multiple Soul handoffs, Reader or Player Artifact, append-only versions, unseen Inbox event, fixed-version Review, export, and Issue creation from the Thread when commitment becomes explicit.
- Claim tests cover duplicate scheduler ticks, manual-versus-automatic races, concurrency exhaustion, lease or heartbeat expiry, Daemon restart, process still alive, process missing, retry backoff, and release.
- Issue tests prove that Provider failure, Claim failure, Session failure, Run failure, and Approval wait do not mutate Issue.status without a tracker command.
- Session tests prove owner exclusivity, immutable Provider, isolated transcripts, bounded handover context, cancellation, detach, resume, stall detection, retry, and cost attribution.
- Workflow tests cover Definition version pinning, assignment snapshots, dependency unlocking, parallel-ready Steps, AI/Command/Approval behavior, Attempt retries, deny, cancel, reassigning unexecuted Steps, and fork or re-plan after executed work.
- Approval tests cover double grant, repeated API delivery, grant after deny, resume crash, and restart recovery to demonstrate exactly-once side effects.
- Workspace tests cover dirty roots, lock contention, policy violations, worktree creation, fresh retry Workspaces, prepare/verify/apply, verification failure, merge conflict, cleanup, archive, and Artifact readability after archive.
- Artifact tests cover explicit create, stable publish-key idempotency, rejection of title-only auto-merge, version append, immutable Review evidence, provenance from both Session owner variants, preview fallback, export, unseen, and deletion independence.
- Posting tests cover one global Member in multiple Teams, Project-specific overrides, duplicate Posting prevention, explicit source Team choice, and permission composition.
- Fault injection targets the existing transactional seams: Provider start, Session exit, Claim journal commit, Artifact append, Approval resume, Workspace merge, Run StepResult commit, and Daemon restart.
- Browser smoke tests cover only four critical paths: Project to Chat and inspector behavior; Board Issue to automatic Claim and main Thread; Run Steps or Graph with Approval; Artifact fixed-version Review and Inbox clearing.
- Existing prior art is the Project Chat throwaway prototype: Project-first navigation, Chat and Run separation, Steps and Graph views, Gate interaction, and the OAuth scenario. It is treated as interaction prior art, not as proof of runtime correctness.
- Historical designs remain documentation fixtures only. Tests must target the current domain glossary and the latest ADR decisions.
- Completion evidence requires all domain integration suites, recovery and idempotency suites, and critical browser smoke tests to pass, plus a manual trace showing one coding and one creative closed loop from Project entry to reviewed Artifact.

## Out of Scope

- Cross-Team Handoff packages and automatic cross-Team transfer, planned for M4.
- Swarm execution, parallel Builder fan-out, and swarm merge policy, planned for M5.
- Remote, SSH, container, or cloud Workspace backends. Docker is not required by or included in the closed-loop implementation.
- Multi-human tenancy, organizations, cloud accounts, hosted collaboration, and SaaS administration.
- A global standalone Soul library in the UI; Soul identity remains reachable through Team and Posting contexts.
- Provider hot switching inside a Session or Attempt.
- Shared transcripts or one Provider conversation impersonating multiple Souls.
- Automatic Issue status mutation derived from runtime state.
- A standalone Home new-Artifact feed, Pulse homepage, or top-level Board universe.
- A full cross-Project Artifact library beyond Project grid rollups and Inbox events.
- Publishing and distribution pipelines beyond a hard-gated publish pointer.
- Artifact identity inferred solely from title, path, or hash.
- Vault Workspace as a first-class execution kind in the initial closed loop.
- Telos, life-ops product surfaces, morning briefs, and learning productization.
- Skill marketplace, executable Skill proposal flow, and third-party extension marketplace.
- Mandatory LangGraph or any other graph engine as the system heart.
- Rebuilding the throwaway prototype as production architecture or preserving obsolete M0.3/M0.4 pages for compatibility.
- Pixel-perfect dark mode, decorative animation, or additional visual themes.

## Further Notes

- The Project-centered, chat-first IA is considered settled. The work now is implementation-contract convergence and vertical-loop delivery, not another top-level navigation redesign.
- The OAuth prototype scenario remains the primary coding reference because it naturally includes writer/verifier separation, a Command Step, CSRF correction, hard approval, Artifact publication, and Review.
- The design corrections are recorded in the current convergence ADR. Where older main-axis prose conflicts with the domain glossary or newer ADRs, the glossary and ADRs take precedence until historical sections are fully rewritten.
- “负责人” must be qualified by context in implementation and UI: Issue assignee, Thread responsible Soul, Step owner, and Claim owner are distinct concepts. They may be displayed together but must never be stored as one overloaded field.
- “Blocked” may appear both as an explicit Issue business status and as an execution attention badge. The UI must visually and textually distinguish “业务已标记阻塞” from “执行正在等待审批/输入/资源”.
- The local-first requirement does not mean in-memory-only truth. Claims may execute from memory, but enough journaled evidence must exist to prevent duplicate work and reconstruct state after a Daemon restart.
- The closed loop is complete only when a user can leave during execution, restart Hearth if needed, return through Inbox, inspect the exact produced version and provenance, resolve a gate, and finish Acceptance without consulting Provider-native logs.
