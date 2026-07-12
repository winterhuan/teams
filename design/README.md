# Hearth 设计文档

> **版本：** M0.5.0（Project 中心 · chat-first）
> **状态：** 仅文档 + throwaway 原型，无产品实现

## 一句话

**Project 是中心；进入默认落 Chat，Runs 是独立受控执行工作面。Board / Runs / Artifacts / Workspace / Team / 项目设置是 Project 内竖排 section。Team 派驻(Posting)到 Project 后为 Thread 与 WorkflowRun 共同提供执行者、skills、权限和记忆；Team 不是运行模式。Issue 与 Thread/Run 松耦合。**
中心永远是 **Daemon 账本**（不是聊天、TUI 或 App Builder）；UI 只是投影，离开 = detach，souls 异步继续。

口语「小本本」= 在 issue 对话里写 comment。
**QAPS 的 P** = 路由标签，**不是** Project 实体。

## 当前开发阶段

**Project Chat 完整闭环** = 原 M1/M2/M3 的合并阶段。它必须交付最终对象模型下的 Project Chat、Issue Board、Thread/Session 接力链、独立 WorkflowDefinition/WorkflowRun、Claim 调度、多 Team/Posting、Workspace/worktree、Artifact 多 medium 预览/版本/导出、Inbox、Live HUD 与 Review。内部可以按垂直切片推进，但不能把切片重新定义成独立产品阶段。M4 承接跨队 Handoff、Telos/学习产品化等后续能力，M5 后置 swarm 与运行时加固。

## 主节奏（Project 中心 · chat-first）

```text
所有 Project（落地：项目网格 + Rail rollup 圆点）
  → 点一个 Project = 进入，默认落 Chat
     左：Rail（项目切换/新建/Inbox/全局设置） + Project 竖排 section 导航 + thread 列表
     中：Chat 主舞台（thread 对话流；多人接力可切 接力/对话流/轨道 三视图）
     右：活产物预览（dyad 式常驻，可折叠可分屏；预览/文件/产物/Workspace）
  → Chat 只显示关联 Run 摘要；点开进入独立 Runs：Steps / Graph + Result / Discussion / Logs
  → Board（Linear 式）建 issue → 团队自动拉取（Symphony 式 claim）→ 开 thread + 首个 session
  → @完就走（detach），souls 异步干；不在时 Rail 圆点/Inbox 回声
  → Inbox 抽屉收「需要你介入」的事件（@你 · 硬门 · 跑完）
```

## 对象速查

| | 回答 | 一句话 |
|--|------|--------|
| **Project** | 哪摊活 | **中心**容器；装 Chat / Board / Runs / 产物 / Workspace / Team；进入默认落 Chat |
| **Soul** | 谁（人格） | 全局稳定身份（persona/voice/model），跨项目恒定；是某个 Team 的成员，不是独立库 |
| **Team** | 哪支队 | 一组成员 soul + 默认 skill；为 Thread 与 Run 提供执行者，不是模式 |
| **Posting** | 派驻实例 | **Project 所有的一等关系实体**：soul × project 绑定；挂本项目 skill / 记忆切片 / role / autonomy；不是独立聚合根 |
| **Thread** | 一条对话线 | 耐久自由协作线；可作为 Run 来源/Discussion，但不包含 Run |
| **WorkflowRun** | 一次受控执行 | 固定 Definition 版本；拥有 Step/Attempt/Approval/diagnostics，可无 Thread |
| **Session** | 一次独立执行 | 某 soul 的一次隔离执行；归属 Thread 接力或 Workflow AI Step（二选一） |
| **Issue** | 要推进的一件事 | Board 卡；与 Thread 松耦合，默认关联一条主 Thread但不设唯一硬约束；团队自动拉取后认领并开工 |
| **Artifact** | 产出了什么 | Chat 里长出的果实（medium + 版本预览）；归 Project |
| **Workspace** | 在哪写 | 一等执行沙箱对象；section 投影 `Project.root_path` / `Session.cwd`、策略与文件产出 |
| **记忆** | 学到什么 | 基座(跨项目) + 切片(本项目) + 成长三桶(原则/套路/疤，带出处/召回数) |

## 阅读顺序

