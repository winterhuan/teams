#!/usr/bin/env node
import { parseArgs } from "node:util";
import { createAcpRuntime, createAgentRegistry } from "acpx/runtime";
import {
  AcpxAdapter,
  ApplicationError,
  SqliteAcpSessionStore,
  createHearthApplication,
} from "../../../packages/core/src/index.ts";

function output(value: unknown): void {
  process.stdout.write(`${JSON.stringify({ ok: true, value })}\n`);
}

function fail(error: unknown): never {
  const code = error instanceof ApplicationError ? error.code : "INTERNAL_ERROR";
  const message = error instanceof Error ? error.message : "unknown error";
  process.stderr.write(`${JSON.stringify({ ok: false, error: { code, message } })}\n`);
  process.exit(1);
}

try {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    allowPositionals: true,
    options: {
      db: { type: "string" },
      json: { type: "string" },
      "project-id": { type: "string" },
      prompt: { type: "string" },
      cwd: { type: "string" },
    },
  });
  if (values.db === undefined) {
    throw new ApplicationError("VALIDATION_ERROR", "--db is required");
  }
  const acpSessionStore = new SqliteAcpSessionStore(`${values.db}.acpx.db`);
  const acpRuntime = createAcpRuntime({
    cwd: process.cwd(),
    sessionStore: acpSessionStore,
    agentRegistry: createAgentRegistry(),
    permissionMode: "approve-all",
    nonInteractivePermissions: "deny",
  });
  const acpxAdapter = new AcpxAdapter({ runtime: acpRuntime, agent: "pi" });
  const application = createHearthApplication({
    databasePath: values.db,
    launchThreadSession: (spec, onEvent) => acpxAdapter.start(spec, onEvent),
  });
  try {
    const action = positionals[0];
    switch (action) {
      case "create-project":
        if (values.json === undefined) {
          throw new ApplicationError("VALIDATION_ERROR", "--json is required");
        }
        output(application.execute(JSON.parse(values.json) as unknown));
        break;
      case "start-thread-session": {
        if (values["project-id"] === undefined || values.prompt === undefined || values.cwd === undefined) {
          throw new ApplicationError("VALIDATION_ERROR", "--project-id, --prompt and --cwd are required");
        }
        const started = application.startThreadSession({
          type: "thread.session.start",
          idempotencyKey: values.json ?? `session-${Date.now()}`,
          actor: { type: "principal", id: "principal-local" },
          reason: "Start Thread Session from CLI",
          projectId: values["project-id"],
          prompt: values.prompt,
          cwd: values.cwd,
          budget: { maxTurns: 1 },
          route: { hearthProviderId: "pi", modelProvider: "agnes-ai", model: "agnes-2.0-flash" },
        });
        await application.waitForSession(started.sessionId);
        output({
          ...started,
          hud: application.getSessionHud(started.sessionId),
          events: application.getSessionEvents(started.sessionId),
          chat: application.getProjectChat(values["project-id"]),
        });
        break;
      }
      case "project-grid":
        output(application.getProjectGrid());
        break;
      case "project-detail":
        if (values["project-id"] === undefined) {
          throw new ApplicationError(
            "VALIDATION_ERROR",
            "--project-id is required",
          );
        }
        output(application.getProjectDetail(values["project-id"]));
        break;
      case "project-timeline":
        if (values["project-id"] === undefined) {
          throw new ApplicationError(
            "VALIDATION_ERROR",
            "--project-id is required",
          );
        }
        output(application.getProjectTimeline(values["project-id"]));
        break;
      default:
        throw new ApplicationError("VALIDATION_ERROR", "unknown action");
    }
  } finally {
    application.close();
    await acpxAdapter.close();
    acpSessionStore.close();
  }
} catch (error) {
  fail(error);
}
