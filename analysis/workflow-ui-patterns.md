# Workflow UI 展示模式分析

更新时间：2026-07-12

## 结论先行

Hearth 当前原型的主要问题不是 Pipeline 的三种视图，而是把 **Project Chat 当成了 Pipeline 的永久容器**。一手参考呈现出更清晰的分层：

1. **Chat 是发起、补充上下文和旁路沟通入口，不是 Workflow 的唯一主界面。**
2. **Workflow Definition 与 Workflow Run 应独立。** 前者回答“流程如何编排”，后者回答“这一次跑到哪里、为何阻塞、产出了什么”。
3. **复杂执行的主视图是图/步骤画布，讨论只是可收起的旁路面板或关联 Thread。**
4. **审批与诊断具有跨 Run 的工作队列价值。** 它们既可在当前 Run 内就地处理，也应有独立的 Approvals / Traces 入口。
5. Hearth 最适合采用“Agno 的顶层分面 + LangGraph 的运行调试 + OpenTeams 的共享上下文”组合，而不是继续让 Pipeline 作为 Chat 消息的一种富内容形态。

## 对比总览

| 产品 | Workflow 与 Chat 的关系 | Workflow 主界面 | Run / Step / 日志 | 审批 / 重试 |
|---|---|---|---|---|
| OpenTeams | 同一 group session 内在 Free Chat 与 Workflow mode 间切换；共享上下文，但 Workflow 使用独立执行图 | 可见的 stateful execution graph | 节点显示状态、diff、日志、依赖和产物 | 计划先审批；节点 approve/reject/retry；最终 acceptance |
| Agno AgentOS | Chat 可运行 Workflow，但 Studio、Approvals、Traces、Sessions 是独立工作面 | Studio 拖拽画布；运行时可在 Workflow chat 看流式步骤 | Traces 提供树视图与瀑布时间线 | 独立 Approvals 队列，同时 Chat 内显示 pending；Run 暂停后继续 |
| LangSmith Studio | 同一 Studio 提供 Graph mode 与 Chat mode，两者是同一 Run/Thread 的不同观察方式 | Graph mode 是全功能执行/调试面；Chat mode 是轻量测试面 | 图节点、thread log、中间 state、Pretty/JSON、checkpoint | breakpoint 后 Continue；从 checkpoint re-run/fork；Chat 可重生成消息 |
| Antfarm（简） | Dashboard 面向 workflow/run 监控，不以 Chat 为信息架构中心 | Workflow/run dashboard | 实时 step progress 与 agent output | 官方 README 明确 run monitoring；交互细节证据有限 |
| Archon（简） | Web dashboard 同时提供 chat、run workflows、activity monitoring，属于并列能力 | YAML workflow DAG + dashboard | 多步 DAG、loops、gates、conditions | 官方材料确认 gates；具体 UI 操作证据有限 |

## 1. OpenTeams

### 展示模式

