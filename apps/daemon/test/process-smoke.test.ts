import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, expect, it } from "vitest";

const directories: string[] = [];

function run(...args: string[]): unknown {
  const stdout = execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--experimental-transform-types",
      resolve("apps/daemon/src/main.ts"),
      ...args,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  return JSON.parse(stdout) as unknown;
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

it("persists a Project across independent hearthd processes", () => {
  const directory = mkdtempSync(join(tmpdir(), "hearthd-process-"));
  directories.push(directory);
  const databasePath = join(directory, "hearth.db");
  const command = JSON.stringify({
    type: "project.create",
    idempotencyKey: "process-smoke-01",
    actor: { type: "principal", id: "principal-local" },
    reason: "Prove process restart persistence",
    project: { name: "Process Project" },
  });

  const created = run(
    "--db",
    databasePath,
    "--json",
    command,
    "create-project",
  ) as { ok: true; value: { projectId: string; timelineEventId: string } };
  const replayed = run(
    "--db",
    databasePath,
    "--json",
    command,
    "create-project",
  );
  const grid = run("--db", databasePath, "project-grid");
  const detail = run(
    "--db",
    databasePath,
    "--project-id",
    created.value.projectId,
    "project-detail",
  );

  expect(replayed).toEqual({
    ok: true,
    value: { ...created.value, replayed: true },
  });
  expect(grid).toEqual({
    ok: true,
    value: {
      projects: [
        expect.objectContaining({ projectId: created.value.projectId }),
      ],
    },
  });
  expect(detail).toEqual({
    ok: true,
    value: expect.objectContaining({ projectId: created.value.projectId }),
  });
});

it("runs a real acpx Pi tool Session through the public hearthd command", () => {
  const directory = mkdtempSync(join(tmpdir(), "hearthd-acpx-"));
  directories.push(directory);
  const databasePath = join(directory, "hearth.db");
  const created = run(
    "--db",
    databasePath,
    "--json",
    JSON.stringify({
      type: "project.create",
      idempotencyKey: "process-acpx-project",
      actor: { type: "principal", id: "principal-local" },
      reason: "Create public command fixture",
      project: { name: "ACP Process Project" },
    }),
    "create-project",
  ) as { ok: true; value: { projectId: string } };

  const result = run(
    "--db",
    databasePath,
    "--project-id",
    created.value.projectId,
    "--prompt",
    "Use the write tool to create note.txt containing exactly HEARTH_DAEMON_ACPX_OK. Wait for it to finish, then use read to verify note.txt.",
    "--cwd",
    directory,
    "start-thread-session",
  ) as {
    ok: true;
    value: {
      sessionId: string;
      hud: { status: string; providerSessionRef: string };
      events: Array<Record<string, unknown>>;
    };
  };

  expect(readFileSync(join(directory, "note.txt"), "utf8")).toBe("HEARTH_DAEMON_ACPX_OK");
  expect(result.value.hud).toMatchObject({
    status: "completed",
    providerSessionRef: `hearth-session:${result.value.sessionId}`,
  });
  expect(result.value.events).toEqual(expect.arrayContaining([
    expect.objectContaining({ type: "tool.started", toolName: "write" }),
    expect.objectContaining({ type: "tool.ended", toolName: "write", isError: false }),
    expect.objectContaining({ type: "tool.started", toolName: "read" }),
    expect.objectContaining({ type: "tool.ended", toolName: "read", isError: false }),
  ]));
}, 120_000);

it("rejects a Session cwd outside the configured scratch root", () => {
  const scratchRoot = mkdtempSync(join(tmpdir(), "hearthd-scratch-root-"));
  const outside = mkdtempSync(join(tmpdir(), "hearthd-outside-root-"));
  directories.push(scratchRoot, outside);
  const databasePath = join(scratchRoot, "hearth.db");
  const created = run(
    "--db",
    databasePath,
    "--json",
    JSON.stringify({
      type: "project.create",
      idempotencyKey: "scratch-policy-project",
      actor: { type: "principal", id: "principal-local" },
      reason: "Create scratch policy fixture",
      project: { name: "Scratch Policy Project" },
    }),
    "create-project",
  ) as { ok: true; value: { projectId: string } };

  expect(() => execFileSync(
    process.execPath,
    [
      "--experimental-strip-types",
      "--experimental-transform-types",
      resolve("apps/daemon/src/main.ts"),
      "--db",
      databasePath,
      "--project-id",
      created.value.projectId,
      "--prompt",
      "hello",
      "--cwd",
      outside,
      "start-thread-session",
    ],
    {
      encoding: "utf8",
      env: { ...process.env, HEARTH_SCRATCH_ROOT: scratchRoot },
    },
  )).toThrow(/--cwd must be inside the configured scratch root/u);
});
