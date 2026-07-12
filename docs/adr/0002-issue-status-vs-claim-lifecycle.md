# Issue 业务状态与 Claim 调度状态分为两层，agent 用工具推进业务态

去 WorkItem 后（见 [ADR 0001](./0001-remove-workitem-thread-as-execution.md)），原来 WorkItem 的单一 FSM 拆成两条正交的状态线，照 Symphony 的边界（`analysis/symphony-分析.md` §4.1「内部 Claim 状态 ≠ Linear 状态」）：

1. **Issue 业务状态**（Triage / Todo / In Progress / In Review / Blocked / Done）= 工作的权威真相，与 Linear issue 状态一致。**只由在 Thread 里干活的 Soul 用 tracker 工具推进**；Daemon 绝不硬编码业务转移。成功常止于 In Review 交接态，不必到 Done。
2. **Claim 生命周期**（Unclaimed → Claimed → Running → RetryQueued/Blocked → Released）= 团队自动拉取时的调度/认领状态，由 Daemon 持有（可为内存态，重启从 Issue 真相重建）。管"谁在跑 / 防重复派发 / 重试与释放"，与业务状态正交。

**取舍：** 业务逻辑不进 Daemon，策略留在 skill / prompt 层（对齐 Symphony「tracker 写入由 coding agent 用工具完成，orchestrator 不硬编码业务规则」）。代价是 Soul 必须被 skill 教会"干完用工具把 Issue 挪到 In Review"，否则 Issue 会滞留——Symphony 用 `WORKFLOW.md` + `linear` skill 解决同一问题。

**明确不做：** Daemon 代推业务状态（如硬门通过自动 In Progress）；Issue 状态从关联 Thread 聚合派生；Thread 背第二套业务 status（Thread 只承载执行/接力链，业务真相只在 Issue 一处）。
