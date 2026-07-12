import type {
  Actor,
  Project,
  ProjectCreatedEvent,
} from "../domain/project.ts";

export type CreateProjectCommand = Readonly<{
  type: "project.create";
  idempotencyKey: string;
  actor: Actor;
  reason: string;
  project: Readonly<{
    name: string;
    rootPath?: string;
  }>;
}>;

export type CreateProjectResult = Readonly<{
  projectId: string;
  timelineEventId: string;
  replayed: boolean;
}>;

export type ProjectGridReadModel = Readonly<{
  projects: ReadonlyArray<
    Readonly<{
      projectId: string;
      name: string;
      updatedAt: string;
      defaultSection: "chat";
    }>
  >;
}>;

export type ProjectDetailReadModel = Readonly<{
  projectId: string;
  name: string;
  rootPath: string | null;
  createdAt: string;
  updatedAt: string;
  defaultSection: "chat";
}>;

export type ThreadSessionLaunchSpec = Readonly<{
  sessionId: string;
  threadId: string;
  turnId: string;
  prompt: string;
  cwd: string;
  hearthProviderId: "pi";
  modelProvider: "agnes-ai";
  model: "agnes-2.0-flash";
}>;

export type ThreadSessionStartResult = Readonly<{
  threadId: string;
  turnId: string;
  sessionId: string;
  replayed: boolean;
}>;

export type SessionHudReadModel = Readonly<{
  sessionId: string;
  owner: Readonly<{ type: "thread_turn"; threadId: string; turnId: string }>;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  hearthProviderId: string;
  modelProvider: string;
  model: string;
  cwd: string;
  budget: Readonly<{ maxTurns: number }>;
  lastEventAt: string;
}>;

export interface HearthApplication {
  execute(command: unknown): CreateProjectResult;
  startThreadSession(command: unknown): ThreadSessionStartResult;
  getProject(projectId: string): Project | null;
  getProjectTimeline(projectId: string): readonly ProjectCreatedEvent[];
  getProjectGrid(): ProjectGridReadModel;
  getProjectDetail(projectId: string): ProjectDetailReadModel | null;
  getProjectChat(projectId: string): { messages: readonly Readonly<{ role: "user" | "assistant"; text: string }>[] };
  getSessionHud(sessionId: string): SessionHudReadModel | null;
  getSessionEvents(sessionId: string): readonly unknown[];
  cancelSession(sessionId: string): boolean;
  waitForSession(sessionId: string): Promise<void>;
  close(): void;
}

export type ApplicationErrorCode =
  | "VALIDATION_ERROR"
  | "IDEMPOTENCY_CONFLICT"
  | "STORAGE_ERROR";

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
  }
}

function nonEmptyString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ApplicationError("VALIDATION_ERROR", `${field} must be non-empty`);
  }
  return value.trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type ThreadSessionStartCommand = Readonly<{
  type: "thread.session.start";
  idempotencyKey: string;
  actor: Actor;
  reason: string;
  projectId: string;
  prompt: string;
  cwd: string;
  budget: Readonly<{ maxTurns: number }>;
  route: Readonly<{
    hearthProviderId: "pi";
    modelProvider: "agnes-ai";
    model: "agnes-2.0-flash";
  }>;
}>;

export function parseThreadSessionStartCommand(input: unknown): ThreadSessionStartCommand {
  if (!isRecord(input) || input.type !== "thread.session.start") {
    throw new ApplicationError("VALIDATION_ERROR", "unsupported command");
  }
  if (!isRecord(input.actor) || !isRecord(input.budget) || !isRecord(input.route)) {
    throw new ApplicationError("VALIDATION_ERROR", "invalid command shape");
  }
  const actorType = input.actor.type;
  if (actorType !== "principal" && actorType !== "member" && actorType !== "system") {
    throw new ApplicationError("VALIDATION_ERROR", "invalid actor type");
  }
  if (
    input.route.hearthProviderId !== "pi" ||
    input.route.modelProvider !== "agnes-ai" ||
    input.route.model !== "agnes-2.0-flash"
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "issue 02 requires the Pi Agnes route");
  }
  if (!Number.isInteger(input.budget.maxTurns) || Number(input.budget.maxTurns) < 1) {
    throw new ApplicationError("VALIDATION_ERROR", "budget.maxTurns must be positive");
  }
  return {
    type: "thread.session.start",
    idempotencyKey: nonEmptyString(input.idempotencyKey, "idempotencyKey"),
    actor: { type: actorType, id: nonEmptyString(input.actor.id, "actor.id") },
    reason: nonEmptyString(input.reason, "reason"),
    projectId: nonEmptyString(input.projectId, "projectId"),
    prompt: nonEmptyString(input.prompt, "prompt"),
    cwd: nonEmptyString(input.cwd, "cwd"),
    budget: { maxTurns: Number(input.budget.maxTurns) },
    route: {
      hearthProviderId: "pi",
      modelProvider: "agnes-ai",
      model: "agnes-2.0-flash",
    },
  };
}

export function parseCreateProjectCommand(
  input: unknown,
): CreateProjectCommand {
  if (!isRecord(input) || input.type !== "project.create") {
    throw new ApplicationError("VALIDATION_ERROR", "unsupported command");
  }
  if (!isRecord(input.actor) || !isRecord(input.project)) {
    throw new ApplicationError("VALIDATION_ERROR", "invalid command shape");
  }
  const actorType = input.actor.type;
  if (
    actorType !== "principal" &&
    actorType !== "member" &&
    actorType !== "system"
  ) {
    throw new ApplicationError("VALIDATION_ERROR", "invalid actor type");
  }
  const rootPath = input.project.rootPath;
  if (rootPath !== undefined && typeof rootPath !== "string") {
    throw new ApplicationError("VALIDATION_ERROR", "rootPath must be a string");
  }
  const project = {
    name: nonEmptyString(input.project.name, "project.name"),
    ...(rootPath === undefined ? {} : { rootPath }),
  };
  return {
    type: "project.create",
    idempotencyKey: nonEmptyString(input.idempotencyKey, "idempotencyKey"),
    actor: {
      type: actorType,
      id: nonEmptyString(input.actor.id, "actor.id"),
    },
    reason: nonEmptyString(input.reason, "reason"),
    project,
  };
}
