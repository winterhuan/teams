import { join } from "node:path";
import type { AcpPermissionRequest } from "acpx/runtime";
import { expect, it } from "vitest";
import { AcpWorkspacePermissionPolicy } from "../src/provider/acp-workspace-permission-policy.ts";

function request(input: {
  title: string;
  rawInput?: unknown;
  path?: string;
}): AcpPermissionRequest {
  return {
    sessionId: "acp-session-1",
    inferredKind: input.title === "read" ? "read" : "edit",
    raw: {
      sessionId: "acp-session-1",
      toolCall: {
        toolCallId: "tool-1",
        title: input.title,
        ...(input.rawInput === undefined ? {} : { rawInput: input.rawInput }),
        ...(input.path === undefined ? {} : { locations: [{ path: input.path }] }),
      },
      options: [],
    },
  };
}

it("allows configured file tools only inside the Session cwd", () => {
  const policy = new AcpWorkspacePermissionPolicy();
  policy.bind("acp-session-1", { cwd: "/tmp/hearth-workspace", tools: ["read", "write"] });

  expect(policy.decide(request({ title: "write", rawInput: { path: "note.txt" } })))
    .toEqual({ outcome: "allow_once" });
  expect(policy.decide(request({ title: "write", path: "/tmp/forbidden.txt" })))
    .toEqual({ outcome: "reject_once" });
  expect(policy.decide(request({ title: "bash", rawInput: { command: "pwd" } })))
    .toEqual({ outcome: "reject_once" });
  expect(policy.decide(request({
    title: "read",
    path: join("/tmp/hearth-workspace", "note.txt"),
  }))).toEqual({ outcome: "allow_once" });
});
