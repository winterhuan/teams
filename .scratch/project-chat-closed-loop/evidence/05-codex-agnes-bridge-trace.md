# Issue 05 Codex+Agnes bridge 验收证据（model route 侧）

日期：2026-07-14

## 覆盖范围

本证据只覆盖 Issue 05 拆分后的 **compatibility route 侧**：Codex CLI 通过宿主侧 Responses-to-Chat 兼容网关（`packages/core/src/provider/agnes-codex-bridge.ts`）调用 Agnes `agnes-2.0-flash`，验证真实文本 turn 与 shell 工具 round trip。

**尚未覆盖** Codex 作为 Hearth Provider 经 `acpx/runtime` 的 `codex` agent 接入的 transport 侧闭环：本轮 Codex CLI 由测试 `execFile` 直起，未经 `AcpxAdapter` / `hearthd start-thread-session` 归一化路径。Issue 05 主 checklist 的「同一真实任务分别由 Pi 与 Codex 完成并形成两个独立 Session」「取消真实终止 Codex」「UI 能区分 Hearth Provider / transport / compatibility route / 底层模型」等条目仍未勾选。

## Level 1（bridge 归一化 + 生命周期）

命令：

```text
pnpm vitest run packages/core/test/agnes-codex-bridge.test.ts
```

覆盖：

- Responses `input[].role = developer` 归一化为 `system`，非 `function` 类型工具被剔除；`authorization` header 替换为 upstream `Bearer <redacted>`，SSE `text/event-stream` 反向注入 Codex。
- `localToken` Bearer 校验：错误 token 返回 401 且**不联系上游**。
- 上游错误状态与 body 原样透传（例 `400 { error: { message: "upstream failure" } }`）。
- Codex 端 `AbortController.abort()` 后，upstream 请求同步 close（等价 `turn.cancel` 语义）。

## Level 2（真实端到端）

命令：

```text
pnpm vitest run packages/core/test/codex-agnes.contract.test.ts
```

链路：

```text
test (execFile)
  → node <NVM>/node_modules/@openai/codex/bin/codex.js
        exec --json --skip-git-repo-check --ephemeral
             --sandbox danger-full-access
             --model agnes-2.0-flash
             --config model_provider="agnes_bridge"
             --config model_providers.agnes_bridge.wire_api="responses"
             --config model_providers.agnes_bridge.base_url="http://127.0.0.1:<port>/v1"
             --config model_providers.agnes_bridge.env_key="HEARTH_AGNES_BRIDGE_TOKEN"
  → 本地 agnes-codex-bridge (127.0.0.1:<port>)
  → Agnes /v1/chat/completions
  → agnes-2.0-flash
```

两条真实 turn：

1. 纯文本：prompt `"Reply with exactly HEARTH_CODEX_AGNES_TEXT_OK and nothing else."`；stdout 包含 `HEARTH_CODEX_AGNES_TEXT_OK`，`turn.completed.usage.{input_tokens,output_tokens}` 均为正整数。
2. 工具 round trip：prompt 要求先用 `shell_command` 写 `codex-agnes.txt=HEARTH_CODEX_AGNES_TOOL_OK` 再用 `shell_command` 读回，最后按格式复述；测试目录 `mkdtemp("hearth-codex-agnes-tool-*")`，文件内容按 UTF-8 / UTF-16LE BOM 均可读到 `HEARTH_CODEX_AGNES_TOOL_OK`；stdout 同样有 `HEARTH_CODEX_AGNES_TOOL_OK` 与非零 usage。

去敏 turn.completed 摘要（示例结构，实际 token 值不入库）：

```text
{ "type": "turn.completed",
  "usage": { "input_tokens": <redacted-int>, "output_tokens": <redacted-int> } }
```

## 凭据边界

- Agnes API key 由测试 `agnesCredential()` 从宿主 credential 位置读取：`env AGNES_API_KEY` 优先，否则读 `~/.pi/agent/models.json` 的 `providers.agnes.{apiKey,baseUrl}`；测试文件不携带任何硬编码密钥。
- Agnes raw key 只在宿主进程内存中透传到 bridge，并作为 `Authorization: Bearer <redacted>` 由 bridge 侧 `fetch` 打给 Agnes upstream。
- 交给 Codex 的只有 short-lived `HEARTH_AGNES_BRIDGE_TOKEN`（bridge 生成的 UUID），经 env 传入子进程；不进 argv、不进 Session/HUD 事件、不进 SQLite、不进 Workspace / Artifact。
- Codex CLI 使用 `--ephemeral --ignore-user-config --ignore-rules`，不会把 bridge 相关配置写回 `~/.codex/`。

## 待办（不属于本证据）

- Codex 作为第二个 Hearth Provider 通过 `AcpxAdapter({ agent: "codex" })` + `SqliteAcpSessionStore`（`<hearth.db>.acpx.db`）接入；由 `hearthd start-thread-session` 触发，走 `providers.md` §3–§4 的 acpx 归一化事件。
- Pi + Codex 两个真实 adapter 跑同一 conformance 套件（`ensureSession` / `startTurn` / `turn.result` 归一化 / cancel / error / health），完成后 Provider seam（ADR 0005 §2）与本 issue 主 checklist 的 Provider 双路项才由证据支撑。
- Registry（Issue 04）同时展示 `hearth_provider_id ∈ {pi, codex}` 与各自 model route；Codex 侧 `compatibility_route` 仅在走 bridge 路线时填。
