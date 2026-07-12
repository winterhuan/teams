export type Actor = Readonly<{
  type: "principal" | "member" | "system";
  id: string;
}>;

export type Project = Readonly<{
  projectId: string;
  name: string;
  rootPath: string | null;
  createdAt: string;
  updatedAt: string;
  version: 1;
}>;

export type ProjectCreatedEvent = Readonly<{
  eventId: string;
  type: "project.created";
  version: 1;
  projectId: string;
  actor: Actor;
  object: Readonly<{ type: "project"; id: string }>;
  reason: string;
  idempotencyKey: string;
  occurredAt: string;
  recordedAt: string;
  payload: Readonly<{ name: string; rootPath: string | null }>;
}>;

export function createProjectFact(input: {
  projectId: string;
  eventId: string;
  name: string;
  rootPath: string | null;
  actor: Actor;
  reason: string;
  idempotencyKey: string;
  timestamp: string;
}): { project: Project; event: ProjectCreatedEvent } {
  const project: Project = {
    projectId: input.projectId,
    name: input.name,
    rootPath: input.rootPath,
    createdAt: input.timestamp,
    updatedAt: input.timestamp,
    version: 1,
  };
  return {
    project,
    event: {
      eventId: input.eventId,
      type: "project.created",
      version: 1,
      projectId: input.projectId,
      actor: input.actor,
      object: { type: "project", id: input.projectId },
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
      occurredAt: input.timestamp,
      recordedAt: input.timestamp,
      payload: { name: input.name, rootPath: input.rootPath },
    },
  };
}
