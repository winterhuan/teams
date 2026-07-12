# 去除 WorkItem：Thread 承载执行，Issue 降为松耦合追踪卡

> Workflow 边界已由 [ADR 0003](./0003-workflow-run-independent-from-thread.md) 修订：Thread 只承载自由协作与接力执行；受控 DAG 执行由独立 WorkflowRun 承载。

在 M0.5.0 chat-first 转向后，WorkItem 作为"唯一耐久工作对象 / 执行账本"已被 Thread 架空：Session 挂在 Thread 上（`session_id = thread_id-turn_id`），接力链、随手无 Issue 对话、跨模型复核都发生在 Thread 里。据此去除 WorkItem 概念，把它原来的职责一分为二——**执行与对话账本、Session 接力链、Artifact 溯源 → Thread**；**Board 状态 FSM、负责人、验收清单、硬门 → Issue**。Issue 与 Thread 松耦合：默认一个 Issue 对应一条 Thread（接力靠 Thread 内的 Session chain），不硬性限制多条；一条 Thread 也可无 Issue（随手对话）。"issue↔chat 松耦合"由此才真正成立。

放弃的是 Linear 式"单一 work 真相对象"带来的统一性；换来的是 chat-first 下对话作为一等执行载体、Issue 只做轻量追踪的清晰分层。

同时 M1 / M2 / M3 里程碑合并为一个正式开发阶段：**Project Chat 完整闭环**。该阶段完整交付 Thread、接力链、无 Issue 随手对话、多队、pipeline、Workspace、Review 与多 medium Artifact，不再允许以旧阶段边界交付临时对象模型。Handoff（跨队）与 swarm 仍属后续 M4 / M5。
