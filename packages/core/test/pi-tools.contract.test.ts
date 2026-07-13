import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createAcpRuntime, createAgentRegistry } from "acpx/runtime";
import { afterAll, expect, it } from "vitest";
import {
  AcpxAdapter,
  SqliteAcpSessionStore,
  type ThreadSessionLaunchSpec,
} from "../src/index.ts";

const directories: string[] = [];
const adapters: AcpxAdapter[] = [];
const sessionStores: SqliteAcpSessionStore[] = [];
const piCommand = fileURLToPath(new URL("../../../apps/daemon/bin/hearth-pi", import.meta.url));
afterAll(async () => {
  for (const adapter of adapters) await adapter.close();
  for (const sessionStore of sessionStores) sessionStore.close();
  for (const directory of directories) await rm(directory, { recursive: true, force: true });
});

function createAdapter(directory: string): AcpxAdapter {
  const sessionStore = new SqliteAcpSessionStore(join(directory, "acpx.db"));
  sessionStores.push(sessionStore);
  const adapter = new AcpxAdapter({
    runtime: createAcpRuntime({
      cwd: directory,
      sessionStore,
      agentRegistry: createAgentRegistry({
        overrides: { pi: `env PI_ACP_PI_COMMAND=${piCommand} npx -y pi-acp@0.0.31` },
      }),
      permissionMode: "approve-all",
      nonInteractivePermissions: "deny",
    }),
  });
  adapters.push(adapter);
  return adapter;
}

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
  "blocks a real model-directed write outside scratch before side effects",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-tool-deny-"));
    directories.push(directory);
    const outsidePath = join(tmpdir(), `hearth-forbidden-${crypto.randomUUID()}.txt`);
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    const adapter = createAdapter(directory);
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
    expect(events).toContainEqual(expect.objectContaining({
      type: "tool.ended",
      toolName: "write",
      isError: true,
    }));
  },
  120_000,
);
