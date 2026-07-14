import { createHash, randomUUID } from "node:crypto";
import type {
  CreateProjectCommand,
  CreateProjectResult,
  HearthApplication,
} from "./contracts.ts";
import {
  ApplicationError,
  PI_AGNES_ACP_MODEL_ID,
  parseCreateProjectCommand,
  parseThreadSessionStartCommand,
  type RunningProviderProcess,
  type ThreadSessionLaunchSpec,
} from "./contracts.ts";
import { createProjectFact } from "../domain/project.ts";
import { SqliteProjectStore } from "../storage/sqlite-project-store.ts";

function projectFingerprint(command: CreateProjectCommand): string {
  return createHash("sha256").update(JSON.stringify({
    type: command.type,
    actor: command.actor,
    reason: command.reason,
    project: { name: command.project.name, rootPath: command.project.rootPath ?? null },
  })).digest("hex");
}

/**
 * Resolve the ACP model id Pi should be asked to load, from the Hearth ledger
 * route. Decoupled from `modelProvider`/`model` (the ledger identity) on
 * purpose: the ACP namespace belongs to the Pi adapter and can be renamed
 * upstream. A config surface will later resolve this from the advertised
 * `getStatus().models.availableModelIds`; today the single Agnes route pins it.
 */
function resolveAcpModelId(route: { modelProvider: string; model: string }): string {
  if (route.modelProvider === "agnes-ai" && route.model === "agnes-2.0-flash") {
    return PI_AGNES_ACP_MODEL_ID;
  }
  throw new ApplicationError("VALIDATION_ERROR", `no ACP model id for route ${route.modelProvider}/${route.model}`);
}

function threadSessionFingerprint(command: ReturnType<typeof parseThreadSessionStartCommand>): string {
  return createHash("sha256").update(JSON.stringify({
    type: command.type,
    actor: command.actor,
    reason: command.reason,
    projectId: command.projectId,
    prompt: command.prompt,
    cwd: command.cwd,
    budget: command.budget,
    route: command.route,
  })).digest("hex");
}

export function createHearthApplication(options: {
  databasePath: string;
  launchThreadSession?: (
    spec: ThreadSessionLaunchSpec,
    onEvent: (event: { type: string; at: string; [key: string]: unknown }) => void,
  ) => RunningProviderProcess | void;
}): HearthApplication {
  const store = new SqliteProjectStore(options.databasePath);
  const running = new Map<string, RunningProviderProcess>();
  let closed = false;

  return {
    execute(input: unknown): CreateProjectResult {
      const command = parseCreateProjectCommand(input);
      const fingerprint = projectFingerprint(command);
      const scope = {
        commandType: command.type,
        actorType: command.actor.type,
        actorId: command.actor.id,
        idempotencyKey: command.idempotencyKey,
      };
      const receipt = store.findReceipt(scope);
      if (receipt !== null) {
        if (receipt.fingerprint !== fingerprint) {
          throw new ApplicationError(
            "IDEMPOTENCY_CONFLICT",
            "idempotency key was already used for different intent",
          );
        }
        return { ...receipt.result, replayed: true };
      }

      const timestamp = new Date().toISOString();
      const projectId = randomUUID();
      const timelineEventId = randomUUID();
      const fact = createProjectFact({
        projectId,
        eventId: timelineEventId,
        name: command.project.name,
        rootPath: command.project.rootPath ?? null,
        actor: command.actor,
        reason: command.reason,
        idempotencyKey: command.idempotencyKey,
        timestamp,
      });
      const result: CreateProjectResult = {
        projectId,
        timelineEventId,
        replayed: false,
      };
      store.commitCreation({ ...fact, fingerprint, result });
      return result;
    },

    startThreadSession(input: unknown) {
      const command = parseThreadSessionStartCommand(input);
      const fingerprint = threadSessionFingerprint(command);
      const receipt = store.findThreadSessionReceipt({
        actorType: command.actor.type,
        actorId: command.actor.id,
        idempotencyKey: command.idempotencyKey,
      });
      if (receipt !== null) {
        if (receipt.fingerprint !== fingerprint) {
          throw new ApplicationError("IDEMPOTENCY_CONFLICT", "idempotency key was already used for different intent");
        }
        return { ...receipt.result, replayed: true };
      }
      if (store.getProject(command.projectId) === null) {
        throw new ApplicationError("VALIDATION_ERROR", "project does not exist");
      }
      const threadId = randomUUID();
      const turnId = randomUUID();
      const sessionId = randomUUID();
      const timestamp = new Date().toISOString();
      store.commitThreadSession({
        projectId: command.projectId,
        threadId,
        turnId,
        sessionId,
        messageId: randomUUID(),
        prompt: command.prompt,
        cwd: command.cwd,
        budget: command.budget,
        timestamp,
        actor: command.actor,
        idempotencyKey: command.idempotencyKey,
        fingerprint,
      });
      const launched = options.launchThreadSession?.(
        {
          sessionId,
          threadId,
          turnId,
          prompt: command.prompt,
          cwd: command.cwd,
          ...command.route,
          acpModelId: resolveAcpModelId(command.route),
        },
        (event) => store.recordSessionEvent(sessionId, event),
      );
      if (launched !== undefined) {
        running.set(sessionId, launched);
        void launched.completed.finally(() => running.delete(sessionId));
      }
      return { threadId, turnId, sessionId, replayed: false };
    },

    getProjectChat(projectId) {
      return store.getProjectChat(projectId);
    },

    getSessionHud(sessionId) {
      return store.getSessionHud(sessionId);
    },

    getSessionEvents(sessionId) {
      return store.getSessionEvents(sessionId);
    },

    cancelSession(sessionId) {
      const process = running.get(sessionId);
      if (process === undefined) return false;
      process.cancel();
      store.markSessionCancelled(sessionId, new Date().toISOString());
      return true;
    },

    async waitForSession(sessionId) {
      await running.get(sessionId)?.completed;
    },

    getProject(projectId) {
      return store.getProject(projectId);
    },

    getProjectTimeline(projectId) {
      return store.getTimeline(projectId);
    },

    getProjectGrid() {
      return store.getGrid();
    },

    getProjectDetail(projectId) {
      return store.getDetail(projectId);
    },

    close() {
      if (!closed) {
        store.close();
        closed = true;
      }
    },
  };
}
