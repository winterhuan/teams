# Issue 03 acpx/runtime 验收证据

日期：2026-07-13

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

## 越界拒绝

命令：

```text
pnpm vitest run packages/core/test/pi-tools.contract.test.ts
```

去敏事件：

```text
tool.started { toolName: "write", toolCallId: "<redacted>" }
tool.ended   { toolName: "write", isError: true }
```

断言：scratch 外目标文件不存在，拒绝发生在副作用前。另有 Level 1 symlink 回归测试覆盖 scratch 内符号链接指向外部的路径逃逸。

## 全量结果

```text
pnpm test
Test Files  8 passed
Tests       22 passed

pnpm typecheck
exit 0
```
