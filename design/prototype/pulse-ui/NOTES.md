# Prototype · pulse-ui

## 当前原型（历史实验，未跟 M0.3.0）

**Question（旧）：** 壳上 Project 与 Team 谁主谁次？怎么呈现多对多？

| Variant | 主轴 | 结构 |
|---------|------|------|
| **A** | Team | 顶栏切队；Project = Board 过滤 |
| **B** | Project | 顶栏大切 Project；队 = 主责标签；Work 按项目列 |
| **C** | 双轴 | 左 Team 轨 + 顶 Project 轨 + 矩阵格子 + 交点 Board |

**URL:** `?variant=A|B|C` · 键盘 ← → · 底栏切换

**Verdict:** _（试用后填：偏 A / B / C，或「矩阵只作设置、日常用 A」等）_

**字段备注：** `state.js` 仍用 `default_team_id`（兼容旧壳）。主轴合同字段为 **`primary_team_id`**（`default_team_id` 读为别名）。

---

## M0.3.0 目标 IA（本原型尚未实现）

主轴设计已翻转；**本 throwaway 壳仍是 Project×Team / Board 实验**，不要当作当前 IA 真相。

```text
L1 Home     新产物（unseen 版本）· 硬门条 · 项目栅格
L2 Project  产物画廊（默认）· 进展(旧 Board) · 团队 · 设置
L3 Artifact medium 预览器 + 版本 + 导出 + 溯源
```

**Superseded by：** [`../artifact-home/`](../artifact-home/) — M0.3.0 Home→画廊→预览 三变体。  
参见：`design/annex/ui.md` · `design/annex/artifacts.md` · 主轴 §8「IA 三层」。
