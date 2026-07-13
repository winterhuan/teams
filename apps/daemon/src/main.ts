#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, relative } from "node:path";
import { fileURLToPath } from "node:url";
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

function inside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
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
  const piCommand = fileURLToPath(new URL("../bin/hearth-pi", import.meta.url));
  const acpRuntime = createAcpRuntime({
    cwd: process.cwd(),
    sessionStore: acpSessionStore,
    agentRegistry: createAgentRegistry({
      overrides: { pi: `env PI_ACP_PI_COMMAND=${piCommand} npx -y pi-acp@0.0.31` },
    }),
    permissionMode: "approve-all",
    nonInteractivePermissions: "deny",
  });
  const acpxAdapter = new AcpxAdapter({ runtime: acpRuntime, agent: "pi" });
  const application = createHearthApplication({
    databasePath: values.db,
    launchThreadSession: (spec, onEvent) => acpxAdapter.start(spec, onEvent, {
      tools: ["read", "write"],
      timeoutMs: 90_000,
    }),
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
        const cwd = realpathSync(values.cwd);
        const scratchRoot = realpathSync(process.env.HEARTH_SCRATCH_ROOT ?? tmpdir());
        if (!inside(scratchRoot, cwd)) {
          throw new ApplicationError("VALIDATION_ERROR", "--cwd must be inside the configured scratch root");
        }
        const started = application.startThreadSession({
          type: "thread.session.start",
          idempotencyKey: values.json ?? `session-${Date.now()}`,
          actor: { type: "principal", id: "principal-local" },
          reason: "Start Thread Session from CLI",
          projectId: values["project-id"],
          prompt: values.prompt,
          cwd,
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
