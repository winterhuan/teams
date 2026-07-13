import type {
  AcpRuntime,
  AcpRuntimeEnsureInput,
  AcpRuntimeEvent,
  AcpRuntimeTurn,
  AcpRuntimeTurnInput,
} from "acpx/runtime";
import { expect, it, vi } from "vitest";
import type { ThreadSessionLaunchSpec } from "../src/index.ts";
import { AcpxAdapter } from "../src/provider/acpx-adapter.ts";

function spec(): ThreadSessionLaunchSpec {
  return {
    sessionId: "session-1",
    threadId: "thread-1",
    turnId: "turn-1",
    prompt: "write and read",
    cwd: "/tmp/workspace",
    hearthProviderId: "pi",
    modelProvider: "agnes-ai",
    model: "agnes-2.0-flash",
  };
}

function runtimeWith(events: AcpRuntimeEvent[], result: AcpRuntimeTurn["result"]): {
  runtime: AcpRuntime;
  ensureSession: ReturnType<typeof vi.fn>;
  startTurn: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
} {
  const ensureSession = vi.fn(async (_input: AcpRuntimeEnsureInput) => ({
    sessionKey: "hearth-session:session-1",
    backend: "acpx",
    runtimeSessionName: "runtime-handle",
    cwd: "/tmp/workspace",
    acpxRecordId: "hearth-session:session-1",
    backendSessionId: "acp-session-1",
    agentSessionId: "pi-session-1",
  }));
  const cancel = vi.fn(async () => {});
  const startTurn = vi.fn((_input: AcpRuntimeTurnInput): AcpRuntimeTurn => ({
    requestId: "turn-1",
    events: {
      async *[Symbol.asyncIterator]() {
        for (const event of events) yield event;
      },
    },
    result,
    cancel,
    closeStream: vi.fn(async () => {}),
  }));
  return {
    ensureSession,
    startTurn,
    cancel,
    runtime: {
      ensureSession,
      startTurn,
      runTurn: vi.fn(),
      cancel: vi.fn(async () => {}),
      close: vi.fn(async () => {}),
    },
  };
}

it("maps an acpx turn into Hearth session and tool events", async () => {
  const fixture = runtimeWith(
    [
      { type: "text_delta", text: "done", stream: "output" },
      { type: "tool_call", text: "write note", toolCallId: "tool-1", status: "in_progress", title: "write" },
      { type: "tool_call", text: "write note", toolCallId: "tool-1", status: "completed", title: "tool call", rawOutput: "ok" },
    ],
    Promise.resolve({ status: "completed", stopReason: "end_turn" }),
  );
  const adapter = new AcpxAdapter({ runtime: fixture.runtime, agent: "pi" });
  const received: Array<{ type: string; [key: string]: unknown }> = [];

  const running = adapter.start(spec(), (event) => received.push(event), {
    tools: ["read", "write"],
    timeoutMs: 90_000,
  });
  await running.completed;

  expect(fixture.ensureSession).toHaveBeenCalledWith(expect.objectContaining({
    sessionKey: "hearth-session:session-1",
    agent: "pi",
    mode: "persistent",
    cwd: "/tmp/workspace",
    sessionOptions: {
      model: "agnes-ai/agnes-2.0-flash",
      allowedTools: ["read", "write"],
    },
  }));
  expect(received).toEqual(expect.arrayContaining([
    expect.objectContaining({
      type: "session.provider_bound",
      providerSessionRef: "hearth-session:session-1",
      agentSessionId: "pi-session-1",
    }),
    expect.objectContaining({ type: "session.running" }),
    expect.objectContaining({ type: "assistant.delta", text: "done" }),
    expect.objectContaining({ type: "tool.started", toolCallId: "tool-1" }),
    expect.objectContaining({ type: "tool.ended", toolCallId: "tool-1", toolName: "write", isError: false }),
    expect.objectContaining({ type: "session.completed", stopReason: "end_turn" }),
  ]));
});

it("cooperatively cancels the active acpx turn", async () => {
  let finish!: (value: { status: "cancelled" }) => void;
  const result = new Promise<{ status: "cancelled" }>((resolve) => { finish = resolve; });
  const fixture = runtimeWith([], result);
  const adapter = new AcpxAdapter({ runtime: fixture.runtime });
  const received: Array<{ type: string; [key: string]: unknown }> = [];
  const running = adapter.start(spec(), (event) => received.push(event));

  await vi.waitFor(() => expect(fixture.startTurn).toHaveBeenCalledOnce());
  running.cancel();
  finish({ status: "cancelled" });
  await running.completed;

  expect(fixture.cancel).toHaveBeenCalledOnce();
  expect(received).toContainEqual(expect.objectContaining({ type: "session.cancelled" }));
  expect(received).not.toContainEqual(expect.objectContaining({ type: "session.failed" }));
});

it("normalizes acpx timeout failures", async () => {
  const fixture = runtimeWith([], Promise.resolve({
    status: "failed",
    error: { message: "ACP turn timed out", detailCode: "timeout" },
  }));
  const adapter = new AcpxAdapter({ runtime: fixture.runtime });
  const received: Array<{ type: string; [key: string]: unknown }> = [];

  await adapter.start(spec(), (event) => received.push(event), { timeoutMs: 12_345 }).completed;

  expect(fixture.startTurn).toHaveBeenCalledWith(expect.objectContaining({ timeoutMs: 12_345 }));
  expect(received).toContainEqual(expect.objectContaining({
    type: "session.failed",
    reason: "timeout",
  }));
});

it("preserves non-timeout provider failures", async () => {
  const fixture = runtimeWith([], Promise.resolve({
    status: "failed",
    error: { message: "provider unavailable", code: "ACP_TURN_FAILED" },
  }));
  const adapter = new AcpxAdapter({ runtime: fixture.runtime });
  const received: Array<{ type: string; [key: string]: unknown }> = [];

  await adapter.start(spec(), (event) => received.push(event)).completed;

  expect(received).toContainEqual(expect.objectContaining({
    type: "session.failed",
    reason: "provider_error",
    code: "ACP_TURN_FAILED",
  }));
});
