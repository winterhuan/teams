# PROTOTYPE — Artifact Home (M0.3.0 IA)

**Throwaway.** 回答：

> medium-first 的 **Home → Project 画廊 → Artifact 预览器** 对 novel / video / app 混排是否好用？哪种信息层级更顺手？

旧 `../pulse-ui` 是 Project×Team 壳实验；本目录曾在 M0.3.0 取代它，现已被 `../board-chat/` 与最终的 `../project-chat/` 依次取代。

## Run

```bash
cd design/prototype/artifact-home
python3 -m http.server 8766
```

| URL | 变体 |
|-----|------|
| http://127.0.0.1:8766/?variant=A | **A · 画廊架** — 合同默认结构 |
| http://127.0.0.1:8766/?variant=B | **B · 回来简报** — 新产物全幅优先 |
| http://127.0.0.1:8766/?variant=C | **C · 制作台** — 三栏常驻预览 |

底栏 ‹ › 或键盘 **← →** 切换。点「新产物 / 项目 / 产物」可下钻；状态栏显示当前 route。

## 结构差异（不是换皮）

| | 主表面 | 预览怎么出现 | 进展(Board)在哪 |
|--|--------|--------------|-----------------|
| **A** | Home 栅格 + 项目页 Tab | 独立第三层页 | Project「进展」Tab |
| **B** | 全幅「离开期间」流 | 沉浸式全屏层 | 折叠在项目抽屉 |
| **C** | 左轨多项目 + 中栏预览 | **永远在中栏** | 右栏次要列表 |

## 试用后

在 `NOTES.md` 写 verdict（偏 A/B/C 或混搭：如「A 的导航 + B 的新产物区 + C 的版本轨」）。
