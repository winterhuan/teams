# 附录 — Artifact（产物）：模型 · 预览 · 画廊 · 导出

> **隶属：** [`../personal-agent-os.md`](../personal-agent-os.md) §6.1（第 6 根）· §6.5.7 · §8 表面  
> **M0.3.0 转向：** Artifact 从「执行附属索引」升为 **Project 所有的一等聚合根**（溯源改为回指产出它的 Thread / Session）。  
> **一句话：** 产物是人回来要看的**耐久产品**（小说 / 图片 / 视频 / App…）；一次执行（Thread 里的某次 Session）只是推它前进的一次动作。

---

## 1. 为什么升根（转向理由）

旧模型 `Artifact.thread_id 必填`：产物挂在**一次执行**下。问题：

- 写一部小说跨「初稿 → 润色 → 定稿」多条 Thread / 多次执行，旧模型会散成三处各一份产出，没有「这一部小说」的单一实体。
- 人回来先看的是「新章节能读了吗 / 视频渲染好了吗」，产物却藏在某条对话线的产出记录里。
- 删除某条 Thread 本不该删产品。

**M0.3.0：** `project_id` 必填、执行溯源降为版本级（回指 Thread / Session）。产物有自己的家（项目产物页），跨多次执行迭代靠**版本链**。

| | 旧（≤M0.2.15） | 新（M0.3.0） |
|--|----------------|--------------|
| 归属 | 一次执行（必填） | **Project（必填）** |
| 与执行 | 一次执行一份产出 | 一产物**跨多次执行**迭代（版本） |
| 家 | 执行内 Files tab | **项目产物画廊** |
| 寿命 | 随执行 | **随项目**（Thread 可删，产物留） |
| 是否根 | 否（附属索引） | **是（第 6 聚合根）** |

---

## 2. 对象模型

```text
Artifact {
  id,
  project_id,                  # 必填：归项目所有
  title,
  medium: novel | doc | image | video | audio | app | dataset | code | report | other,
  status: draft | in_progress | ready | published | superseded | archived,
  current_version_id?,
  versions: ArtifactVersion[],
  labels?, summary?,
  cover?: { path? | url? },    # 画廊缩略
  pinned?, unseen?,            # 项目页置顶 / Project 角标与 Inbox 新版本事件
  created_at, updated_at
}

ArtifactVersion {              # 附属值对象，非独立根
  id, artifact_id, rev,        # rev 从 1 递增
  path? | url?,                # 源
  render?: { path?, url?, kind },  # 可预览渲染（mp4/EPUB/静态站…）
  produced_by?: { thread_id?, run_id?, step_id?, attempt_id?, session_id?, member_id? },  # Thread 接力或 Workflow Attempt 溯源
  commit_hash?, bytes?, hash?,
  note?,                       # 「加了第 3 幕」「换配乐」
  created_at
}
```

**不变量：**

1. `project_id` 必填；删 Thread 不删产物。
2. 溯源在版本 `produced_by`，不在归属。
3. 版本 append，不覆盖；`current_version_id` 移动指针，旧版留存。
4. `medium` 决定预览器与画廊分组；未知 → 文件下载 + 元信息。
5. `unseen` 由新版本落地置真，预览后清除；它驱动 Project 角标与 Inbox 的“新版本就绪”事件，不创建独立 Home 新产物流。

---

## 3. 源 vs 渲染（source → render）

许多 medium 的**源不可直接预览**：小说源是 `.md`（可读）但 App 源是一棵仓库、视频源可能是工程文件。

```text
version.path    = 源（编辑/再生的输入）
version.render  = 可预览产物（浏览器/播放器能直接吃的东西）
```

| medium | source 例 | render 例 |
|--------|-----------|-----------|
| novel | `manuscript.md` | 同源（Reader 直接渲染 md）或导出的 EPUB |
| image | `cover.png` | 同源 |
| video | 剪辑工程 / 帧序列 | `out.mp4` |
| app | 仓库 `src/` | 构建产物 / 本地预览 URL / 截图 |
| report | `data.json` + 模板 | 渲染的 HTML |

无 `render` 时预览器降级：给源下载 + 「生成预览」CTA（不阻塞浏览）。

---

## 4. medium → 预览器（前端合同）

| medium | 预览器 | 关键能力 |
|--------|--------|----------|
| **novel / doc** | **Reader** | 分章/分页、目录、字数、**版本 diff**（章级）、朗读（可选） |
| **image** | **Gallery** | 缩略网格 + 灯箱、**前后版本对比**（滑块/并排）、EXIF |
| **video / audio** | **Player** | 内嵌播放、时间轴、版本切换、封面帧 |
| **app / code** | **Live preview** | 起本地预览进程 / iframe（Dyad 式）；不可运行时 → 截图 + 「运行」CTA；code 走 diff/文件树 |
| **dataset / report** | **Data/Report view** | 表格 / 图表 / 结构树 + 摘要 |
| **other** | **Fallback** | 元信息 + 下载 |

**版本对比是一等能力**（不是附加）：Reader 章级 diff、Gallery 图像前后、Player 版本切换、code diff。呼应 Dyad「versions ↔ commit 时光机」。

---

## 5. 项目产物画廊（Project 的 Artifacts section）

项目默认落在 **Chat**；产物画廊是 Project 内稳定的 **Artifacts section**：

