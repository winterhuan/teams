import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAcpRuntime, createAgentRegistry } from "acpx/runtime";
import { afterAll, expect, it } from "vitest";
import {
  AcpxAdapter,
  CODEX_NATIVE_ACP_MODEL_ID,
  SqliteAcpSessionStore,
  type NormalizedProviderEvent,
} from "../src/index.ts";

const directories: string[] = [];
const adapters: AcpxAdapter[] = [];
const sessionStores: SqliteAcpSessionStore[] = [];

afterAll(async () => {
  for (const adapter of adapters) await adapter.close();
  for (const sessionStore of sessionStores) sessionStore.close();
  for (const directory of directories) {
    await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});

it(
  "completes a real Codex native turn through the shared acpx seam",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-codex-native-"));
    directories.push(directory);
    execFileSync("git", ["init"], { cwd: directory });
    execFileSync("git", ["commit", "--allow-empty", "-m", "init"], {
      cwd: directory,
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "t",
        GIT_AUTHOR_EMAIL: "t@t",
        GIT_COMMITTER_NAME: "t",
        GIT_COMMITTER_EMAIL: "t@t",
      },
    });

    const sessionStore = new SqliteAcpSessionStore(join(directory, "acpx.db"));
    sessionStores.push(sessionStore);
    const adapter = new AcpxAdapter({
      runtime: createAcpRuntime({
        cwd: directory,
        sessionStore,
        agentRegistry: createAgentRegistry(),
        permissionMode: "approve-all",
        nonInteractivePermissions: "deny",
      }),
      agent: "codex",
    });
    adapters.push(adapter);

    const events: NormalizedProviderEvent[] = [];
    const sessionId = crypto.randomUUID();
    const running = adapter.start(
      {
        sessionId,
        threadId: crypto.randomUUID(),
        turnId: crypto.randomUUID(),
        prompt: "Reply with exactly HEARTH_CODEX_NATIVE_OK and nothing else.",
        cwd: directory,
        hearthProviderId: "codex",
        modelProvider: "openai",
        model: "gpt-5.5",
        acpModelId: CODEX_NATIVE_ACP_MODEL_ID,
      },
      (event) => events.push(event),
      { timeoutMs: 90_000 },
    );
    await running.completed;

    const bound = events.find((event) => event.type === "session.provider_bound");
    expect(bound?.providerSessionRef).toBe(`hearth-session:${sessionId}`);
    expect(events.some((event) => event.type === "session.running")).toBe(true);
    const text = events
      .filter((event) => event.type === "assistant.delta")
      .map((event) => event.text as string)
      .join("");
    expect(text).toContain("HEARTH_CODEX_NATIVE_OK");
    expect(events).toContainEqual(
      expect.objectContaining({ type: "session.completed", stopReason: expect.any(String) }),
    );
  },
  120_000,
);
