# Issue 03 acpx/runtime 验收证据

日期：2026-07-13（首个闭环验收）
校准注记：2026-07-14 边界移除，见文末。

## 公开 Daemon 闭环

命令：

```text
pnpm vitest run apps/daemon/test/process-smoke.test.ts -t "runs a real acpx Pi tool Session"
```

去敏后的实际链路与持久标识：

```text
hearthd start-thread-session
  provider/model: pi → agnes-ai/agnes-2.0-flash
  transport: acpx/runtime → pi-acp@0.0.31 → pi --mode rpc
  Hearth Session: <redacted-uuid>
  providerSessionRef: hearth-session:<redacted-uuid>
  AcpSessionStore: <hearth.db>.acpx.db

session.provider_bound
session.running
tool.started  { toolName: "write", toolCallId: "<redacted>" }
tool.ended    { toolName: "write", isError: false }
tool.started  { toolName: "read", toolCallId: "<redacted>" }
tool.ended    { toolName: "read", isError: false }
session.completed
```

断言：`note.txt` 内容为 `HEARTH_DAEMON_ACPX_OK`；HUD 状态为 `completed`；映射与 Session ID 一致。

## 越界拒绝（历史事实，当前已不生效）

日期：2026-07-13。本节记录 Issue 03 首个闭环验收当时的事实，用于回溯审计。

命令（当时通过）：

```text
pnpm vitest run packages/core/test/pi-tools.contract.test.ts
```

去敏事件：

```text
tool.started { toolName: "write", toolCallId: "<redacted>" }
tool.ended   { toolName: "write", isError: true }
```

断言：scratch 外目标文件不存在，拒绝发生在副作用前。另有 Level 1 symlink 回归测试覆盖 scratch 内符号链接指向外部的路径逃逸。

## 全量结果（首个闭环快照）

```text
pnpm test
Test Files  8 passed
Tests       22 passed

pnpm typecheck
exit 0
```

## 2026-07-14 边界移除校准

经产品决策，首个闭环放弃 Issue 03 期间实现的 Hearth launcher + 工具 allowlist + 副作用前路径 gate 边界（[ADR 0006](../../../docs/adr/0006-acpx-runtime-as-provider-transport.md) §4、[ADR 0005](../../../docs/adr/0005-typescript-first-small-host-nanoclaw-principles.md) §3 安全边界注记）：

- 已删除文件：`apps/daemon/bin/hearth-pi`、`apps/daemon/src/pi-tool-gate-extension.ts`、`apps/daemon/test/pi-tool-gate-extension.test.ts`、`packages/core/test/pi-tools.contract.test.ts`，以及 `apps/daemon/test/process-smoke.test.ts` 中的 scratch-root 用例。
- 当前 Session 直接用 acpx 内置 `pi` agent（`createAgentRegistry()`，不再覆盖 `pi` 命令）；`acpx/runtime.permissionMode` 固定 `approve-all`；`--cwd` 不校验 scratch 根；不裁剪工具面、不设路径 gate、不设 cwd 沙箱。
- 因此上文「越界拒绝」一节记录的是 Issue 03 完成当时的事实，**当前代码不再复现该断言**；本文件在此保留作历史，用于日后回溯首个闭环期间存在过的边界与其取舍。
- 上方「公开 Daemon 闭环」的真实工具往返仍然成立，且是当前主 checklist 的支撑证据；`process-smoke.test.ts` 保留 `runs a real acpx Pi tool Session` 用例。
- 治理门（工具面裁剪、path/policy gate、Posting autonomy、Approval）留给 Issue 11（Posting）与 Issue 27（Approval），届时的强制点不应依赖单一 Provider 特性。

## 2026-07-14 model route 解耦校准（重跑验收发现）

重跑 Pi + Agnes 真实验收时，`pi-agnes.contract.test.ts` 报 `session.failed / provider_error`：

```text
Cannot apply --model "agnes-ai/agnes-2.0-flash": the ACP agent did not advertise that model.
Available models: agnes/agnes-2.0-flash, pp/claude-*, pp/gpt-*, pp/deepseek-*, pp/glm-*, pp/kimi-*, pp/minimax-*.
```

根因：`AcpxAdapter` 曾用 `model: \`${spec.modelProvider}/${spec.model}\`` 把 **Hearth 账本身份**（`modelProvider="agnes-ai"`）拼进 **Pi ACP model 命名空间**。Pi ACP 现在 advertise 的是 `agnes/agnes-2.0-flash`（前缀 `agnes` 而非 `agnes-ai`），字符串拼接一遇上游前缀改名即断。经 `runtime.getStatus({ handle }).models.availableModelIds` 实测，Pi 默认模型已是 `agnes/agnes-2.0-flash`，完整列表见上。

修复（解耦，不写死拼接）：

- `ThreadSessionLaunchSpec` / route 新增独立字段 `acpModelId`（Pi ACP 真实 model id），与账本 `modelProvider` / `model` 分离；后者仍作 provenance / HUD / cost 归集，PRD/ADR/annex 记名不变。
- ACP model id 由 `resolveAcpModelId(route)` 解析，当前 Agnes 单路由固定为常量 `PI_AGNES_ACP_MODEL_ID = "agnes/agnes-2.0-flash"`；后续配置面将改为从 `getStatus().models.availableModelIds` 拉取供用户选择（发现式），不再硬编码。
- `AcpxAdapter` 改为直接 `model: spec.acpModelId`，并对 acpx `RequestedModelUnsupportedError` 做归一化诊断。

重跑结果（`pnpm test`）：

```text
Test Files  8 passed
Tests      25 passed
（含真实 pi-agnes、真实 process-smoke acpx Pi 工具往返、真实 codex-agnes bridge 两轮）

pnpm typecheck  exit 0
```

因此本文件顶部「公开 Daemon 闭环」trace 里的 `provider/model: pi → agnes-ai/agnes-2.0-flash` 是 Hearth 账本记名（仍成立）；送入 Pi ACP 的实际 model id 现为 `agnes/agnes-2.0-flash`，两者由 `acpModelId` 显式分离。
