import { DatabaseSync } from "node:sqlite";
import type {
  CreateProjectResult,
  ProjectDetailReadModel,
  ProjectGridReadModel,
} from "../application/contracts.ts";
import { ApplicationError } from "../application/contracts.ts";
import type {
  Project,
  ProjectCreatedEvent,
} from "../domain/project.ts";

type JsonRecord = Record<string, unknown>;

const migration = `
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK(length(trim(name)) > 0),
  root_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL CHECK(version = 1)
) STRICT;
CREATE TABLE IF NOT EXISTS timeline_events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  event_version INTEGER NOT NULL,
  project_id TEXT NOT NULL REFERENCES projects(id),
  actor_json TEXT NOT NULL CHECK(json_valid(actor_json)),
  object_json TEXT NOT NULL CHECK(json_valid(object_json)),
  reason TEXT NOT NULL CHECK(length(trim(reason)) > 0),
  idempotency_key TEXT NOT NULL,
  occurred_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json)),
  UNIQUE(project_id, event_type, event_version)
) STRICT;
CREATE TABLE IF NOT EXISTS command_receipts (
  command_type TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  committed_at TEXT NOT NULL,
  PRIMARY KEY(command_type, actor_type, actor_id, idempotency_key)
) STRICT;
CREATE TABLE IF NOT EXISTS project_grid_projection (
  project_id TEXT PRIMARY KEY REFERENCES projects(id),
  name TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  default_section TEXT NOT NULL CHECK(default_section = 'chat')
) STRICT;
CREATE TABLE IF NOT EXISTS project_detail_projection (
  project_id TEXT PRIMARY KEY REFERENCES projects(id),
  name TEXT NOT NULL,
  root_path TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  default_section TEXT NOT NULL CHECK(default_section = 'chat')
) STRICT;
CREATE TABLE IF NOT EXISTS threads (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS thread_messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  thread_id TEXT NOT NULL REFERENCES threads(id),
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  text TEXT NOT NULL,
  created_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  owner_type TEXT NOT NULL CHECK(owner_type = 'thread_turn'),
  thread_id TEXT NOT NULL REFERENCES threads(id),
  turn_id TEXT NOT NULL,
  status TEXT NOT NULL,
  hearth_provider_id TEXT NOT NULL,
  model_provider TEXT NOT NULL,
  model TEXT NOT NULL,
  provider_session_ref TEXT,
  cwd TEXT NOT NULL,
  budget_json TEXT NOT NULL CHECK(json_valid(budget_json)),
  last_event_at TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS thread_session_receipts (
  actor_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_fingerprint TEXT NOT NULL,
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  PRIMARY KEY(actor_type, actor_id, idempotency_key)
) STRICT;
CREATE TABLE IF NOT EXISTS session_events (
  sequence INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  event_type TEXT NOT NULL,
  event_at TEXT NOT NULL,
  payload_json TEXT NOT NULL CHECK(json_valid(payload_json))
) STRICT;
`;

function parseJsonRecord(text: unknown): JsonRecord {
  if (typeof text !== "string") {
    throw new ApplicationError("STORAGE_ERROR", "invalid persisted JSON");
  }
  const value: unknown = JSON.parse(text);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ApplicationError("STORAGE_ERROR", "invalid persisted JSON");
  }
  return value as JsonRecord;
}

function requiredString(row: JsonRecord, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new ApplicationError("STORAGE_ERROR", `invalid persisted ${key}`);
  }
  return value;
}

export class SqliteProjectStore {
  readonly #database: DatabaseSync;

  constructor(databasePath: string) {
    this.#database = new DatabaseSync(databasePath);
    this.#database.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
    this.#database.exec(migration);
    const sessionColumns = this.#database.prepare("PRAGMA table_info(sessions)").all() as JsonRecord[];
    if (!sessionColumns.some((column) => column.name === "provider_session_ref")) {
      this.#database.exec("ALTER TABLE sessions ADD COLUMN provider_session_ref TEXT;");
    }
    this.#database.exec("PRAGMA user_version = 3;");
  }

  close(): void {
    this.#database.close();
  }

