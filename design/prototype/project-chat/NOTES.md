# Project-Chat 原型 · 试用记录

## Verdict

**通过，作为 M0.5 当前 IA 基线。** Project 是稳定容器，进入默认落 Chat 的主次关系清楚；Board / Artifacts / Workspace / Team / 项目设置保留为左侧竖排 section。后续不再探索新的顶层 IA，转入实现合同与关键交互验证。

### Chat / Run 解耦补充原型（待用户试用）

问题：WorkflowRun / Step 如何与 Project Chat 保持上下文连续，同时拥有独立执行主视图？

已实现 3 个同路由方案（`?variant=A|B|C`）：

| 方案 | 结构 | 初步判断 |
|------|------|----------|
| **A · Chat 摘要** | Chat 仅显示 Run 状态、当前阻塞点与跳转 | 保留意图连续性，不承载 Step 控制 |
| **B · Steps 工作台** | 独立 Runs section：左步骤、中详情、右 Inspector | 默认 Run 页；线性/阶段式流程定位清楚 |
| **C · Graph 画布** | 同一 Run 的 DAG 镜头 + Inspector | 复杂依赖、Gate、排错最清楚 |

共同验证内容：WorkflowRun、`ai | command | approval` Step、owner、依赖、Workspace、StepResult、预算/进度、Gate 放行、下一步解锁。当前 mock 是线性 DAG；并行分支、失败重试和 `Thread → 创建 Run` 的 Plan Preview 仍待下一轮验证。

当前组合判断：**A 是 Chat 投影，B 是默认 Run 页面，C 是 Run 的 Graph 模式**，三者不再互斥选 winner。

收敛决定：

1. Chat 是主舞台，不是六个顶部平级 tab 之一。
2. 用户界面统一使用“负责人、接手、交回、接力链”，不再使用“球权、传球”。
3. Posting 是 Project 所有的一等关系实体，不增加独立聚合根。
4. Workspace 是 Project Chat 完整闭环的一等执行沙箱对象；section 投影 `root_path` / `cwd` / 策略与文件产出。
5. Chat 投影 Thread 与其 Session 接力链；Thread 可无 Issue。默认一个 Issue 关联一条主 Thread，但不写死唯一约束。

## 待验证问题

1. **进入 Project 默认落 Chat** 是否顺，还是更想先看 Board / 概览？
2. **thread 侧栏** 的 ISSUE thread vs 随手 thread 区分够不够清楚？
3. **接手分隔（内部类名仍可为 pass-sep）** 能否让人看懂「一段 = 一个 soul 的独立 session、责任从谁转来」？跨模型复核语义清不清楚？
4. **活产物面** 只在有产物时开 split——空/满切换是否突兀？
5. **Artifacts section vs Workspace section** 两者分工（成品预览 / 源文件树投影）是否直觉？
6. **Team tab 记忆分层**（基座 / 切片 / 反思）表达是否成立，还是太抽象？
7. **靛蓝 accent** 取代旧原型的近黑主按钮——一个 accent 贯穿全 app 的感觉对不对？会不会太"蓝"？
8. **section 数量**（6 个）会不会多？Settings 是否该收进别处？

## 已知简化（原型未做）

- 对话是假的（发送只追加一条 echo，无真 souls / 无 Daemon / 接手不真的唤起 session）
- 活产物面是示意（reader/画廊/player/iframe 均 mock，非真预览器）
- Project 切换器未做（点 Hearth 回首页选）
- Board 拖拽改状态、版本轨真实对比、导出均未实现
- 记忆分层是静态 mock，无真实成长/反思写入
