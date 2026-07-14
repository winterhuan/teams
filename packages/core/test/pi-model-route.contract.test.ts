import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createAcpRuntime, createAgentRegistry, type AcpRuntimeHandle } from "acpx/runtime";
import { afterAll, expect, it } from "vitest";
import { PI_AGNES_ACP_MODEL_ID, SqliteAcpSessionStore } from "../src/index.ts";

const directories: string[] = [];
const stores: SqliteAcpSessionStore[] = [];
const runtimes: Array<{ close(input: { handle: AcpRuntimeHandle; reason: string }): Promise<void> }> = [];
const handles: AcpRuntimeHandle[] = [];

afterAll(async () => {
  await Promise.all(handles.map((handle, index) =>
    runtimes[index]?.close({ handle, reason: "drift-guard done" })));
  for (const store of stores) store.close();
  for (const directory of directories) await rm(directory, { recursive: true, force: true });
});

// Drift guard: Pi advertises its model namespace through acpx. The Hearth
// ledger route pins `PI_AGNES_ACP_MODEL_ID`; this test fails fast (before any
// Session launch) if an upstream Pi rename drops that id from the advertised
// list — turning a runtime `provider_error` into a checkable contract.
it(
  "advertises the pinned Pi Agnes ACP model id",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-pi-model-route-"));
    directories.push(directory);
    const store = new SqliteAcpSessionStore(join(directory, "acpx.db"));
    stores.push(store);
    const runtime = createAcpRuntime({
      cwd: directory,
      sessionStore: store,
      agentRegistry: createAgentRegistry(),
      permissionMode: "approve-all",
      nonInteractivePermissions: "deny",
    });

    const handle = await runtime.ensureSession({
      sessionKey: `hearth-session:${crypto.randomUUID()}`,
      agent: "pi",
      mode: "persistent",
      cwd: directory,
    });
    runtimes.push(runtime);
    handles.push(handle);

    const status = await runtime.getStatus?.({ handle });
    const availableModelIds = status?.models?.availableModelIds ?? [];

    expect(availableModelIds.length).toBeGreaterThan(0);
    expect(availableModelIds).toContain(PI_AGNES_ACP_MODEL_ID);
  },
  120_000,
);
