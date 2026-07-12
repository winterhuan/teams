# WorkflowRun 独立于 Thread，Team 不作为运行模式

原型与 OpenTeams、Agno、LangGraph 的对照表明，把 `pipeline` 写成 Thread 的 `orchestration` 会同时混淆对话生命周期、受控执行和团队选择。Hearth 因此把 **Thread 定义为自由协作面，把 WorkflowRun 定义为独立执行对象**：Run 固定引用 WorkflowDefinition 版本，可选保存 `source_thread_id`、`discussion_thread_id` 与 `issue_id`，但不要求存在 Thread；AI Step 的 Session 直接归属 Run/Step。

Team 只提供 Soul、Posting、skills 与权限，不是与 Workflow 对立的模式。所谓“从 Team 切到 Workflow”实际是从现有 Thread 创建一个新 Run；所谓“回到 Team”是打开或创建 Run 的 Discussion Thread，Run 自身继续、暂停或取消，不发生模式回滚。Run 开始前可更换 Team/角色绑定；开始后固定 assignment snapshot，改队或改已执行步骤必须 fork/re-plan，未执行 Step 的改派需要审计事件。

代价是 Thread 不再充当所有执行的统一账本，Session owner 需支持 `thread_turn` 与 `workflow_attempt` 二选一；换来的是 Chat、Run、审批和诊断拥有清晰生命周期，并允许 Automation、Issue 或 Runs 页面在没有 Thread 时直接启动 WorkflowRun。
