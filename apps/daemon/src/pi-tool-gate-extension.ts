import { appendFileSync, existsSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

function append(event: Record<string, unknown>): void {
  const trace = process.env.HEARTH_TOOL_TRACE;
  if (trace !== undefined) {
    appendFileSync(trace, `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`);
  }
}

function pathFromInput(input: unknown): string | null {
  if (typeof input !== "object" || input === null) return null;
  const path = (input as Record<string, unknown>).path;
  return typeof path === "string" ? path.replace(/^@/, "") : null;
}

function canonicalPath(candidate: string): string {
  const missing: string[] = [];
  let existing = candidate;
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) break;
    missing.unshift(basename(existing));
    existing = parent;
  }
  return resolve(realpathSync(existing), ...missing);
}

export function isPathInsideWorkspace(root: string, candidate: string): boolean {
  const canonicalRoot = realpathSync(root);
  const canonicalCandidate = canonicalPath(resolve(root, candidate));
  const rel = relative(canonicalRoot, canonicalCandidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export default function toolGate(pi: ExtensionAPI): void {
  pi.on("tool_execution_start", (event) => {
    append({
      type: "tool.started",
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      input: event.args,
    });
  });

  pi.on("tool_call", (event, context) => {
    const requestedPath = pathFromInput(event.input);
    if (requestedPath !== null && !isPathInsideWorkspace(context.cwd, requestedPath)) {
      append({
        type: "tool.denied",
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        input: event.input,
        reason: "path_outside_workspace",
      });
      return { block: true, reason: "Hearth path policy: path is outside scratch Workspace" };
    }
  });

  pi.on("tool_execution_update", (event) => {
    append({
      type: "tool.delta",
      toolCallId: event.toolCallId,
      toolName: event.toolName,
    });
  });

  pi.on("tool_execution_end", (event) => {
    append({
      type: "tool.ended",
      toolCallId: event.toolCallId,
      toolName: event.toolName,
      isError: event.isError,
      result: event.result,
    });
  });
}
