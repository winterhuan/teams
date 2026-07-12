# 附录 — Loop Engineering 映射

> **隶属：** 主轴原则 #13  
> **性质：** 业界定位与词汇映射 — **不**引入新的聚合根  
> **产品能力** 落在已有对象：Team / Thread / Issue / Session / Acceptance / cron / Skills / Closeout  

---

## 1. 一句话

**Loop Engineering = 设计「找活 → 派活 → 执行 → 校验 → 记状态 → 决定下一步」的系统，由系统去戳 Agent，而不是人手写每一轮 prompt。**

它在 Harness **之上**：Harness 管单次运行环境；Loop 管何时再跑、跑到何时停、谁检查、状态落在哪。

来源（非专有产品）：Osmani *Loop Engineering*；LangChain 叠环；实践含 ReAct、Ralph-style fresh session、`/goal` 等。

---

## 2. 五件套 + 状态脊 → Hearth

| Loop Engineering 原语 | Hearth 已有落点 | 主轴锚点 |
|----------------------|-----------------|----------|
| Automations / Heartbeat | Daemon cron · life-ops 例行 | 调度；**不是**「Heartbeat 注册表」新根 |
| Worktrees | Session.worktree_path → 后 Workspace | annex/workspace |
| Skills | 全局/队 skills（纯文本）· Closeout 提案 | 记忆三档 · §8.5 |
| Plugins / connectors | Provider · MCP | 主轴 Provider |
| Sub-agents / maker–checker | Member · builder≠verifier · pipeline Step（含 command gate） | Team / collab · Archon |
| State spine | Issue + Acceptance + Thread/Session + 路径/Artifact + memory + checkpoint | 域模型 |
| Knowledge side-car | knowledge refresh no-op | OpenWiki · §6.11 |

**多 Team** = 多条可并行 loop 产线，共享 Daemon 与 Pulse 待决策。

---

## 3. 叠环四级 → Hearth

编号用 **E1–E4**（Engineering stack），**不要**与自主等级 **L0–L3** 或架构 **S0–S4** 混读。

```text
E4 Hill-climb   Closeout → skill/记忆提案 →（人批）改队知识
E3 Event/外环   cron · 路由 · 派队 · 并发 · 硬门队列
E2 Verify       Acceptance · verifier · StepResult
E1 Agent 内环   Provider Session · LoopState
```

| 级 | Hearth |
|----|--------|
| E1 Agent loop | loop_policy + LoopState |
| E2 Verification | verifier 角色 · 探针 · 禁止自审 |
| E3 Event-driven | cron → Issue + Thread · Inbox 仅人决策 |
| E4 Hill-climbing | Closeout · scars · skill 提案（M5） |

**Principal 的工作：** 少写下一句 prompt；多设计/批准停止条件、队编制、定时器，并在 Pulse 待决策做高杠杆判断。

---

## 4. 叙事示例（非新对象）

```text
1. cron / life-ops 读 CI 或日历 → Issue 候选，认领后创建/绑定 Thread
2. Router → team；根据入口继续 Thread 或打开 Workflow Plan Preview；解析 loop_policy
3. [L0] 批计划（若需要）
4. cwd / worktree 绑定
5. implement @builder Inner 至 Step/Session 出口
6. verify @verifier 对照 Acceptance
7. 可选开 PR 路径
8. Closeout · 可选 skill 提案进待决策
9. 明日 cron 读同一状态脊
```

---

## 5. 明确不升格的概念

| 说法 | 正确落点 |
|------|----------|
| Loop 模板 | TeamTemplate + `default_start` 建议 + WorkflowDefinition/Acceptance 样例 + cron 行 |
| Heartbeat 注册表 | config 里的 cron 列表 + Timeline；Ops 视图可展示 |
| Triage Inbox | Issue `triage`/`todo` + Inbox 待决策 |
| Loop OS 独立产品线 | **营销定位**，不是第二套域模型 |

---

## 6. 风险与对策

| 风险 | 对策 |
|------|------|
| Token 烧穿 | budget · max_turns · 日 cap · Live 成本 |
| 无人验证的完成 | verifier + Acceptance 证据 |
| 理解债务 | Closeout 摘要可强制人读（可配） |
| 认知投降 | Pulse 展示「你设计的条件」，鼓励改条件而非只点同意 |
| 环中环失控 | 队并发槽 · spawn depth 上限（后） |

---

## 7. 阶段（与主轴一致）

| 阶段 | 能力 |
|------|------|
| **Project Chat 完整闭环** | Inner 可观察 + 停止条件 + pause/halt；cron→Issue/Thread + 状态脊文件；pipeline maker–checker + worktree + 完整 Live |
| M4 | goal 预算 · Handoff · 发现类 automation |
| M5 | Hill-climb 提案 · Medic · 成本护栏 hardening |
