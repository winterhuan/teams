# AGENTS.md

Hearth 是本地优先的个人 Agent 操作系统。领域语言见 [`CONTEXT.md`](./CONTEXT.md)；设计文档见 [`design/`](./design/)。

## Language

面向用户的回复与生成的文档始终使用中文。代码、命令、标识符以及必要的原文引用保持其原始语言。

## Agent skills

### Issue tracker

Issues 与 PRD 以本地 markdown 存放在 `.scratch/<feature>/`（本仓库无 git remote，走本地/单人工作流）。见 `docs/agents/issue-tracker.md`。

### Triage labels

五个标准角色，采用默认字符串（needs-triage / needs-info / ready-for-agent / ready-for-human / wontfix）。见 `docs/agents/triage-labels.md`。

### Domain docs

单上下文：仓库根的 `CONTEXT.md` + `docs/adr/`。见 `docs/agents/domain.md`。
