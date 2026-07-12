# Prototype · Board-Chat (M0.4.0 对话中心转向)

验证 **五要素融合**：Project · Board · Issue · Team · Chat 捏成一个整体。

## 核心主张（可点验证）

> **Issue 是唯一耐久对象。拉远 = Board，拉近 = Chat + 活产物。**
> Team 是花名册，Project 必选（含 inbox 兜底），Artifact 是 Chat 长出的果实。

## Run

```bash
cd design/prototype/board-chat
python3 -m http.server 8767
# http://127.0.0.1:8767/
```

勿用 `file://`（脚本按顺序加载，需 http）。

## 试用路径（看融合是否成立）

1. **落地 = Board**（Linear 式列：Triage/Todo/Doing/Review/Done/Blocked）
   - 卡上角标：`●新版本` = 旧「新产物」塌进来了；`⛔待审` = 旧「硬门」塌进来了
   - 右上 scope：全部 / 单项目切换
2. **点任意卡 = Issue 拉近**
   - 左：和团队的对话（@宪/@砚/@烁，各背模型）
   - 右：**活产物面板**（有产物才出现）——novel=reader / image=画廊 / video=player / app=iframe
   - 头部：Linear 式元数据（状态/持球人/项目/验收）
   - 对话流内联：diff 卡、审批 Grant/Deny、错误块（不污染 transcript）
3. **点没产物的 issue**（如纯讨论）→ 整屏对话，右面板不出现（产物是条件项，不硬塞分屏）
4. **In Review 卡** → 看跨模型互审语义（球从写的 soul 传给不同模型族审查 soul）
5. **Inbox 抽屉**（顶栏右）→ 时间序事件：@你的 / 硬门 / 跑完了（异步 CVO 回声）
6. **Projects 页** → 每个 project = board + 产物聚合画廊；含虚线 `inbox` project
7. **Teams 页** → souls 花名册 + 背后模型

## Mock 覆盖

- 4 projects（含 inbox 兜底）· 多 issue 跨全 6 列
- 有产物 issue（novel/image/video/app 四 medium）+ 无产物 issue（纯讨论）
- 1 待审硬门 · 1 In Review 跨模型 · 2 新版本角标 · 1 错误块

## Verdict

_（试用后填 NOTES.md）_

## 取代

本原型取代 `../artifact-home/`（M0.3.0 产物中心三变体）。旧原型 IA（Home→画廊→预览器、Board 降子页）已被 M0.4.0 推翻。
