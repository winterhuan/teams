# Hearth Domain

Hearth 是本地优先的个人 Agent 操作系统。它以 Project 组织长期工作，以 Daemon 保存权威状态，让不同 Soul 通过可审计的隔离 Session 协作。Thread 承载自由协作，WorkflowRun 承载受控执行，Issue 是与两者松耦合的追踪卡。

## Language

### 容器与身份

**Project**:
一摊长期工作的中心容器，拥有 Issue、Thread、WorkflowDefinition、WorkflowRun、Artifact、Posting，并承载项目级团队派驻与配置。进入 Project 默认落在 Chat。
_Avoid_: Workspace、任务、Board 卡

**Team**:
一组稳定的 Soul 和默认 skills，描述"哪支队"。它提供执行者与能力，不是一种运行模式；被派驻到 Project 后由 Posting 参与 Thread 或 WorkflowRun。
_Avoid_: Project、临时群聊、Team 模式

**Soul**:
稳定的成员身份，跨 Project 保持 persona、voice 和默认 Provider；可同时属于多个 Team。实现合同中的对应名称是 Member。
_Avoid_: 独立 Soul 库、Posting

**Posting**:
一个 Soul 在一个 Project 中的派驻关系实体，拥有该项目专属的 role、autonomy、skills、权限矩阵和记忆切片。Posting 由 Project 所有；同一 Soul 派驻不同 Project 是不同 Posting。
_Avoid_: Soul、Team、全局成员配置

### 对话与执行

**Thread**:
一条耐久对话线，承载自由讨论、@协作与 Session 接力链。可由 Issue 发起，也可以是随手对话；可作为 WorkflowRun 的来源或旁路 Discussion，但不是 WorkflowRun 的容器。
_Avoid_: Issue、WorkItem、WorkflowRun、一次 Provider 运行

**Session**:
一个 Soul 通过一个 Provider 进行的一次隔离执行，绑定 cwd，拥有独立上下文，不与他人共享 transcript。它要么服务于 Thread 的一次接力，要么服务于 WorkflowRun 的一个 AI Step。
_Avoid_: Thread、聊天消息

**接力链**:
一条 Thread 上按顺序接力的 Session 序列（写 → 审 → 改），责任在 Soul 之间转移；每一段是一个 Soul 的独立 Session，彼此不共享上下文。
_Avoid_: 一个 agent 顺序重跑、群聊

**跨模型复核**:
接力链中把工作交给不同模型族（family）的 Soul 复核（如 Claude 写、GPT 审），用模型差异挡住盲区。
_Avoid_: 跨模型互审、球权轮转

**WorkflowDefinition**:
一个可版本化的受控执行定义，描述 Step、依赖、角色要求与门控，不绑定具体 Thread 或某次运行。
_Avoid_: WorkflowRun、Team、聊天模板

**WorkflowRun**:
WorkflowDefinition 某个固定版本的一次独立执行，拥有 Step 状态、Attempt、审批、结果与诊断；可选关联来源 Thread、Discussion Thread 和 Issue。
_Avoid_: Thread 模式、Chat 消息、WorkflowDefinition

**Step**:
WorkflowRun 中最小的可调度与可审计单元，类型为 AI、Command 或 Approval；AI Step 通过 Project Posting 解析具体执行者。
_Avoid_: Thread 消息、Issue 子任务

**自由协作**:
Soul 在 Thread 中通过 @、接手和交回推进工作的交互形态；参与人数可从一人自然增长到多人，不持久化为 solo/thread 模式枚举。
_Avoid_: Team 模式、Workflow

### 追踪与治理

**Issue**:
一件已承诺推进的工作，是 Board 上的追踪卡，与 Thread 和 WorkflowRun 松耦合。承载业务状态、负责人、验收清单与硬门；其业务状态是工作的权威真相，不从 Thread/Run 状态派生。
_Avoid_: Thread、WorkflowRun、Session、WorkItem、Project

**Claim 生命周期**:
团队自动拉取工作时的调度/认领状态，描述谁在跑、防重复派发、重试与释放；与 Issue 的业务状态正交。
_Avoid_: Issue 状态、Thread 状态、业务 FSM

### 产物与空间

**Artifact**:
Project 所有的耐久产物，带 medium、版本、预览和来源追踪（回指产出它的 Thread Session 或 Workflow Attempt）。
_Avoid_: 临时文件、Issue 附件

**Workspace**:
一次执行使用的可写沙箱。界面中的 Workspace section 是对 Project.root_path、Session.cwd 与文件产出的树状投影。
_Avoid_: Project、普通文件树 section

### 协作用语

**负责人**:
当前负责推进一条 Thread（或其关联 Issue）的 Soul。
_Avoid_: 球权、持球人

**接手 / 交回**:
Soul 之间转移当前责任的用户界面用语。
_Avoid_: 传球

### 跨项目

**Inbox**:
跨 Project 汇总需要 Principal 介入的事件，包括 @提及、硬门和执行完成回声。
_Avoid_: 首页、完整活动流