  findReceipt(scope: {
    commandType: string;
    actorType: string;
    actorId: string;
    idempotencyKey: string;
  }): { fingerprint: string; result: CreateProjectResult } | null {
    const row = this.#database
      .prepare(
        `SELECT request_fingerprint, result_json FROM command_receipts
         WHERE command_type = ? AND actor_type = ? AND actor_id = ? AND idempotency_key = ?`,
      )
      .get(
        scope.commandType,
        scope.actorType,
        scope.actorId,
        scope.idempotencyKey,
      ) as JsonRecord | undefined;
    if (row === undefined) return null;
    const result = parseJsonRecord(row.result_json);
    return {
      fingerprint: requiredString(row, "request_fingerprint"),
      result: {
        projectId: requiredString(result, "projectId"),
        timelineEventId: requiredString(result, "timelineEventId"),
        replayed: false,
      },
    };
  }

  commitCreation(input: {
    project: Project;
    event: ProjectCreatedEvent;
    fingerprint: string;
    result: CreateProjectResult;
  }): void {
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      this.#database
        .prepare(
          `INSERT INTO projects(id, name, root_path, created_at, updated_at, version)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.project.projectId,
          input.project.name,
          input.project.rootPath,
          input.project.createdAt,
          input.project.updatedAt,
          input.project.version,
        );
      this.#database
        .prepare(
          `INSERT INTO timeline_events(
             event_id, event_type, event_version, project_id, actor_json,
             object_json, reason, idempotency_key, occurred_at, recorded_at, payload_json
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          input.event.eventId,
          input.event.type,
          input.event.version,
          input.event.projectId,
          JSON.stringify(input.event.actor),
          JSON.stringify(input.event.object),
          input.event.reason,
          input.event.idempotencyKey,
          input.event.occurredAt,
          input.event.recordedAt,
          JSON.stringify(input.event.payload),
        );
      this.#database
        .prepare(
          `INSERT INTO project_grid_projection(project_id, name, updated_at, default_section)
           VALUES (?, ?, ?, 'chat')`,
        )
        .run(input.project.projectId, input.project.name, input.project.updatedAt);
      this.#database
        .prepare(
          `INSERT INTO project_detail_projection(
             project_id, name, root_path, created_at, updated_at, default_section
           ) VALUES (?, ?, ?, ?, ?, 'chat')`,
        )
        .run(
          input.project.projectId,
          input.project.name,
          input.project.rootPath,
          input.project.createdAt,
          input.project.updatedAt,
        );
      this.#database
        .prepare(
          `INSERT INTO command_receipts(
             command_type, actor_type, actor_id, idempotency_key,
             request_fingerprint, result_json, committed_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          "project.create",
          input.event.actor.type,
          input.event.actor.id,
          input.event.idempotencyKey,
          input.fingerprint,
          JSON.stringify(input.result),
          input.event.recordedAt,
        );
      this.#database.exec("COMMIT");
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  findThreadSessionReceipt(scope: { actorType: string; actorId: string; idempotencyKey: string }): { fingerprint: string; result: { threadId: string; turnId: string; sessionId: string; replayed: false } } | null {
    const row = this.#database.prepare(
      `SELECT request_fingerprint, result_json FROM thread_session_receipts
       WHERE actor_type = ? AND actor_id = ? AND idempotency_key = ?`,
    ).get(scope.actorType, scope.actorId, scope.idempotencyKey) as JsonRecord | undefined;
    if (row === undefined) return null;
    const result = parseJsonRecord(row.result_json);
    return {
      fingerprint: requiredString(row, "request_fingerprint"),
      result: {
        threadId: requiredString(result, "threadId"),
        turnId: requiredString(result, "turnId"),
        sessionId: requiredString(result, "sessionId"),
        replayed: false,
      },
    };
  }

  commitThreadSession(input: {
    projectId: string; threadId: string; turnId: string; sessionId: string; messageId: string;
    prompt: string; cwd: string; budget: { maxTurns: number }; timestamp: string;
    actor: { type: string; id: string }; idempotencyKey: string; fingerprint: string;
  }): void {
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      this.#database.prepare("INSERT INTO threads(id, project_id, created_at) VALUES (?, ?, ?)")
        .run(input.threadId, input.projectId, input.timestamp);
      this.#database.prepare(
        "INSERT INTO thread_messages(id, project_id, thread_id, role, text, created_at) VALUES (?, ?, ?, 'user', ?, ?)",
      ).run(input.messageId, input.projectId, input.threadId, input.prompt, input.timestamp);
      this.#database.prepare(
        `INSERT INTO sessions(id, project_id, owner_type, thread_id, turn_id, status,
          hearth_provider_id, model_provider, model, cwd, budget_json, last_event_at)
         VALUES (?, ?, 'thread_turn', ?, ?, 'queued', 'pi', 'agnes-ai', 'agnes-2.0-flash', ?, ?, ?)`,
      ).run(input.sessionId, input.projectId, input.threadId, input.turnId, input.cwd, JSON.stringify(input.budget), input.timestamp);
      this.#database.prepare(
        `INSERT INTO thread_session_receipts(actor_type, actor_id, idempotency_key, request_fingerprint, result_json)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(input.actor.type, input.actor.id, input.idempotencyKey, input.fingerprint, JSON.stringify({
        threadId: input.threadId, turnId: input.turnId, sessionId: input.sessionId, replayed: false,
      }));
      this.#database.exec("COMMIT");
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  recordSessionEvent(sessionId: string, event: { type: string; at: string; [key: string]: unknown }): void {
    this.#database.exec("BEGIN IMMEDIATE");
    try {
      this.#database.prepare(
        "INSERT INTO session_events(session_id, event_type, event_at, payload_json) VALUES (?, ?, ?, ?)",
      ).run(sessionId, event.type, event.at, JSON.stringify(event));
      const status = event.type === "session.running" ? "running"
        : event.type === "session.completed" ? "completed"
        : event.type === "session.failed" ? "failed"
        : event.type === "session.cancelled" ? "cancelled"
        : null;
      if (status !== null) {
        this.#database.prepare(
          `UPDATE sessions SET status = ?, last_event_at = ?
           WHERE id = ? AND (status != 'cancelled' OR ? = 'cancelled')`,
        ).run(status, event.at, sessionId, status);
      } else {
        this.#database.prepare("UPDATE sessions SET last_event_at = ? WHERE id = ?")
          .run(event.at, sessionId);
      }
      if (event.type === "session.provider_bound" && typeof event.providerSessionRef === "string") {
        this.#database.prepare("UPDATE sessions SET provider_session_ref = ? WHERE id = ?")
          .run(event.providerSessionRef, sessionId);
      }
      if (event.type === "assistant.delta" && typeof event.text === "string") {
        const row = this.#database.prepare("SELECT project_id, thread_id FROM sessions WHERE id = ?")
          .get(sessionId) as JsonRecord;
        const existing = this.#database.prepare(
          "SELECT id, text FROM thread_messages WHERE thread_id = ? AND role = 'assistant' ORDER BY created_at DESC LIMIT 1",
        ).get(requiredString(row, "thread_id")) as JsonRecord | undefined;
        if (existing === undefined) {
          this.#database.prepare(
            "INSERT INTO thread_messages(id, project_id, thread_id, role, text, created_at) VALUES (?, ?, ?, 'assistant', ?, ?)",
          ).run(`assistant-${sessionId}`, requiredString(row, "project_id"), requiredString(row, "thread_id"), event.text, event.at);
        } else {
          this.#database.prepare("UPDATE thread_messages SET text = ? WHERE id = ?")
            .run(`${requiredString(existing, "text")}${event.text}`, requiredString(existing, "id"));
        }
      }
      this.#database.exec("COMMIT");
    } catch (error) {
      this.#database.exec("ROLLBACK");
      throw error;
    }
  }

  getSessionEvents(sessionId: string): unknown[] {
    return (this.#database.prepare(
      "SELECT payload_json FROM session_events WHERE session_id = ? ORDER BY sequence",
    ).all(sessionId) as JsonRecord[]).map((row) => parseJsonRecord(row.payload_json));
  }

  markSessionCancelled(sessionId: string, at: string): void {
    this.recordSessionEvent(sessionId, { type: "session.cancelled", at });
    this.#database.prepare("UPDATE sessions SET status = 'cancelled', last_event_at = ? WHERE id = ?")
      .run(at, sessionId);
  }

  getProjectChat(projectId: string): { messages: Array<{ role: "user" | "assistant"; text: string }> } {
    const rows = this.#database.prepare(
      "SELECT role, text FROM thread_messages WHERE project_id = ? ORDER BY created_at, id",
    ).all(projectId) as JsonRecord[];
    return { messages: rows.map((row) => ({
      role: requiredString(row, "role") as "user" | "assistant",
      text: requiredString(row, "text"),
    })) };
  }

  getSessionHud(sessionId: string) {
    const row = this.#database.prepare(
      `SELECT id, owner_type, thread_id, turn_id, status, hearth_provider_id,
       model_provider, model, provider_session_ref, cwd, budget_json, last_event_at FROM sessions WHERE id = ?`,
    ).get(sessionId) as JsonRecord | undefined;
    if (row === undefined) return null;
    const budget = parseJsonRecord(row.budget_json);
    return {
      sessionId: requiredString(row, "id"),
      owner: { type: "thread_turn" as const, threadId: requiredString(row, "thread_id"), turnId: requiredString(row, "turn_id") },
      status: requiredString(row, "status") as "queued" | "running" | "completed" | "failed" | "cancelled",
      hearthProviderId: requiredString(row, "hearth_provider_id"),
      modelProvider: requiredString(row, "model_provider"),
      model: requiredString(row, "model"),
      providerSessionRef: row.provider_session_ref === null
        ? null
        : requiredString(row, "provider_session_ref"),
      cwd: requiredString(row, "cwd"),
      budget: { maxTurns: Number(budget.maxTurns) },
      lastEventAt: requiredString(row, "last_event_at"),
    };
  }

  getProject(projectId: string): Project | null {
    const row = this.#database
      .prepare(
        `SELECT id, name, root_path, created_at, updated_at, version
         FROM projects WHERE id = ?`,
      )
      .get(projectId) as JsonRecord | undefined;
    if (row === undefined) return null;
    return {
      projectId: requiredString(row, "id"),
      name: requiredString(row, "name"),
      rootPath: row.root_path === null ? null : requiredString(row, "root_path"),
      createdAt: requiredString(row, "created_at"),
      updatedAt: requiredString(row, "updated_at"),
      version: 1,
    };
  }

  getTimeline(projectId: string): ProjectCreatedEvent[] {
    const rows = this.#database
      .prepare(
        `SELECT event_id, event_type, event_version, project_id, actor_json,
                object_json, reason, idempotency_key, occurred_at, recorded_at, payload_json
         FROM timeline_events WHERE project_id = ? ORDER BY sequence ASC`,
      )
      .all(projectId) as JsonRecord[];
    return rows.map((row) => {
      const actor = parseJsonRecord(row.actor_json);
      const object = parseJsonRecord(row.object_json);
      const payload = parseJsonRecord(row.payload_json);
      const actorType = requiredString(actor, "type");
      if (actorType !== "principal" && actorType !== "member" && actorType !== "system") {
        throw new ApplicationError("STORAGE_ERROR", "invalid persisted actor type");
      }
      return {
        eventId: requiredString(row, "event_id"),
        type: "project.created",
        version: 1,
        projectId: requiredString(row, "project_id"),
        actor: { type: actorType, id: requiredString(actor, "id") },
        object: { type: "project", id: requiredString(object, "id") },
        reason: requiredString(row, "reason"),
        idempotencyKey: requiredString(row, "idempotency_key"),
        occurredAt: requiredString(row, "occurred_at"),
        recordedAt: requiredString(row, "recorded_at"),
        payload: {
          name: requiredString(payload, "name"),
          rootPath:
            payload.rootPath === null
              ? null
              : requiredString(payload, "rootPath"),
        },
      };
    });
  }

  getGrid(): ProjectGridReadModel {
    const rows = this.#database
      .prepare(
        `SELECT project_id, name, updated_at, default_section
         FROM project_grid_projection ORDER BY updated_at DESC, project_id ASC`,
      )
      .all() as JsonRecord[];
    return {
      projects: rows.map((row) => ({
        projectId: requiredString(row, "project_id"),
        name: requiredString(row, "name"),
        updatedAt: requiredString(row, "updated_at"),
        defaultSection: "chat",
      })),
    };
  }

  getDetail(projectId: string): ProjectDetailReadModel | null {
    const row = this.#database
      .prepare(
        `SELECT project_id, name, root_path, created_at, updated_at, default_section
         FROM project_detail_projection WHERE project_id = ?`,
      )
      .get(projectId) as JsonRecord | undefined;
    if (row === undefined) return null;
    return {
      projectId: requiredString(row, "project_id"),
      name: requiredString(row, "name"),
      rootPath: row.root_path === null ? null : requiredString(row, "root_path"),
      createdAt: requiredString(row, "created_at"),
      updatedAt: requiredString(row, "updated_at"),
      defaultSection: "chat",
    };
  }
}
