import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
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
    { encoding: "utf8" },
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
