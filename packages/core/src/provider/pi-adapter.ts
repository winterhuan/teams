import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { open, unlink } from "node:fs/promises";
import { createInterface } from "node:readline";
import type { ThreadSessionLaunchSpec } from "../application/contracts.ts";

export type NormalizedProviderEvent =
  | Readonly<{ type: "session.running"; at: string; processId: number | null }>
  | Readonly<{ type: "assistant.delta"; at: string; text: string }>
  | Readonly<{
      type: "session.completed";
      at: string;
      stopReason: string;
      usage: Readonly<{ input: number; output: number; totalTokens: number }>;
    }>
  | Readonly<{ type: "session.failed"; at: string; reason: "provider_error" | "timeout" | "cancelled"; message: string }>;

export interface RunningProviderProcess {
  readonly completed: Promise<void>;
  cancel(): void;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function numberOrZero(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export class PiAdapter {
  readonly #command: string;

  readonly #toolExtension: string | undefined;

  constructor(options: { command?: string; toolExtension?: string } = {}) {
    this.#command = options.command ?? "pi";
    this.#toolExtension = options.toolExtension;
  }

  health(): Readonly<{ ok: true; command: string }> {
    return { ok: true, command: this.#command };
  }

  start(
    spec: ThreadSessionLaunchSpec,
    onEvent: (event: NormalizedProviderEvent | { type: string; at: string; [key: string]: unknown }) => void,
    options: { tools?: readonly string[]; timeoutMs?: number } = {},
  ): RunningProviderProcess {
    const tracePath = `${spec.cwd}/.hearth-tool-trace-${spec.sessionId}.jsonl`;
    const extensionArgs = this.#toolExtension === undefined ? [] : ["--extension", this.#toolExtension];
    const toolArgs = options.tools === undefined ? ["--no-tools"] : ["--tools", options.tools.join(",")];
    const child = spawn(
      this.#command,
      [
        "--mode",
        "json",
        "--print",
        "--provider",
        spec.modelProvider,
        "--model",
        spec.model,
        ...toolArgs,
        "--no-extensions",
        ...extensionArgs,
        "--no-skills",
        "--no-prompt-templates",
        "--no-context-files",
        "--no-session",
        spec.prompt,
      ],
      {
        cwd: spec.cwd,
        env: {
          HOME: process.env.HOME,
          PATH: process.env.PATH,
          LANG: process.env.LANG ?? "en_US.UTF-8",
          NODE_NO_WARNINGS: "1",
          ...(this.#toolExtension === undefined ? {} : { HEARTH_TOOL_TRACE: tracePath }),
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    onEvent({
      type: "session.running",
      at: new Date().toISOString(),
      processId: child.pid ?? null,
    });

    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-4000);
    });

    const lines = createInterface({ input: child.stdout });
    lines.on("line", (line) => {
      let decoded: unknown;
      try {
        decoded = JSON.parse(line) as unknown;
      } catch {
        return;
      }
      const root = asRecord(decoded);
      if (root === null) return;
      if (root.type === "message_update") {
        const update = asRecord(root.assistantMessageEvent);
        if (update?.type === "text_delta" && typeof update.delta === "string") {
          onEvent({
            type: "assistant.delta",
            at: new Date().toISOString(),
            text: update.delta,
          });
        }
      }
      if (root.type === "message_end") {
        const message = asRecord(root.message);
        if (message?.role === "assistant") {
          const usage = asRecord(message.usage);
          onEvent({
            type: "session.completed",
            at: new Date().toISOString(),
            stopReason:
              typeof message.stopReason === "string" ? message.stopReason : "unknown",
            usage: {
              input: numberOrZero(usage?.input),
              output: numberOrZero(usage?.output),
              totalTokens: numberOrZero(usage?.totalTokens),
            },
          });
        }
      }
    });

    let timedOut = false;
    const timeout = options.timeoutMs === undefined ? undefined : setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
    }, options.timeoutMs);
    const completed = new Promise<void>((resolve) => {
      child.once("close", async (code, signal) => {
        lines.close();
        if (timeout !== undefined) clearTimeout(timeout);
        if (this.#toolExtension !== undefined) {
          try {
            const file = await open(tracePath, "r");
            await file.close();
            const traceLines = createInterface({ input: createReadStream(tracePath) });
            for await (const line of traceLines) {
              try {
                const event = asRecord(JSON.parse(line) as unknown);
                if (event !== null && typeof event.type === "string" && typeof event.at === "string") onEvent(event as { type: string; at: string });
              } catch { /* malformed extension diagnostics are ignored */ }
            }
            await unlink(tracePath);
          } catch { /* no tool event is valid for a text-only response */ }
        }
        if (timedOut || signal === "SIGTERM" || code === 143) {
          onEvent({
            type: "session.failed",
            at: new Date().toISOString(),
            reason: timedOut ? "timeout" : "cancelled",
            message: timedOut ? "Pi timed out" : "Pi was cancelled",
          });
        } else if (code !== 0) {
          onEvent({
            type: "session.failed",
            at: new Date().toISOString(),
            reason: "provider_error",
            message: `Pi exited with code ${String(code)} signal ${String(signal)}: ${stderr}`,
          });
        }
        resolve();
      });
      child.once("error", (error) => {
        onEvent({
          type: "session.failed",
          at: new Date().toISOString(),
          reason: "provider_error",
          message: error.message,
        });
        resolve();
      });
    });

    return {
      completed,
      cancel() {
        child.kill("SIGTERM");
      },
    };
  }
}
