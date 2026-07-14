import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { expect, it } from "vitest";
import { createHearthApplication } from "../src/index.ts";

it("upgrades a v3 ledger without losing events and permits repeated event types", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hearth-migration-"));
  const databasePath = join(directory, "hearth.db");
  let upgraded: DatabaseSync | undefined;
  try {
    const legacy = new DatabaseSync(databasePath);
    legacy.exec(`
      PRAGMA foreign_keys = ON;
      CREATE TABLE projects (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, root_path TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, version INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE timeline_events (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        event_version INTEGER NOT NULL,
        project_id TEXT NOT NULL REFERENCES projects(id),
        actor_json TEXT NOT NULL CHECK(json_valid(actor_json)),
        object_json TEXT NOT NULL CHECK(json_valid(object_json)),
        reason TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        recorded_at TEXT NOT NULL,
        payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
        UNIQUE(project_id, event_type, event_version)
      ) STRICT;
      INSERT INTO projects VALUES ('project-1', 'Migration Project', NULL, 't1', 't1', 1);
      INSERT INTO timeline_events(
        event_id, event_type, event_version, project_id, actor_json,
        object_json, reason, idempotency_key, occurred_at, recorded_at, payload_json
      ) VALUES (
        'event-1', 'issue.status_changed', 1, 'project-1', '{"type":"principal","id":"p1"}',
        '{"type":"issue","id":"issue-1"}', 'first', 'key-1', 't1', 't1', '{}'
      );
      PRAGMA user_version = 3;
    `);
    legacy.close();

    createHearthApplication({ databasePath }).close();

    upgraded = new DatabaseSync(databasePath);
    upgraded.prepare(`
      INSERT INTO timeline_events(
        event_id, event_type, event_version, project_id, actor_json,
        object_json, reason, idempotency_key, occurred_at, recorded_at, payload_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "event-2", "issue.status_changed", 1, "project-1",
      JSON.stringify({ type: "principal", id: "p1" }),
      JSON.stringify({ type: "issue", id: "issue-1" }),
      "second", "key-2", "t2", "t2", JSON.stringify({}),
    );
    const version = upgraded.prepare("PRAGMA user_version").get() as { user_version: number };
    const count = upgraded.prepare("SELECT count(*) AS count FROM timeline_events").get() as { count: number };
    upgraded.close();
    upgraded = undefined;

    expect(version.user_version).toBe(4);
    expect(count.count).toBe(2);
  } finally {
    upgraded?.close();
    await rm(directory, { recursive: true, force: true });
  }
});
