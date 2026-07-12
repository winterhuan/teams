# Project Chat 完整闭环：Issue Map

Status: ready-for-agent

本目录将 [PRD](../PRD.md) 拆为 52 个可领取的 tracer-bullet issues。编号表达推荐交付顺序；每张 issue 的 `Blocked by` 才是实际依赖合同。所有运行能力从第一刀起使用最终对象模型。

## Provider 验收合同

- **Level 1 — 确定性领域测试：** 状态机、事务、幂等、并发、故障注入；允许 fake adapter。
- **Level 2 — 真实 Provider contract：** `pi` + `agnes-ai/agnes-2.0-flash`，以及真实 Codex CLI。
- **Level 3 — 真实多 Provider acceptance：** Pi 与 Codex 的独立 Session、handover、fallback、review、retry/reassign。
- **Level 4 — 真实系统场景：** OAuth 编码闭环与创作闭环。

Fake Provider 不能充当 Level 2–4 的完成证据。Hearth Provider（Pi/Codex）与 Provider 内部 model route（例如 Agnes）必须分开记录和展示。

## Issues

- [01. 建立 Daemon 命令、事件日志与 Project 读模型 seam](01-daemon-command-event-read-model-seam.md) — Blocked by: 无；Stories: 92–93, 101–102
- [02. 用真实 Pi + Agnes 启动首个 Thread Session](02-real-pi-agnes-thread-session.md) — Blocked by: 01；Stories: 5, 29, 33, 58, 61–62
- [03. 让真实 Pi Session 执行结构化工具调用](03-real-pi-tool-calls.md) — Blocked by: 02；Stories: 30, 33, 48–49, 61
- [04. 建立 Provider Registry、Model Route 与健康状态](04-provider-registry-model-route-health.md) — Blocked by: 02；Stories: 58–61, 92
- [05. 接入第二个真实 Hearth Provider：Codex CLI](05-real-codex-cli-provider.md) — Blocked by: 04；Stories: 28, 58, 60, 62, 98
- [06. 验证 Provider 解析优先级与显式覆盖](06-provider-resolution-precedence.md) — Blocked by: 04, 05；Stories: 58–60
- [07. 实现真实 Provider fallback 与失败诊断](07-provider-fallback-diagnostics.md) — Blocked by: 06；Stories: 10–11, 32, 58–60, 90
- [08. 验证 Pi 与 Codex 的跨 Provider Session 接力](08-cross-provider-session-relay.md) — Blocked by: 05, 06；Stories: 23–24, 28, 62, 98
- [09. 创建全局 Soul 并加入多个 Team](09-global-soul-multi-team-membership.md) — Blocked by: 01；Stories: 52–53, 56, 98
- [10. 将 Team 派驻到 Project 并生成 Posting](10-project-posting-source-team.md) — Blocked by: 09；Stories: 22, 51, 53–57
- [11. 通过 Posting 解析真实 Provider 和权限](11-posting-provider-permission-resolution.md) — Blocked by: 04, 10；Stories: 22, 51, 57–60
- [12. 在 Thread 中 @Posting 并可靠唤醒 Soul](12-mention-posting-reliable-wakeup.md) — Blocked by: 03, 11；Stories: 22–25
- [13. 实现负责人、接手与交回](13-thread-responsibility-handoff.md) — Blocked by: 12；Stories: 23–27
- [14. 实现 Team 内 Pi/Codex 跨 Provider 复核](14-team-cross-provider-review.md) — Blocked by: 08, 13；Stories: 23–28, 98–99
- [15. 验证两个 Team 在同一 Project 的隔离交互](15-multi-team-project-isolation.md) — Blocked by: 10, 12；Stories: 51–57, 98
- [16. 建立 Team 并发、队列与公平调度](16-team-concurrency-fair-queue.md) — Blocked by: 12, 15；Stories: 8–10, 22, 29, 96, 98
- [17. 创建 Issue、Acceptance 与显式业务状态](17-issue-acceptance-explicit-status.md) — Blocked by: 01；Stories: 6–7, 12–17, 90–91
- [18. 原子 Claim Issue 并启动真实 Pi Session](18-atomic-claim-real-pi-session.md) — Blocked by: 11, 16, 17；Stories: 8–11, 15, 94–97
- [19. 让 Soul 通过 tracker 推进 Issue](19-tracker-driven-issue-progression.md) — Blocked by: 18；Stories: 10–13, 16–17, 90
- [20. 实现 Issue 评论、Bundle 与 Goal Issue](20-issue-comments-bundle-goal.md) — Blocked by: 17；Stories: 19–21
- [21. 创建 WorkflowDefinition 与 Plan Preview](21-workflow-definition-plan-preview.md) — Blocked by: 10, 17；Stories: 34, 36–40
- [22. 从 Runs 页面启动无 Thread WorkflowRun](22-runs-direct-workflow-start.md) — Blocked by: 05, 21；Stories: 34, 37, 40–43, 45
- [23. 从 Thread 创建 Run，但不转换 Thread](23-thread-create-run-without-conversion.md) — Blocked by: 12, 21；Stories: 34–35, 44–46
- [24. 从 Issue 直接启动 WorkflowRun](24-issue-direct-workflow-run.md) — Blocked by: 17, 21；Stories: 7, 16, 34, 36
- [25. 执行真实 AI Step 与 StepResult](25-real-ai-step-attempt-result.md) — Blocked by: 22；Stories: 37–42, 58, 61–62
- [26. 执行真实 Command Step](26-deterministic-command-step.md) — Blocked by: 25；Stories: 40–42, 69
- [27. 执行 exactly-once Approval Step](27-exactly-once-approval-step.md) — Blocked by: 25；Stories: 47–50, 85
- [28. 支持 Attempt retry 与 Provider 改派](28-attempt-retry-provider-reassignment.md) — Blocked by: 05, 25；Stories: 32, 38–41, 58, 60
- [29. 完成 Runs Steps、Graph、Discussion 与 Logs 交互](29-runs-steps-graph-discussion-logs.md) — Blocked by: 23, 25, 26, 27, 28；Stories: 43–46, 50, 61
- [30. 完成 Workflow Closeout 与 Issue Review 交接](30-workflow-closeout-issue-review-handoff.md) — Blocked by: 19, 26, 27, 29；Stories: 16–19, 42, 44
- [31. Thread Session 直接 Project Workspace 单写者闭环](31-thread-project-workspace-single-writer.md) — Blocked by: 03, 12；Stories: 63, 67, 72
- [32. Workflow Attempt worktree 获取闭环](32-workflow-attempt-worktree-acquisition.md) — Blocked by: 25, 31；Stories: 64–67, 72
- [33. Workspace 路径策略与越界硬门](33-workspace-path-policy-hard-gate.md) — Blocked by: 31, 32；Stories: 67–68
- [34. Workspace prepare / verify / apply 合并](34-workspace-merge-prepare-verify-apply.md) — Blocked by: 26, 32, 33；Stories: 69, 72, 99
- [35. Workspace merge conflict 与 Inbox 处理](35-workspace-merge-conflict-inbox.md) — Blocked by: 34；Stories: 4, 70, 72
- [36. 发布 Reader Artifact 并预览](36-reader-artifact-publish-preview.md) — Blocked by: 03, 31；Stories: 71, 73–78, 83
- [37. Artifact 稳定 publish key 与幂等版本追加](37-artifact-publish-key-idempotency.md) — Blocked by: 36；Stories: 73–75, 97
- [38. Artifact 固定版本 Review](38-artifact-fixed-version-review.md) — Blocked by: 17, 30, 37；Stories: 16–19, 74, 76
- [39. 实现 Image Gallery 与版本比较](39-image-gallery-version-compare.md) — Blocked by: 37；Stories: 79, 83
- [40. 实现 Video / Audio Player](40-video-audio-player.md) — Blocked by: 37；Stories: 80, 83
- [41. 实现 App / Code 安全 Live Preview](41-app-code-safe-live-preview.md) — Blocked by: 33, 37；Stories: 48–49, 81, 83
- [42. 实现 Dataset / Report 结构视图](42-dataset-report-structured-view.md) — Blocked by: 37；Stories: 82–83
- [43. 实现 Artifact unseen 与 Inbox 回声](43-artifact-unseen-inbox-echo.md) — Blocked by: 36, 37；Stories: 4, 86–89, 97
- [44. Artifact export 与硬门 publish](44-artifact-export-publish-hard-gate.md) — Blocked by: 27, 37；Stories: 48–50, 83–85
- [45. Session detach / resume / steer / cancel](45-session-control-detach-resume-steer-cancel.md) — Blocked by: 02, 05, 12；Stories: 29–30, 61–62
- [46. Session stall 与真实 Provider retry](46-session-stall-retry-diagnostics.md) — Blocked by: 16, 28, 45；Stories: 10–11, 31–33, 90, 103
- [47. Claim 重启重建与底层进程核验](47-claim-restart-process-reconciliation.md) — Blocked by: 18, 46；Stories: 94–97, 103
- [48. WorkflowRun 重启恢复](48-workflow-run-restart-recovery.md) — Blocked by: 25, 26, 28, 47；Stories: 37, 41–42, 46–47, 94, 97, 103
- [49. Approval resume 崩溃恢复](49-approval-resume-crash-recovery.md) — Blocked by: 27, 48；Stories: 47–50, 85, 97, 103
- [50. OAuth 编码场景端到端验收](50-oauth-coding-end-to-end.md) — Blocked by: 14, 19, 30, 34, 38, 44, 47, 48, 49；Stories: 18, 22–24, 34–50, 58–70, 73–77, 85, 90, 94–99, 101–104
- [51. 创作场景端到端验收](51-creative-work-end-to-end.md) — Blocked by: 08, 13, 36, 38, 39, 40, 42, 43, 44, 45；Stories: 5–6, 18, 22–30, 71, 73–87, 98, 100–104
- [52. 历史合同清理与完整回归](52-historical-contract-cleanup-full-regression.md) — Blocked by: 50, 51；Stories: 1–3, 92, 105

## 里程碑

- **01–08：** 最小真实执行脊与双 Provider。
- **09–16：** Soul、Team、Posting 与交互隔离。
- **17–20：** Issue、Claim、Acceptance 与 Board。
- **21–30：** WorkflowDefinition、Run、Step、Approval 与 Closeout。
- **31–35：** Workspace 获取、策略、合并与冲突。
- **36–44：** Artifact 发布、版本、预览、Review 与 gate。
- **45–49：** Session、Claim、Run 与 Approval 恢复。
- **50–52：** OAuth、创作端到端与最终收敛。
