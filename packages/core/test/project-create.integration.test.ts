import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  ApplicationError,
  createHearthApplication,
  type HearthApplication,
} from "../src/index.js";

const applications: HearthApplication[] = [];
const directories: string[] = [];

async function openApplication(): Promise<{
  application: HearthApplication;
  databasePath: string;
}> {
  const directory = await mkdtemp(join(tmpdir(), "hearth-project-"));
  directories.push(directory);
  const application = createHearthApplication({
    databasePath: join(directory, "hearth.db"),
  });
  applications.push(application);
  return { application, databasePath: join(directory, "hearth.db") };
}

afterEach(async () => {
  for (const application of applications.splice(0)) {
    application.close();
  }
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

const command = {
  type: "project.create" as const,
  idempotencyKey: "acceptance-project-01",
  actor: { type: "principal" as const, id: "principal-local" },
  reason: "Create the acceptance project",
  project: {
    name: "Acceptance Project",
    rootPath: "/tmp/acceptance-project",
  },
};

describe("Project creation through the public Daemon application seam", () => {
  it("commits one Project fact and consistent grid/detail read models", async () => {
    const { application } = await openApplication();

    const created = application.execute(command);
    const aggregate = application.getProject(created.projectId);
    const timeline = application.getProjectTimeline(created.projectId);
    const grid = application.getProjectGrid();
    const detail = application.getProjectDetail(created.projectId);

    expect(created).toMatchObject({ replayed: false });
    expect(aggregate).toMatchObject({
      projectId: created.projectId,
      name: "Acceptance Project",
      rootPath: "/tmp/acceptance-project",
    });
    expect(timeline).toEqual([
      expect.objectContaining({
        eventId: created.timelineEventId,
        type: "project.created",
        projectId: created.projectId,
        actor: command.actor,
        object: { type: "project", id: created.projectId },
        reason: command.reason,
        idempotencyKey: command.idempotencyKey,
        occurredAt: expect.any(String),
        recordedAt: expect.any(String),
      }),
    ]);
    expect(grid).toEqual({
      projects: [
        expect.objectContaining({
          projectId: created.projectId,
          name: "Acceptance Project",
          defaultSection: "chat",
        }),
      ],
    });
    expect(detail).toMatchObject({
      projectId: created.projectId,
      name: "Acceptance Project",
      rootPath: "/tmp/acceptance-project",
      defaultSection: "chat",
    });
  });

  it("replays the same idempotent command without duplicating facts", async () => {
    const { application } = await openApplication();

    const first = application.execute(command);
    const replay = application.execute(command);

    expect(replay).toEqual({ ...first, replayed: true });
    expect(application.getProjectGrid().projects).toHaveLength(1);
    expect(application.getProjectTimeline(first.projectId)).toHaveLength(1);
  });

  it("rejects reuse of an idempotency key for different intent", async () => {
    const { application } = await openApplication();
    const first = application.execute(command);

    try {
      application.execute({
        ...command,
        project: { ...command.project, name: "Different Project" },
      });
      expect.fail("expected an idempotency conflict");
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe("IDEMPOTENCY_CONFLICT");
    }
    expect(application.getProject(first.projectId)?.name).toBe(
      "Acceptance Project",
    );
    expect(application.getProjectGrid().projects).toHaveLength(1);
  });

  it("rejects invalid commands without a durable side effect", async () => {
    const { application } = await openApplication();

    try {
      application.execute({
        ...command,
        reason: "  ",
      });
      expect.fail("expected validation to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe("VALIDATION_ERROR");
    }
    expect(application.getProjectGrid()).toEqual({ projects: [] });
  });

  it("reads the same aggregate, event, and projections after restart", async () => {
    const { application, databasePath } = await openApplication();
    const created = application.execute(command);
    const before = {
      aggregate: application.getProject(created.projectId),
      timeline: application.getProjectTimeline(created.projectId),
      grid: application.getProjectGrid(),
      detail: application.getProjectDetail(created.projectId),
    };
    application.close();
    applications.splice(applications.indexOf(application), 1);

    const restarted = createHearthApplication({ databasePath });
    applications.push(restarted);

    expect({
      aggregate: restarted.getProject(created.projectId),
      timeline: restarted.getProjectTimeline(created.projectId),
      grid: restarted.getProjectGrid(),
      detail: restarted.getProjectDetail(created.projectId),
    }).toEqual(before);
    expect(restarted.execute(command)).toEqual({ ...created, replayed: true });
  });
});
