# Prototype · Project-Chat (M0.5.0 Project 中心 · chat-first)

实现 `design/DESIGN.md`（Hearth 设计系统）。验证心智：**Project 是中心，进入 Project 默认落 Chat；Runs 是独立执行工作面；Board / Artifacts / Workspace / Team / Settings 是 Project 内的竖排 section**。

## 核心主张（可点验证）

> Project 是中心，不是 Issue。Chat 是默认脸。
> Chat 与 Issue 松耦合：可直接聊（无 issue），也可从 Board 建 issue 团队自动拉取。
> session chain = 接力链：一段 = 一个 soul 的独立 session，跨 soul 接手/交回（含跨模型复核）。
> Team 顶层常驻花名册，派驻到不同 Project（skill 不同）；记忆分跨项目基座 + 本项目切片。

## Run

```bash
cd design/prototype/project-chat
python3 -m http.server 8767
# http://127.0.0.1:8767/
```

勿用 `file://`（脚本按顺序加载，需 http）。

## Chat / Run 解耦三镜头

同一条 `foo-app / 接入 OAuth 登录` Thread 关联一个独立 WorkflowRun mock，可用 URL 或底部切换器比较：

- [`?variant=A`](http://127.0.0.1:8767/?variant=A) — **Chat · Run 摘要**：Chat 只显示状态、当前阻塞点和“打开 Run”，不展开完整步骤。
- [`?variant=B`](http://127.0.0.1:8767/?variant=B) — **Run · Steps 工作台**：独立 Runs section，左步骤、中执行详情、右 Result / Discussion / Logs。
- [`?variant=C`](http://127.0.0.1:8767/?variant=C) — **Run · Graph 画布**：同一 Run 的 Graph 镜头，适合 DAG、Gate 和调试。

底部 `← / →` 或键盘方向键切换；输入框聚焦时不会拦截方向键。B/C 中点击 Step 可查看 owner、依赖、Workspace、command 和 StepResult；右侧切换 Discussion / Logs；OAuth Gate 的“放行并继续”可验证 Step 状态流转。

## 试用路径

1. **Home = 所有 Project**（4 类：小说 / 短剧 / 电影 / App，各派不同队）
2. **点任意 Project = 进入，默认落 Chat**
   - 左：thread 侧栏（ISSUE thread + 随手 thread，chain 色点串显示接力段数）
   - 中：对话流，按 session 分段，段首「接手分隔」标出谁的独立 session / 从谁接手 / 角色
   - 右：活产物面（有产物才开 split）
   - composer：负责人 chip + build/plan/ask 回合模式
3. **切 section**：Board（高密度 Linear 列）/ Artifacts（成品预览）/ Workspace（源文件树投影）/ Team（派驻花名册 + 记忆分层）/ Settings
4. **Board 点卡** → 回到该 issue 关联 thread 的 Chat
5. **foo-app 的 OAuth thread** → 看跨模型复核 chain（宪 Claude 写 → 砚 Codex 审 → 补 CSRF → L0 硬门）
6. **foo-app「随手：本地 RAG 选型」** → direct thread（无 issue）+「提升为 Issue」块
7. **Team tab** → 记忆分层（基座跨项目 / 切片本项目 / 成长反思 win·scar）
8. **Inbox 抽屉**（顶栏右）→ 跨项目时间脸
9. **OAuth Run** → A 从 Chat 摘要进入独立 Run；B/C 切 Steps/Graph；点 `测试与 lint` 看 command Step；点 `Push feat/oauth` 放行后观察 Closeout 解锁

## 视觉系统（对齐 DESIGN.md）

- 亮色暖白底 `#fbfbfa` · 唯一靛蓝 accent `#5e6ad2`（主 CTA / active tab / focus / 选中）
- Geist + Geist Mono · 层级靠 weight+color 非字号跳级 · 数字用 mono
- soul 去饱和身份色（仅 monogram + 姓名点，非第二 accent）
- 零 em-dash · 无 AI 紫 / 发光 / glassmorphism / emoji 装饰 / 玩具圆头
- 动效 `cubic-bezier(.16,1,.3,1)` · 0.3s · 只动 transform/opacity · 尊重 reduced-motion

## Verdict

Project 中心 + chat-first 成立，作为 M0.5 当前 IA 基线。具体收敛结论见 `NOTES.md`。

## 取代

本原型取代 `../board-chat/`（M0.4.0 Issue 中心）。旧 IA（Board 落地页 / Issue 唯一耐久对象）已被 M0.5.0 Project 中心推翻。
