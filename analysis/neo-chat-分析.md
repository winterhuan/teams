# Neo Chat 项目深度分析

> 分析对象：[`u14app/neo-chat`](https://github.com/u14app/neo-chat)  
> 官网：https://neo.u14.app  
> 维护方：**u14app**  
> 许可证：**MIT**  
> 状态：活跃；Releases ~30；分析时点 **v2.2.0**（2026-07-10）  
> 仓库：约 **1.7k★ / 610 forks**，推送至 2026-07-10  
> 语言：**TypeScript ~99%**（Next.js 16 + React 19 + Zustand）  
> 分析日期：2026-07-11  
> 一手材料：README · AGENTS.md · ROADMAP · `docs/{reliability-and-safety,privacy-and-local-data,plugin-development,deployment-hardening}.md` · `src/{lib,store,app/api}` 布局 · package.json · GitHub API  

---

## 1. 项目定位与愿景

### 1.1 一句话定位

**Neo Chat 是可自托管的 local-first AI 聊天工作区：多模型 Provider、助手预设、文本 Skills、OpenAPI/MCP 插件、搜索、RAG、本地记忆、语音、富渲染与可编辑 Artifacts 合在一壳；默认数据落在浏览器，服务端只做受控代理。**

官方表述：

> *A local-first AI chat workspace for models, agents, skills, plugins, search, RAG, voice, memory, and artifacts.*

### 1.2 是 / 不是

| Neo Chat **是** | Neo Chat **不是** |
|-----------------|-------------------|
| **浏览器 local-first** 多模态聊天工作区 | 本机 Daemon 控制面（≠ Hearth） |
| 多 LLM Provider + BYOK | 多 CLI coding agent 聚合（≠ Codeg/Herdr） |
| Skills（纯文本）+ Plugins（可执行）分层 | 工单/Board 账本 OS |
| 自托管友好（Docker / Vercel / CF Workers） | 开箱多租户 SaaS |
| 消息中心 + 知识库 + 记忆 | App builder 预览闭环（≠ Dyad） |

### 1.3 与 Hearth / 友邻坐标

```text
Neo Chat   浏览器聊天工作区：local-first 数据 + 代理执行
Dyad       本机 Electron App Builder
Codeg      多 CLI 工作台 + 委托
Herdr      终端多路 + 态势
Hearth     本机 OS 账本：Project + WorkItem + Team + Pulse
```

**Neo Chat 强在「local-first 数据边界、Skills/Plugins 分离、上下文预算、错误与内容分离、部署健康、风险元数据」；弱在「承诺任务 FSM / 多队 / 异步派活 / 真实 PTY」。**

---

## 2. 系统架构

### 2.1 数据与代理分层

```text
Browser (React + Zustand)
  ├─ localStorage     providers · settings · key envelopes
  ├─ IndexedDB        sessions · messages · plugins · skills · KB meta · memories
  └─ OPFS             uploads · workspace files · image display cache
        │
        │  BYOK 加密信封
        ▼
Next.js API routes  （受控代理，非真相库）
  ├─ Model providers (Google / Anthropic / OpenAI / compatible)
  ├─ Search / RAG / doc-parse / voice
  ├─ Plugins + remote MCP (streamable-http)
  └─ /api/health
```

**核心不变量：用户数据默认不进服务器库；服务器收信封、解密、代理、再返回。**

### 2.2 部署双模式

| Mode | 行为 |
|------|------|
| **`local`** | 允许本机/私网代理目标（私有部署） |
| **`hosted`** | 禁 localhost/私网/明文 HTTP（除非显式放开）；要求共享 store（Upstash 等） |

`ACCESS_PASSWORD` = 部署门禁，**不是**账号系统。文档明确：公开 SaaS 还需鉴权、租户、配额、审计、服务端密钥。

### 2.3 工程结构

```text
src/app/          routes + API
src/components/   UI（chat / settings / market / KB）
src/features/chat hooks
src/lib/          domain：byok · chat · plugin · mcp · memory · skills · security · providers
src/services/     客户端服务封装
src/store/        Zustand + migrations + sessionMessagePersistence
docs/             部署/隐私/可靠性
```

质量门：format · lint · typecheck · test · build · audit。

---

## 3. 域概念（产品对象）

| 对象 | 含义 | Hearth 近似 |
|------|------|-------------|
| **Session / Chat** | 对话线程；可 branch、pin | Session / 非 WorkItem |
| **Message** | 多块输出（text/image…）；generation 状态与 **generationError** | Timeline 事件 + 内容分离 |
| **Workspace** | 聊天工作区 + 文件 + 指令预设 | 轻 Project 切片（≠ 仓库 Project） |
| **Assistant** | 人设/预设（LobeHub 注册表 + 本地） | Member SOUL / 模板 |
| **Skill** | **纯文本** prompt 上下文；可装可改可自动选 | skills/ 挂载（文本） |
| **Plugin** | **可执行**工具（OpenAPI / 内置 / remote MCP） | tools + MCP + L0 |
| **Knowledge** | OPFS 文件 + 可选向量索引 | knowledge/ + 后段 RAG |
| **Memory** | 本地记忆 + 提取 + dream 巩固 | Brain / memory/ |
| **Artifact** | 富消息中的可编辑产物块 | Artifact 索引（Board Files） |

### 3.1 Skills vs Plugins（关键分层）

| | Skills | Plugins |
|--|--------|---------|
| 形态 | 文本指令 | 网络/可执行工具 |
| 执行 | **不**执行代码、不访问本地文件 | 服务端路由执行 |
| 存储 | 浏览器本地 | 安装配置本地 + 服务端 registry（hosted） |
| 选择 | 手动 / workspace 预设 / auto | 按 chat 启用 |
| 风险 | 进 prompt 上下文 | read/write/destructive/external |

**归一化拒绝** skill 带 script/网络/文件系统要求 — 防「技能」变木马。

### 3.2 Plugin 风险与 MCP

- 风险元数据：`read | write | destructive | external`；缺省从 HTTP method 推断。  
- 启用后 **无逐次确认弹窗**（信任点在安装与启用）。  
- **函数名碰撞** → 报错不猜。  
- Built-in ID **保留**，不可被自定义覆盖。  
- MCP v1：**仅 remote streamable-http HTTPS**；无 stdio/npm/docker/OAuth。  
- 本地部署可打 LAN HTTPS MCP；hosted 默认拦私网。  
- Tool 环：**高但有界**（防递归失控）。

### 3.3 生成状态机

```text
idle | pending | attachments | rag | searching | tool | model | done | error | aborted
```

失败写入 **`Message.generationError`**，**不**塞进 assistant content 伪装成模型输出。  
搜索失败保留 search block，不静默消失。

### 3.4 上下文预算

集中于 `src/lib/chat/contextBudget.ts`：

- 用模型 `limit.context` / `limit.output`  
- 无 token 元数据时用稳定字符估算  
- 分配带：history · attachments · search · RAG · tools  
- **禁止各模块私自截断规则**

### 3.5 记忆与 RAG

- 记忆 local-first，但进模型请求时会泄露给 Provider。  
- Dream consolidation：后台对记忆集再加工。  
- KB：删除/取消前先清 OPFS/向量；失败则保留元数据；`reconcileCollection` 修孤儿文件。  
- Doc-parse job 带 **opaque secret** 轮询；hosted 需共享 job store。

### 3.6 渲染与沙箱

- Markdown + 消毒 HTML；禁 script/iframe/不安全 URL。  
- Mermaid / mindmap / citations / artifacts。  
- 浏览器 JS artifact 在 **可终止 worker + 禁网 + 输出上限 + 超时**。  
- 图片：OPFS 展示缓存；请求前剥离缓存、只送 data/url。

---

## 4. 安全与隐私（可抄清单）

| 机制 | 要点 |
|------|------|
| **BYOK envelopes** | 浏览器加密密钥再上传；生产禁用 ephemeral 服务器密钥 |
| **URL safety** | hosted 拦私网/HTTP；local 放宽 |
| **Schema 拒未知高危字段** | 载荷上限 |
| **Plugin 服务端代理** | 不直连浏览器到上游（hosted 注册表） |
| **非 SaaS 诚实边界** | 文档明确缺鉴权/租户/配额 |
| **导出完整性** | 全量 export 失败则不全量（不静默残缺） |
| **Health** | `/api/health` 非密钥就绪：BYOK、密码、store、默认模型、search/RAG/voice |

---

## 5. 与 Hearth 差异总表

| 维度 | Neo Chat | Hearth |
|------|----------|--------|
| 真相位置 | **浏览器** | **本机 Daemon** |
| 主对象 | Session/Message | Project + WorkItem |
| 执行 | LLM tools via API | Provider CLI Session |
| Skills | 纯文本模块 | 队/全局 skills 路径 |
| Plugins/MCP | 服务端代理执行 | Member tools + Adapter |
| 记忆 | IndexedDB memory | memory/ + knowledge/ |
| 硬门 | 启用即跑 tool（无 per-call 确认） | L0 + apply_batch + Pulse |
| 部署 | Next/Docker/Workers | hearthd + CLI + Pulse |

---

## 6. 可汲取智慧（给 Hearth）

### P0 — 合同级

1. **Skills（文本）≠ Tools（可执行）硬边界**  
   - Skill 规范：禁止脚本/网络/写盘声明；只注入 prompt。  
   - Tool/MCP 走 Member tools + path/L0。对齐 Neo「Skills 不是木马入口」。

2. **错误与内容分离**  
   - Session/Timeline：`generation_error` / `run_error` **结构化字段**，禁止把 `Error: ...` 写进模型可见 transcript 当 assistant 话。  
   - UI：可恢复错误块 + retry（Dyad/Neo 同族）。

3. **集中 Context Budget**  
   - 单一 planner：history / attachments / search / RAG / tools 配额。  
   - 各附件源禁止私自截断（`contextBudget` 模式）。

4. **Tool risk 元数据**  
   - 工具注册：`read | write | destructive | external`。  
   - 驱动默认 autonomy 建议与 Pulse 提示（补充 L0–L3）。

5. **有界 tool 环**  
   - 配置 `max_tool_rounds`（已有 max_turns；显式 tool 子环上限防递归）。

### P1 — 数据与运维

6. **Artifact 消息块**  
   - Board Files 之外：消息级 editable artifact（md/code/html）可「提升」为 Work Artifact。

7. **部署/实例健康**  
   - `hearth doctor` / Pulse Ops：Provider health、路径可写、配额、默认队/Project 就绪（学 `/api/health`）。

8. **密钥信封思维**  
   - 若未来 Web Pulse 或远程 CLI：用户密钥 **客户端加密** 再达 Daemon（BYOK 模式）；本机默认可 file perms。

9. **local vs hosted 策略开关**  
   - 网络出口策略双档：本机宽松 / 共享部署收紧（私网 MCP、外发 URL）。

10. **知识/附件删除原子性**  
    - 先清资源再删元数据；失败可 reconcile（防孤儿与幽灵索引）。

11. **Memory 可见性诚实**  
    - 文档：进模型的记忆=离开本机；对齐 quiet 与隐私。

### P2 — 明确不抄

12. **不以浏览器为真相库**（Hearth 是 Daemon）。  
13. **不以聊天为唯一主轴** 取代 Board。  
14. **不**默认「启用插件即无限 auto tool」（Hearth 保留 L0/apply）。  
15. **不**把 remote-MCP-only 当唯一 MCP 策略（Hearth 可本机 stdio）。

---

## 7. 域映射一图

```text
Neo Session/Chat     ≈  Hearth Session（交互线程）
Neo Message+blocks   ≈  Timeline + Artifact 块
Neo Workspace        ≈  轻 Project 切片 / chat 上下文
Neo Assistant        ≈  Member 人设 / 模板
Neo Skill (text)     ≈  skills/*.md 注入
Neo Plugin/MCP       ≈  tools + MCP Adapter
Neo Memory           ≈  Brain / memory/
Neo Knowledge        ≈  knowledge/ + 后段 RAG
Neo generationError  ≈  结构化失败，非 transcript 污染
Neo contextBudget    ≈  Session 上下文规划器
Neo /api/health      ≈  hearth doctor / Ops
```

---

## 8. 风险与边界（Neo 自身）

| 风险 | 说明 |
|------|------|
| 浏览器数据易失 | 清站 = 丢历史；需用户导出纪律 |
| 启用即 auto tool | 信任安装面；无 per-call 确认 |
| 非 SaaS | 公开多用户缺账号/租户 |
| MCP 仅 remote | 本机 stdio 生态不全 |
| 上游必见内容 | local-first ≠ 模型不可见 |

---

## 9. 参考路径

| 路径 | 内容 |
|------|------|
| `README.md` / `README.zh-CN.md` | 产品面与部署 |
| `docs/privacy-and-local-data.md` | 存储分层与 BYOK |
| `docs/reliability-and-safety.md` | 生成错误、插件风险、预算、沙箱 |
| `docs/plugin-development.md` | Plugin/MCP 合同 |
| `docs/deployment-hardening.md` | hosted 硬化 |
| `src/lib/chat/contextBudget.ts` | 上下文规划 |
| `src/lib/{skills,plugin,mcp,memory,byok,security}/` | 域模块 |
| `src/store/` | 持久化与迁移 |
| `ROADMAP.md` · `AGENTS.md` | 方向与贡献约定 |

---

## 10. 一句话收束

**Neo Chat 证明：local-first 聊天工作区的关键不是「功能堆满」，而是「数据默认在用户侧 + 服务端只代理 + Skills/Tools 硬分界 + 错误不污染 transcript + 上下文统一预算 + 部署诚实边界」；Hearth 应把这些收成 Daemon 侧的 skills/tools 合同、Session 错误模型、context planner 与 doctor 健康面，并继续以 Board/WorkItem 为中心。**
