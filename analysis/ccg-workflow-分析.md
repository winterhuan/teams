# CCG Workflow 项目深度分析

> 分析对象：`references/ccg-workflow`  
> 许可证：MIT  
> 关联：Claude Code 内的多模型协作 **引擎**（非独立 Hub）

---

## 1. 定位

**CCG = Claude Code 上的 workflow 引擎**，编排 Claude + Codex + Gemini：

- `/ccg:go` 自然语言 → 自动选 **strategy** → 执行
- **Hook 引擎**：每 turn 注入 `<ccg-state>`，compaction 后仍跟轨
- **Task 持久化**：`.ccg/tasks/<id>/task.json` + phase gate（HARD STOP）
- **Agent Teams**：大任务 `TeamCreate` 并行 Builder
- **Codex-Led Mode**：Codex 主导写码，分派分析给 Gemini/Claude

---

## 2. 策略矩阵（Strategy Router）

| Strategy | 场景 | 外模型 | Teams |
|----------|------|--------|-------|
| direct-fix | 单文件 bug | 否 | 否 |
| quick-implement | 小功能 | 否 | 否 |
| guided-develop | 中功能 | 单模型 | 否 |
| **full-collaborate** | 复杂跨模块 | 双模型并行 | **是** |
| debug-investigate | 难 bug | 双模型 | 否 |
| review-audit | 审查 | 双模型交叉 | 否 |

引擎读项目上下文（git、栈、文件）→ 分类 → 选策略 → 写 task.json。

---

## 3. 阶段状态机（以 full-collaborate 为例）

```text
1-research → 2-ideation → 3-planning (HARD STOP 等人批)
→ 4-implementation (Agent Teams 并行 Builder)
→ 5-optimization → 6-final
```

Hook 每轮注入：

```xml
<ccg-state>
Task: … | Strategy: full-collaborate | Phase: 4-implementation
</ccg-state>
```

---

## 4. 可借鉴点与边界

| 维度 | CCG 特征 |
|------|----------|
| 层级 | **Harness 内插件**（非独立协作平台） |
| 状态 | 文件 + hook 注入 |
| 多 Agent | Claude Agent Teams API |
| 质量门 | verify-* skills |

**可借鉴（策略平面，非复制）**：

1. **Intent → Strategy 路由**（小修不走重流程）  
2. **Phase gate + HARD STOP**（Archon/OpenTeams 同类）  
3. **Hook/心跳式状态注入**（平台可用 MCP `get_thread` 摘要代替）  
4. **并行 Builder + 文件所有权**（Workflow 节点并行）

**边界**：CCG 绑定 Claude Code 生态；不宜把「独立协作平台」做成「只有 Claude Code 的 CCG」——那是 Harness 插件赛道。

---

## 5. 关键路径

| 路径 | 用途 |
|------|------|
| `README.md` | v3 架构、策略表 |
| `templates/engine/strategies/*.md` | 各策略阶段机 |
| `templates/codex/hooks.json` | hook 集成 |

---

*关联：[Archon-分析.md](./Archon-分析.md)（同为 workflow 引擎类）*