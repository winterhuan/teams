import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AcpSessionRecord } from "acpx/runtime";
import { afterEach, expect, it } from "vitest";
import { SqliteAcpSessionStore } from "../src/provider/sqlite-acp-session-store.ts";

const directories: string[] = [];

afterEach(async () => {
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

function record(id: string, title: string): AcpSessionRecord {
  const now = new Date().toISOString();
  return {
    schema: "acpx.session.v1",
    acpxRecordId: id,
    acpSessionId: `acp-${id}`,
    agentCommand: "pi-acp",
    cwd: "/tmp/workspace",
    createdAt: now,
    lastUsedAt: now,
    lastSeq: 0,
    eventLog: {
      active_path: `/tmp/${id}.stream.ndjson`,
      segment_count: 5,
      max_segment_bytes: 64 * 1024 * 1024,
      max_segments: 5,
    },
    messages: [],
    updated_at: now,
    cumulative_token_usage: {},
    request_token_usage: {},
    title,
  };
}

it("persists and replaces complete acpx session records in runtime SQLite", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hearth-acpx-store-"));
  directories.push(directory);
  const databasePath = join(directory, "acpx.db");
  const firstStore = new SqliteAcpSessionStore(databasePath);

  await firstStore.save(record("hearth-session:s1", "first"));
  expect(await firstStore.load("hearth-session:s1")).toMatchObject({
    acpxRecordId: "hearth-session:s1",
    title: "first",
  });
  await firstStore.save(record("hearth-session:s1", "updated"));
  firstStore.close();

  const reopened = new SqliteAcpSessionStore(databasePath);
  expect(await reopened.load("hearth-session:s1")).toMatchObject({
    acpxRecordId: "hearth-session:s1",
    title: "updated",
  });
  expect(await reopened.load("missing")).toBeUndefined();
  reopened.close();
});