| 文档 | 内容 |
|------|------|
| [`../CONTEXT.md`](../CONTEXT.md) | **统一语言**：Project / Soul / Posting / Thread / Workspace 的冻结边界 |
| [`conversation-turn.md`](./conversation-turn.md) | M0.4.0 历史转向：Issue 中心方案与仍保留的域内核 |
| [`personal-agent-os.md`](./personal-agent-os.md) | 主轴合同：Issue 业务态 + Thread 自由协作 + WorkflowRun 受控执行 + Claim 调度 · T1–T4 |
| [`annex/ui.md`](./annex/ui.md) | **IA（M0.5.0）**：Project 中心 · Chat 默认入口 · 独立 Runs · 七个 section |
| [`annex/artifacts.md`](./annex/artifacts.md) | 产物模型：medium · 版本 · 预览器 · 导出（内核留，投影改为 issue 右栏 + project 画廊） |
| [`annex/workspace.md`](./annex/workspace.md) | Project / Artifact / Workspace 分工 |
| [`annex/analysis-synthesis.md`](./annex/analysis-synthesis.md) | 全 31 份 analysis 吸收矩阵 |
| [`annex/open-source.md`](./annex/open-source.md) | 与开源边界（可学 / 不学） |
| [`annex/providers.md`](./annex/providers.md) | 多引擎适配 |
| [`annex/collab.md`](./annex/collab.md) | 队内协作 / Handoff |
| [`annex/loops.md`](./annex/loops.md) · [`loop-engineering.md`](./annex/loop-engineering.md) | 内环 / 叠环 |
| [`../analysis/`](../analysis/) | 竞品与样本底稿 |
| [`prototype/project-chat/`](./prototype/project-chat/) | **M0.5.0 原型（当前）**：Chat Run 摘要 + 独立 Steps/Graph Run 工作台 · 三视图接力 |
| [`prototype/board-chat/`](./prototype/board-chat/) | 旧 M0.4.0 原型：Board 落地 → 点卡进 Issue=Chat+活产物（**superseded**） |
| [`prototype/artifact-home/`](./prototype/artifact-home/) | 旧「产物中心」画廊实验（**superseded**；见 NOTES） |
| [`prototype/pulse-ui/`](./prototype/pulse-ui/) | 旧 Project×Team 壳实验（**superseded**；见 NOTES） |

## 智慧装配（极简）

```text
控制面 Paseo/Agno · 工单 Symphony/Multica · 编制 Clowder/OpenCrew
执行腰 Pi/acpx/Omnigent · 内环 GenericAgent · 记忆 Hermes/OpenHuman/OpenWiki
切片 Codeg / Dyad / Herdr / Neo · Swarm→ClawTeam(M5) · 人生→LifeOS切片
IA  Project 中心 · chat-first：进 Project 默认落 Chat；Runs 独立于 Chat
    Board/Runs/Artifacts/Workspace/Team/设置 = Project 内竖排 section
    融合 = Linear board/issue · Neo 富消息 · Dyad 旁产物&apply门闩 · clowder 团队接力 · Symphony 自动拉取
```

## 版本

| | |
|--|--|
| **M0.5.0** | **Project 中心 · chat-first 转向**：进入默认落 Chat；Runs 是独立 Steps/Graph 工作面。Thread 承载自由协作，WorkflowRun 承载受控 DAG，二者通过可选 source/discussion 关联。Team/Posting 提供执行者而非模式。原 M1/M2/M3 合并为 **Project Chat 完整闭环**。 |
| **M0.4.0** | **对话中心转向**：Issue 唯一耐久工作对象；Board(拉远)↔Chat+活产物(拉近)；Team=souls花名册，Project 必选容器；Board 提回顶栏+落地；Home/独立画廊/Pulse 塌成卡角标+Inbox；域内核（9根）不变，只换投影。融合 Linear+Neo+Dyad+clowder |
| **M0.3.0** | 产物中心转向（**IA 立场被 M0.4.0 推翻**；Artifact 升根等域内核保留） |
| **M0.2.15** | 健壮性合同：stall / resume 幂等 / 凭证经纪 / 供应链 / 隐私工厂 / scars 召回 / 压缩 / Class-Sweep |
| **M0.2.14** | 全 analysis 综合；synthesis 矩阵；knowledge 刷新 / 记忆冻结 / policy 单点 / swarm 不变量… |
| **M0.2.13** | Neo Chat：Skills≠Tools、run_error、budget、risk、doctor |
| **M0.2.12** | Herdr：attention、detach、wait、状态权威 |
| **M0.2.11** | Dyad：turn_mode、apply_batch、意图保护、path_deny |
| **M0.2.10** | Codeg：Automation isolation、委托、HUD、导入 |
| **M0.2.9** | Project 一等 + Artifact 索引；Workspace 仍 M3 |
| … | 见主轴版本表 |
