# PROTOTYPE — Project × Team 壳

**Throwaway.** 回答：壳上 Project 与 Team 谁主谁次？

## Run

```bash
cd design/prototype/pulse-ui
python3 -m http.server 8765
```

打开：

| URL | 变体 |
|-----|------|
| http://127.0.0.1:8765/?variant=A | **A 队优先** |
| http://127.0.0.1:8765/?variant=B | **B 项目优先** |
| http://127.0.0.1:8765/?variant=C | **C 双轴矩阵** |

底栏 ‹ › 或键盘 **← →** 切换。

## 三种结构

| | 主轴 | 你在找什么时好用 |
|--|------|------------------|
| **A** | Team | 「我的开发队现在在干什么」 |
| **B** | Project | 「foo 仓库上还有哪些活」 |
| **C** | 队 × 项目 | 看清多对多；点矩阵格子切交点 |

卡上仍有：硬门、Comments、**Files = Artifact**、绑 Project。

## 试用后

在 `NOTES.md` 写 verdict（偏 A/B/C 或混搭）。