OpenTeams 是最接近 Hearth 当前产品语境的参考。官方 README 把产品描述为一个共享 session：用户既可以在 **Free Chat** 中自由协作，也可以切到 **Workflow mode** 处理复杂任务。两者共享团队与上下文，但 Workflow 不是聊天时间线中的一张卡，而是“visible workflow / stateful execution graph”。官方快速开始也明确写为先创建 group chat session，再在 Free Chat 与 Workflow mode 间切换。[官方 README](https://github.com/openteams-lab/openteams#work-mode)

Workflow 的典型过程是：Lead agent 澄清需求并生成计划；用户在执行前调整步骤、依赖和 agent 分配；执行后在图上观察节点；每个节点附带状态、diff 与日志；节点完成后可审批；失败时只重试该节点；全部通过后进行最终 review 与 acceptance。[官方 README：Common Use Cases](https://github.com/openteams-lab/openteams#common-use-cases)

官方截图也把 Free Chat 与 Workflow 分别展示为不同工作面，而非一张界面强制并排；README 说明 Workflow UI 使用 React Flow。[Free Chat 官方截图](https://github.com/openteams-lab/openteams/blob/main/readmes/images/free_chat.png) · [Workflow 官方截图](https://github.com/openteams-lab/openteams/blob/main/readmes/images/openteams-workflow.png) · [Tech Stack](https://github.com/openteams-lab/openteams#tech-stack)

### 对 Hearth 的启示

- 可以保留 Project Chat → “转为 Workflow / 查看 Run”的入口，并共享 Project、Issue、Thread context。
- 不应把 Chat transcript 作为 DAG 的布局骨架。进入 Workflow 后，画布才是主内容，Chat 降级为可开关的“讨论/干预”侧栏。
- OpenTeams 的优点是连续上下文；风险是 Free Chat / Workflow 仍位于同一 session mode 中，若 Hearth 完全照搬，仍可能混淆长期讨论与可审计执行。Hearth 应再向 Agno 学习，将 Workflow/Run 变成一等顶层对象。

## 2. Agno AgentOS / Studio

### 展示模式

Agno 的 Control Plane 把能力明确拆成多个工作面：Chat、Studio、Approvals、Tracing、Sessions、Knowledge、Schedules 等。Chat 页面允许在 Agents、Teams、Workflows 间切换；选择 Workflow 后提供输入，并实时观看 steps stream、输出和完成状态。换言之，Chat 是一个 **运行和体验入口**，不是 Workflow definition、审批和诊断的总容器。[AgentOS Control Plane](https://docs.agno.com/agent-os/control-plane)

Workflow Definition 在 Studio 中编辑。Studio 是独立的 live canvas，支持拖放 Step，并以属性面板配置 Agent、Team 或 custom executor；Step、顺序 Steps、Condition、Loop、Router、Parallel 可嵌套组合。[Studio Workflows](https://docs.agno.com/agent-os/studio/workflows)

Studio 的生命周期也是对象化的：Build → Save Draft / Publish → 在 Chat 中测试指定版本 → 查看 Traces / Debug → 管理版本。已发布版本不可变，draft 可编辑，版本页可 Restore 或 Set Current。[Studio Overview](https://docs.agno.com/agent-os/studio/introduction)

运行诊断不塞进 Chat：Tracing 有独立入口，Tree View 展示 span 父子关系，Waterfall View 展示时间、耗时与并行，span 包含模型调用、工具执行、token、延迟与错误。[Control Plane：Tracing](https://docs.agno.com/agent-os/control-plane#tracing)

审批采用“双入口”：危险 tool 触发后 Run 暂停并把 pending record 持久化；管理员可从独立 Approvals 页面查看 agent、tool、arguments、requesting user 并 approve/reject，也能在 Chat 中看到 approval required；解决后 Run 继续。[Approvals](https://docs.agno.com/agent-os/approvals/overview)

### 对 Hearth 的启示

- 顶层应有独立 `Workflows`（定义）和 `Runs`（执行实例），Project Chat 只显示关联状态、关键事件和跳转入口。
- `Approvals` 应成为 Inbox 的一种跨项目队列，同时在 Run 的阻塞 Step 中就地处理。
- `Traces` 不必成为普通用户的默认主界面；Run Step 先展示业务语义结果，展开后再进入 tree/waterfall/log diagnostics。
- Workflow definition 的版本与 WorkflowRun 必须分开，Run 固定引用启动时版本，避免编辑定义改变历史解释。

## 3. LangSmith Studio / LangGraph

### 展示模式

LangSmith Studio 是独立的 agent IDE，从 LangSmith 顶层 `Deployments → Studio` 进入，而不是从普通 Chat 导航进入。它同时提供 **Graph mode** 与 **Chat mode**：Graph mode 暴露节点遍历、中间 state、tracing/evaluation 等完整信息；Chat mode 面向聊天型 agent 的轻量行为测试。[Studio](https://docs.langchain.com/langsmith/studio) · [进入 Studio](https://docs.langchain.com/langsmith/quick-start-studio)

Graph mode 的典型结构是：图与输入位于主工作区，右侧 pane 选择 Thread 并显示 thread history/log；用户可以调节信息粒度、折叠 turns/nodes/state keys，并切换 Pretty/JSON。Chat mode 则让 thread 列表位于右侧、conversation 位于中央。[How to use Studio：Manage threads](https://docs.langchain.com/langsmith/use-studio#manage-threads)

运行控制以节点/checkpoint 为中心：可在指定节点 before/after 设置 Interrupt，暂停后在 thread log 中 Continue；运行中可以 Cancel；可以编辑节点 state 后 Fork，也可以不改 state 直接 `Re-run from here` 生成分叉 Run。Chat mode 的“重试 AI message”本质上同样生成 conversation fork，而不是覆盖历史。[How to use Studio：Run application](https://docs.langchain.com/langsmith/use-studio#run-application) · [Edit thread history](https://docs.langchain.com/langsmith/use-studio#manage-threads)

### 对 Hearth 的启示

- “Chat view”和“Graph view”可以是同一 WorkflowRun 的两种镜头，但 Graph 应是复杂 Run 的权威视图。
- Retry 不应原地抹掉旧结果；应创建 Step attempt / Run branch，并保留原 attempt，便于审计和比较。
- 右侧 Thread/Log pane 很适合 Hearth 的“旁路讨论”：它与当前选中 Step/Run 联动，但不决定画布结构。
- Pretty/JSON 的分层可转化为 Hearth 的“摘要 / 原始日志”，默认避免把 agent transcript 倾倒给用户。

## 4. Antfarm 与 Archon（补充证据）

Antfarm 官方 README 把 dashboard 定义为独立监控面：monitor runs、track step progress、view agent output in real time；workflow 本身以 YAML/Markdown 定义并保存在运行目录。因此它强化了“Workflow 定义 + Run dashboard”而非“Chat 即 Workflow”的方向，但官方公开材料对审批和单步重试 UI 的描述不足，不宜据此设计细节。[Antfarm 官方仓库](https://github.com/snarktank/antfarm)

Archon 官方 README/官网把 web dashboard 的 chat、running workflows、monitoring activity 描述为并列能力；Workflow 是 YAML 定义的多步 DAG，支持 loops、gates 和 conditions。这同样表明 Chat 是入口之一，而非 DAG 的布局容器。公开材料不足以证明其具体节点审批/重试交互，因此仅作架构佐证。[Archon 官方仓库](https://github.com/coleam00/Archon) · [Archon 官网](https://archon.diy/)

## 建议的 Hearth 信息架构

```text
Project
├── Chat                         日常讨论、发起/干预、关键事件回写
├── Issues                       追踪承诺与验收
├── Workflows                    定义、草稿、发布版本
│   └── Workflow Definition      DAG/步骤配置画布
├── Runs                         某次执行的历史与当前状态
│   └── Workflow Run
│       ├── Canvas               DAG/阶段/依赖/状态（默认主视图）
│       ├── Step Inspector       owner、input、result、artifact、attempt
│       ├── Discussion           关联 Thread，可收起的旁路面板
│       └── Diagnostics          logs / trace tree / timeline
└── Inbox
    └── Approvals                跨 Run 的待处理队列
```

### 原型应怎样改

1. 三种 Pipeline 展示继续保留，但把它们移动到独立 `Run` route；不再把 Chat column 作为三种方案的固定组成。
2. 默认方案建议改为：左侧 Run/Step 导航，中间 DAG/阶段画布，右侧 Inspector；右侧 Inspector 内用 tabs 切 `Result / Discussion / Logs`。
3. Project Chat 只回写少量结构化事件：`Run created`、`Approval requested`、`Run blocked`、`Run completed`，每条事件可跳转到 Run/Step。
4. 从 Chat 发起 Workflow 时先打开 Plan Preview；确认后创建独立 WorkflowRun。Run 保留 `source_thread_id`，Thread 保留 `linked_run_id`，但二者不是父子 UI。
5. Approval 同时出现在阻塞节点和 Inbox；Retry 创建新 attempt 并保留旧 attempt；Re-plan 创建新的 Run branch/version，不能覆盖原图。
6. “对话式 Workflow”只作为简单线性流程的可选镜头。只要出现并行、条件、循环、跨 workspace、多个审批或失败分支，就自动以 Run Canvas 为权威视图。

## 最终判断

可以借鉴 OpenTeams 的“共享上下文与模式提升”，但不应照搬其“同一 session 内硬切模式”；应采用 Agno 的对象与顶层工作面拆分，并采用 LangSmith Studio 的 Graph/Chat 双镜头及 checkpoint/fork 语义。

因此，Hearth 的产品关系应是：

> **Chat 连接 Workflow，但不包含 Workflow；Workflow 产生 Run；Run 关联 Discussion。**

这既保留 Project Chat 作为协作入口，也让 Pipeline 获得独立、可审计、可扩展的执行空间。
