import type {
  AcpRuntime,
  AcpRuntimeEvent,
  AcpRuntimeHandle,
  AcpRuntimeTurn,
  AcpRuntimeUsageBreakdown,
} from "acpx/runtime";
import type {
  RunningProviderProcess,
  ThreadSessionLaunchSpec,
} from "../application/contracts.ts";

export type NormalizedProviderEvent = Readonly<{
  type: string;
  at: string;
  [key: string]: unknown;
}>;

function now(): string {
  return new Date().toISOString();
}

function terminalToolStatus(status: string | undefined): boolean {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function usageFrom(breakdown: AcpRuntimeUsageBreakdown | undefined): {
  input: number;
  output: number;
  totalTokens: number;
} {
  return {
    input: breakdown?.inputTokens ?? 0,
    output: breakdown?.outputTokens ?? 0,
    totalTokens: breakdown?.totalTokens ?? 0,
  };
}

export class AcpxAdapter {
  readonly #runtime: AcpRuntime;

  readonly #agent: string;

  readonly #handles = new Map<string, AcpRuntimeHandle>();

  constructor(options: { runtime: AcpRuntime; agent?: string }) {
    this.#runtime = options.runtime;
    this.#agent = options.agent ?? "pi";
  }

  start(
    spec: ThreadSessionLaunchSpec,
    onEvent: (event: NormalizedProviderEvent) => void,
    options: { tools?: readonly string[]; timeoutMs?: number } = {},
  ): RunningProviderProcess {
    const abortController = new AbortController();
    let turn: AcpRuntimeTurn | undefined;
    let cancelled = false;

    const completed = (async () => {
      try {
        const handle = await this.#runtime.ensureSession({
          sessionKey: `hearth-session:${spec.sessionId}`,
          agent: this.#agent,
          mode: "persistent",
          cwd: spec.cwd,
          sessionOptions: {
            model: `${spec.modelProvider}/${spec.model}`,
            ...(options.tools === undefined ? {} : { allowedTools: [...options.tools] }),
          },
        });
        this.#handles.set(handle.sessionKey, handle);
        onEvent({
          type: "session.provider_bound",
          at: now(),
          providerSessionRef: handle.acpxRecordId ?? handle.sessionKey,
          backendSessionId: handle.backendSessionId,
          agentSessionId: handle.agentSessionId,
        });
        onEvent({ type: "session.running", at: now(), processId: null });

        turn = this.#runtime.startTurn({
          handle,
          text: spec.prompt,
          mode: "prompt",
          requestId: spec.turnId,
          ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
          signal: abortController.signal,
        });

        const startedTools = new Map<string, { name: string; input: unknown }>();
        const endedTools = new Set<string>();
        let lastUsage: AcpRuntimeUsageBreakdown | undefined;
        for await (const event of turn.events) {
          lastUsage = this.#emitRuntimeEvent(event, onEvent, startedTools, endedTools) ?? lastUsage;
        }

        const result = await turn.result;
        if (result.status === "completed") {
          onEvent({
            type: "session.completed",
            at: now(),
            stopReason: result.stopReason ?? "unknown",
            usage: usageFrom(lastUsage),
          });
        } else if (result.status === "cancelled") {
          onEvent({
            type: "session.cancelled",
            at: now(),
          });
        } else {
          const timedOut = result.error.detailCode === "timeout"
            || /timed? out|timeout/iu.test(result.error.message);
          onEvent({
            type: "session.failed",
            at: now(),
            reason: timedOut ? "timeout" : "provider_error",
            message: result.error.message,
            code: result.error.code,
            detailCode: result.error.detailCode,
            retryable: result.error.retryable,
          });
        }
      } catch (error) {
        if (cancelled) onEvent({ type: "session.cancelled", at: now() });
        else {
          onEvent({
            type: "session.failed",
            at: now(),
            reason: "provider_error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      }
    })();

    return {
      completed,
      cancel() {
        cancelled = true;
        abortController.abort();
        void turn?.cancel({ reason: "Cancelled by Hearth" });
      },
    };
  }

  async close(): Promise<void> {
    const handles = [...this.#handles.values()];
    this.#handles.clear();
    await Promise.all(handles.map((handle) => this.#runtime.close({
      handle,
      reason: "Hearth adapter shutdown",
    })));
  }

  #emitRuntimeEvent(
    event: AcpRuntimeEvent,
    onEvent: (event: NormalizedProviderEvent) => void,
    startedTools: Map<string, { name: string; input: unknown }>,
    endedTools: Set<string>,
  ): AcpRuntimeUsageBreakdown | undefined {
    if (event.type === "text_delta" && event.stream !== "thought") {
      onEvent({ type: "assistant.delta", at: now(), text: event.text });
      return undefined;
    }
    if (event.type === "status") {
      if (event.breakdown !== undefined) {
        onEvent({ type: "cost.sample", at: now(), usage: event.breakdown, cost: event.cost });
      }
      return event.breakdown;
    }
    if (event.type !== "tool_call") return undefined;

    const toolCallId = event.toolCallId ?? `tool:${event.title ?? "unknown"}`;
    const existing = startedTools.get(toolCallId);
    const eventName = event.title ?? event.kind ?? "unknown";
    const toolName = existing?.name ?? eventName;
    if (existing === undefined) {
      startedTools.set(toolCallId, { name: toolName, input: event.rawInput });
      onEvent({
        type: "tool.started",
        at: now(),
        toolCallId,
        toolName,
        input: event.rawInput,
      });
    }
    if (terminalToolStatus(event.status)) {
      if (endedTools.has(toolCallId)) return undefined;
      endedTools.add(toolCallId);
      onEvent({
        type: "tool.ended",
        at: now(),
        toolCallId,
        toolName,
        isError: event.status !== "completed",
        result: event.rawOutput ?? event.content,
      });
    } else {
      onEvent({
        type: "tool.delta",
        at: now(),
        toolCallId,
        toolName,
        status: event.status,
      });
    }
    return undefined;
  }
}