```text
┌ Project: drama-s2  ·  medium=video  ·  队 short-drama ────────┐
│ [画廊] [进展] [产物流] [设置]          + 新建产物  ▶ 派活      │
│                                                                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                              │
│  │▶ EP1│ │▶ EP2│ │ 海报 │ │分镜md│   ← 缩略；medium 图标；unseen 角标 │
│  │ready│ │渲染中│ │ v3  │ │ v7  │                              │
│  └─────┘ └─────┘ └─────┘ └─────┘                              │
└────────────────────────────────────────────────────────────────┘
```

- `medium` 混排：一个视频项目也可有海报(image)、分镜(doc)、片尾(app)。
- 卡显示：缩略/封面、status、当前 rev、`unseen` 角标、产它的最近 Thread / Session(反查)。
- `Project.medium` 决定默认排序/视图密度（novel→列表阅读态；image/video→网格）。

**Board section**：该 Project 的 Issue 看板（triage/backlog/todo/in_progress/blocked/in_review/done/cancelled），与 Artifacts、Runs、Workspace 等同属 Project 内竖排 section；Chat 仍是默认入口。

---

## 6. 导出与发布（「产物预览和输出」）

每个产物 / 版本必带**导出条**（保持轻量）：

| medium | 导出 / 发布 |
|--------|-------------|
| novel / doc | Markdown · EPUB · PDF · 复制正文 |
| image | 原图 · 打包 zip · 复制链接 |
| video / audio | 源文件 · 分享链接 |
| app / code | 构建产物 · 部署指针 · 仓库/PR 链接 |
| dataset / report | csv/json · 渲染 PDF |

- **导出 = 只读取版本**，不改产物；导出动作若外发（发布/上传）→ 走 §6.7 L0 + §6.12 凭证经纪。
- `status=published` 记发布指针（URL / store）；发布是 L0。

---

## 7. 注册（保持轻，不改 §8.2 派活）

产物如何进系统：

1. 工具 **`publish_artifact(project_id, medium, path|url, title, …)`**（推荐；Session 内 Member 调用）。
2. 扫 `{cwd}/.hearth/out/**`（约定产出目录）。
3. **Closeout.paths[] 导入**：Session 出口按扩展名猜 medium（人可改），注册/更新为 Artifact 版本。
4. 手动 `hearth artifact add`。

**同一逻辑产物的再产出 = 加版本**：追加版本必须显式提供 `artifact_id`，或命中 Project 内稳定的 `publish_key`；随后 append `ArtifactVersion` + 移 `current_version_id`。`title`、path、hash 只用于提示候选，**不得单独触发自动归并**，避免同名产物污染版本链。

---

## 8. CLI

```text
hearth artifact ls --project foo [--medium video] [--unseen]
hearth artifact show <id>                 # 版本列表 + 溯源
hearth artifact add --project foo --medium novel --path manuscript.md --title "第一部"
hearth artifact version add <id> --path … [--note "定稿"] [--from-thread th-12] [--from-session th-12-7]
hearth artifact preview <id> [--rev N]    # 起预览器（CLI 给路径/URL；Web 起预览器）
hearth artifact export <id> [--rev N] [--format epub]
hearth artifact publish <id>              # L0
```

---

## 9. 存储

```text
projects/<id>/artifacts/
  <artifact-id>/
    artifact.json          # medium, status, versions[], current_version_id, unseen…
    # 源与 render 大文件留原路径（version.path / version.render 指针 + hash）
    # 小文本产物（如 novel md）可放同目录 blobs/，也可指向 root_path 内工作副本
```

- json 只存指针 + hash，不塞大二进制。
- 产物源常就在 `Project.root_path` 工作树内；artifact.json 记相对路径 + 版本 hash，避免双拷贝。

---

## 10. 阶段

M1 / M2 / M3 合并为 **Project Chat 完整闭环**（不再分阶段延后）：

| 范围 | 能力 |
|------|------|
| **Project Chat 完整闭环** | Artifact 根 + 版本链；项目产物画廊；Reader / Gallery / Player / 文件 fallback；导出条；`publish_artifact` + Closeout 导入；Live preview（App）；版本 diff 完整；跨项目产物聚合浏览；Acceptance 证据链到产物版本；Workspace 对象 → 产物源锚定 worktree；委托子 Session 产出归并 |
| **M4（延后）** | 发布/分发流水线；产物级 Handoff（跨队）引用 |
| **M5（延后）** | swarm 多树产出汇总为单产物多版本 |

---

## 11. 与其他对象

| 关系 | 说明 |
|------|------|
| **Artifact ↔ Project** | 归属（必填）；Project.medium 给画廊默认 |
| **Artifact ↔ Thread** | 版本级溯源（`produced_by.thread_id?`）：是哪条对话线产出/更新了本版本；Thread 侧可反查「本线产出/更新了哪些产物」 |
| **Artifact ↔ Session** | 版本 `produced_by.session_id?` + `commit_hash?`（§8.3 commit 锚定）：接力链上哪一次执行落的这版 |
| **Artifact ↔ Acceptance** | Acceptance 项可链到「某产物达到某版本」（Acceptance 归 Issue） |
| **Artifact ↔ Workspace** | 源落在某 worktree；version 可挂 `workspace_id`，归档 Workspace 不得使版本失效 |
| **Artifact ↔ WorkflowRun** | 版本可回指 `run_id / step_id / attempt_id`，与 Thread Session 溯源二选一或按来源记录 |

产物是**耐久层**；Thread Session / Workflow Attempt / Workspace 都是推进它的一次执行动作。IA 与 Project 导航见 [`ui.md`](./ui.md)，收敛合同见 [ADR 0004](../../docs/adr/0004-project-chat-closed-loop-convergence.md)。
