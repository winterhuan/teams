import { DatabaseSync } from "node:sqlite";
import type { AcpSessionRecord, AcpSessionStore } from "acpx/runtime";

const migration = `
CREATE TABLE IF NOT EXISTS acp_session_records (
  acpx_record_id TEXT PRIMARY KEY,
  schema_version TEXT NOT NULL,
  record_json TEXT NOT NULL CHECK(json_valid(record_json)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
) STRICT;
PRAGMA user_version = 1;
`;

function parseRecord(value: unknown): AcpSessionRecord {
  if (typeof value !== "string") throw new Error("invalid acpx session record");
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("invalid acpx session record");
  }
  const record = parsed as Partial<AcpSessionRecord>;
  if (record.schema !== "acpx.session.v1" || typeof record.acpxRecordId !== "string") {
    throw new Error("unsupported acpx session record");
  }
  return record as AcpSessionRecord;
}

export class SqliteAcpSessionStore implements AcpSessionStore {
  readonly #database: DatabaseSync;

  constructor(databasePath: string) {
    this.#database = new DatabaseSync(databasePath);
    this.#database.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
    this.#database.exec(migration);
  }

  async load(sessionId: string): Promise<AcpSessionRecord | undefined> {
    const row = this.#database.prepare(
      "SELECT record_json FROM acp_session_records WHERE acpx_record_id = ?",
    ).get(sessionId) as { record_json?: unknown } | undefined;
    return row === undefined ? undefined : parseRecord(row.record_json);
  }

  async save(record: AcpSessionRecord): Promise<void> {
    this.#database.prepare(
      `INSERT INTO acp_session_records(
         acpx_record_id, schema_version, record_json, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(acpx_record_id) DO UPDATE SET
         schema_version = excluded.schema_version,
         record_json = excluded.record_json,
         updated_at = excluded.updated_at`,
    ).run(
      record.acpxRecordId,
      record.schema,
      JSON.stringify(record),
      record.createdAt,
      record.updated_at,
    );
  }

  close(): void {
    this.#database.close();
  }
}
