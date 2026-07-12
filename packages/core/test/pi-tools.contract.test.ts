import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterAll, expect, it } from "vitest";
import type { ThreadSessionLaunchSpec } from "../src/index.ts";
import { PiAdapter } from "../src/provider/pi-adapter.ts";

const directories: string[] = [];
afterAll(async () => {
  for (const directory of directories) await rm(directory, { recursive: true, force: true });
});

function spec(cwd: string, prompt: string): ThreadSessionLaunchSpec {
  return {
    sessionId: crypto.randomUUID(),
    threadId: crypto.randomUUID(),
    turnId: crypto.randomUUID(),
    prompt,
    cwd,
    hearthProviderId: "pi",
    modelProvider: "agnes-ai",
    model: "agnes-2.0-flash",
  };
}

it(
  "executes a real model-directed write/read round trip inside scratch",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-tool-ok-"));
    directories.push(directory);
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    const adapter = new PiAdapter({
      toolExtension: resolve("apps/daemon/src/pi-tool-gate-extension.ts"),
    });
    const running = adapter.start(
      spec(
        directory,
        "Use the write tool to create note.txt containing exactly HEARTH_TOOL_OK. Then use the read tool to verify it. You must call both tools before answering briefly.",
      ),
      (event) => events.push(event),
      { tools: ["read", "write"], timeoutMs: 90_000 },
    );

    await running.completed;

    const failed = events.find((event) => event.type === "session.failed");
    expect(failed, `Provider failed before completing tool round trip: ${JSON.stringify(failed)}`).toBeUndefined();
    expect(await readFile(join(directory, "note.txt"), "utf8")).toBe("HEARTH_TOOL_OK");
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "tool.started", toolName: "write" }),
        expect.objectContaining({ type: "tool.ended", toolName: "write", isError: false }),
        expect.objectContaining({ type: "tool.started", toolName: "read" }),
        expect.objectContaining({ type: "tool.ended", toolName: "read", isError: false }),
      ]),
    );
  },
  120_000,
);

it(
  "blocks a real model-directed write outside scratch before side effects",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-tool-deny-"));
    directories.push(directory);
    const outsidePath = join(tmpdir(), `hearth-forbidden-${crypto.randomUUID()}.txt`);
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    const adapter = new PiAdapter({
      toolExtension: resolve("apps/daemon/src/pi-tool-gate-extension.ts"),
    });
    const running = adapter.start(
      spec(
        directory,
        `Use the write tool once to write FORBIDDEN to the absolute path ${outsidePath}. Do not choose another path.`,
      ),
      (event) => events.push(event),
      { tools: ["write"], timeoutMs: 90_000 },
    );

    await running.completed;

    const failed = events.find((event) => event.type === "session.failed");
    expect(failed, `Provider failed before exercising the path gate: ${JSON.stringify(failed)}`).toBeUndefined();
    await expect(readFile(outsidePath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "tool.denied",
        toolName: "write",
        reason: "path_outside_workspace",
      }),
    );
  },
  120_000,
);
