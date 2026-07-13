import { isAbsolute, relative, resolve } from "node:path";
import type { AcpPermissionDecision, AcpPermissionRequest } from "acpx/runtime";

type SessionPolicy = Readonly<{
  cwd: string;
  tools: ReadonlySet<string>;
}>;

function normalizedToolName(title: string | null | undefined): string | null {
  const name = title?.trim().toLowerCase().split(/\s+/u)[0];
  return name === undefined || name.length === 0 ? null : name;
}

function collectPaths(value: unknown, paths: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, paths);
    return;
  }
  if (typeof value !== "object" || value === null) return;
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === "string" && /(?:^|_)path$/iu.test(key)) paths.push(child);
    else collectPaths(child, paths);
  }
}

function inside(cwd: string, path: string): boolean {
  const absolute = resolve(cwd, path);
  const rel = relative(cwd, absolute);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
}

export class AcpWorkspacePermissionPolicy {
  readonly #sessions = new Map<string, SessionPolicy>();

  bind(sessionId: string, input: { cwd: string; tools: readonly string[] }): void {
    this.#sessions.set(sessionId, {
      cwd: resolve(input.cwd),
      tools: new Set(input.tools.map((tool) => tool.toLowerCase())),
    });
  }

  unbind(sessionId: string): void {
    this.#sessions.delete(sessionId);
  }

  decide(request: AcpPermissionRequest): AcpPermissionDecision {
    const policy = this.#sessions.get(request.sessionId);
    if (policy === undefined) return { outcome: "reject_once" };

    const toolName = normalizedToolName(request.raw.toolCall.title);
    if (toolName === null || !policy.tools.has(toolName)) return { outcome: "reject_once" };

    const paths = (request.raw.toolCall.locations ?? []).map((location) => location.path);
    collectPaths(request.raw.toolCall.rawInput, paths);
    if (paths.length === 0 || paths.some((path) => !inside(policy.cwd, path))) {
      return { outcome: "reject_once" };
    }
    return { outcome: "allow_once" };
  }
}
