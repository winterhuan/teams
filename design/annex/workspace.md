# 附录 — Project · Workspace · Artifact 分工

> **隶属：** [`../personal-agent-os.md`](../personal-agent-os.md) §6.1 / §6.2.1 / §6.5.7 / §9  
> **M0.5.0 收敛：** **Project = 所有者**；**Artifact = Project 所有的耐久产物**；**Workspace = Project Chat 完整闭环的一等执行沙箱对象**。  
> **产物全文：** [`artifacts.md`](./artifacts.md)（medium · 版本 · 预览 · 导出）

---

## 1. 五层分工

| 概念 | 回答 | 寿命 | 阶段 |
|------|------|------|------|
| **Project** | 长期 **哪个作品/产品**（登记 + `root_path` + 主责队） | 常驻 | 一等对象 |
| **Artifact** | **产出了什么**可看/可用的东西（medium + 版本 + 预览） | **耐久**（随项目；跨多次执行） | 一等对象 |
| **Issue** | 这一件 **承诺推进什么**（业务追踪 + 验收） | 可跨多次执行 | 一等对象 |
| **Thread** | 这一条 **怎么自由协作**（Session 接力链 + 溯源） | 耐久对话线 | 一等对象 |
| **WorkflowRun** | 这一次 **怎样受控执行**（固定版本 Step DAG + Attempt） | 一次运行 | 一等对象 |
| **Workspace** | 这次跑 **在哪写**（worktree/scratch/policy） | 可复用或随 Session 归档 | 一等对象 |

```text
Project (drama-s2, medium=video, primary_team=short-drama)
  ├── Artifact: 第 3 集分镜     versions v1→v4   ← 耐久产品（家在这里）
  ├── Artifact: 预告片.mp4      versions v1→v2
  └── Issue is-12 "渲染第 3 集"
        └── Thread th-12
              ├── Session cwd=…/drama-s2
              └── produced_by → Artifact 第 3 集分镜 · v4   ← 溯源，非归属
```

**禁止混淆：**

- Project **不是** Team（编制）；Project **有**主责 Team  
- Project **不是** Board 列上的一张卡  
- QAPS 标签 **P** ≠ Project 实体 id  
- Artifact **不是** 全局第二文件管理器；家在 Project 的 Artifacts section  
- Artifact **不是** Issue/Thread 附属——删追踪卡或执行线不删产物  

---

## 2. Project

见主轴 §6.2.1。摘要：

```text
projects/<id>/
  project.yaml
    id, name, root_path,
    medium?,                 # 主产物类型 → 项目页默认视图
    primary_team_id?,        # 主责队（旧 default_team_id 别名）
    team_ids[],
    agents_entry?,           # 仓「先读哪」
    status, pinned?, …
  artifacts/<artifact-id>/artifact.json   # M0.3.0：产物归项目
```

| 操作 | |
|------|--|
| create | 登记容器；**不**自动建 Issue / Thread / WorkflowRun / Artifact |
| archive | 禁新建 Issue / Thread / WorkflowRun；**产物仍可浏览/导出** |
| chat --project | 建无 Issue Thread + Workspace + 首 Session |
| issue start | 为 Issue 建/绑定主 Thread + Workspace + 首 Session |
| workflow run | 固定 Definition 版本并创建 Run；按 Step/Attempt acquire Workspace；Thread 可选 |

**Team.work_roots：** 队级 path 提示 / allow 辅助；**不再**冒充 Project。

---

## 3. Artifact（Project 所有）

见主轴 §6.5.7 与 [`artifacts.md`](./artifacts.md)。

```text
projects/<id>/artifacts/<artifact-id>/artifact.json
  # medium, status, versions[], current_version_id, unseen?, …
```

**注册：**

1. 工具 `publish_artifact(project_id, medium, …)`（推荐）  
2. 扫 `{cwd}/.hearth/out/**`  
3. Closeout.`paths[]` 在出口导入（猜 medium；只有显式 `artifact_id` 或稳定 `publish_key` 才 append 版本）  

**UI：** Project 的 **Artifacts section** + Chat 右侧活产物预览；Issue / Thread / Run 详情可反查溯源产物。跨项目可聚合浏览，Acceptance 可引用具体版本作为证据。

---

## 4. Workspace

```text
Workspace {
  id
  kind: project | worktree | scratch
  root_path
  project_id
  owner: thread | workflow_attempt
  thread_id? | { run_id?, step_id?, attempt_id? }   # 与 owner 对应，二选一
  git?: { repo_root, branch, worktree_path?, base_commit?, … }
  policy: { write_roots, read_roots, network }
  status: preparing | ready | in_use | awaiting_merge | archived | error
}
```

| kind | 含义 |
|------|------|
| **project** | 直接用 `Project.root_path` 打开 |
| **worktree** | 单执行线 git worktree（常挂 Thread/Session） |
| **scratch** | 临时目录 |
| **vault** | 后置；首个闭环不作为 Workspace kind |
| **remote** | SSH/容器（M5） |

**绑定与事务：** Thread Session 或 Workflow Attempt 启动前 acquire Workspace；owner 必须二选一。直接 Project Workspace 同时只允许一个写者，并发写必须使用独立 worktree；write 越界 → 拒或 L0。Workflow AI Attempt 默认独立 worktree，重试默认新 Attempt + 新 Workspace。合并采用 prepare / verify / apply 三段事务；冲突进入 `awaiting_merge` 并产生 Inbox 事件，不自动覆盖。产物源常落在 Project.root_path 或 worktree 内；`ArtifactVersion` 保存可持续读取的内容指针或快照 hash，Workspace 归档不得使已发布版本失效。

存储：

```text
~/.hearth/workspaces/index.json
~/hearth-worktrees/<team>/<thread-id>/
  .hearth/workspace.yaml
  .hearth/out/
```

---

## 5. 与执行表面

| 执行表面 | Project | Workspace | Artifact |
|----------|---------|-----------|----------|
| Thread 自由协作 | 一 Project 多 Thread | 直接 root（单写者）或 Thread worktree | 版本 append + Chat/画廊投影 |
| WorkflowRun | Run 独立于 Thread | 每个写入型 AI Attempt 默认独立 worktree | Step 关键版本 + Run/Attempt 溯源 |
| swarm（M5） | 同 Project | **每 Builder 独立 worktree** | 汇总为单产物多版本或分产物 |
| handoff（M4） | 可换队；Project 可共享 | **不**默认共享路径 | 包内引用固定产物版本 |

---

## 6. 展示契约

1. 每个 running Session 必须能回答「cwd / 哪个 Project」  
2. 每个可逛结果应在 Project 的 **Artifacts section** 可见（或占位「尚未 publish」）  
3. 所有 Projects 页面可汇总跨项目 **unseen 新产物版本**  
4. Board 是 Project 内 section；可按状态列过滤  
5. Workspace section 投影对象的 `root_path` / `cwd` / write/read roots，不从 UI 另造状态  

| 阶段 | 能力 |
|------|------|
| **Project Chat 完整闭环** | Project / Issue / Thread / WorkflowRun / Artifact / Workspace；cwd 解析；多预览器；Acceptance 证据链；`shared` 与 `worktree_per_run`；委托子 Session；双轨 Files |
| **M4** | Handoff 产物包；发布 |
| **M5** | swarm 多树；remote |
