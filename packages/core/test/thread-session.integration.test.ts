import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHearthApplication,
  type HearthApplication,
  type ThreadSessionLaunchSpec,
} from "../src/index.ts";

const applications: HearthApplication[] = [];
const directories: string[] = [];

afterEach(async () => {
  for (const application of applications.splice(0)) application.close();
  for (const directory of directories.splice(0)) {
    await rm(directory, { recursive: true, force: true });
  }
});

describe("Thread Session through the public Daemon application seam", () => {
  it("persists the message and immutable Thread Turn owner before launch", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-session-"));
    directories.push(directory);
    const launches: ThreadSessionLaunchSpec[] = [];
    const application = createHearthApplication({
      databasePath: join(directory, "hearth.db"),
      launchThreadSession(spec) {
        expect(application.getProjectChat(project.projectId).messages).toEqual([
          expect.objectContaining({ role: "user", text: "Say hello" }),
        ]);
        launches.push(spec);
      },
    });
    applications.push(application);
    const project = application.execute({
      type: "project.create",
      idempotencyKey: "thread-project",
      actor: { type: "principal", id: "principal-local" },
      reason: "Create a chat project",
      project: { name: "Chat Project" },
    });

    const started = application.startThreadSession({
      type: "thread.session.start",
      idempotencyKey: "thread-session-01",
      actor: { type: "principal", id: "principal-local" },
      reason: "Ask a real provider",
      projectId: project.projectId,
      prompt: "Say hello",
      cwd: directory,
      budget: { maxTurns: 1 },
      route: {
        hearthProviderId: "pi",
        modelProvider: "agnes-ai",
        model: "agnes-2.0-flash",
      },
    });

    expect(launches).toEqual([
      expect.objectContaining({
        sessionId: started.sessionId,
        threadId: started.threadId,
        prompt: "Say hello",
        hearthProviderId: "pi",
        modelProvider: "agnes-ai",
        model: "agnes-2.0-flash",
      }),
    ]);
    expect(application.getSessionHud(started.sessionId)).toMatchObject({
      sessionId: started.sessionId,
      owner: {
        type: "thread_turn",
        threadId: started.threadId,
        turnId: started.turnId,
      },
      status: "queued",
      hearthProviderId: "pi",
      modelProvider: "agnes-ai",
      model: "agnes-2.0-flash",
      cwd: directory,
      budget: { maxTurns: 1 },
    });
  });

  it("allows a detached client to reconnect while execution remains owned by the Daemon", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-session-"));
    directories.push(directory);
    let finish!: () => void;
    const completed = new Promise<void>((resolve) => { finish = resolve; });
    const application = createHearthApplication({
      databasePath: join(directory, "hearth.db"),
      launchThreadSession(_spec, onEvent) {
        onEvent({ type: "session.running", at: new Date().toISOString(), processId: 42 });
        return { completed, cancel() {} };
      },
    });
    applications.push(application);
    const project = application.execute({
      type: "project.create", idempotencyKey: "detach-p", actor: { type: "principal", id: "p" },
      reason: "create", project: { name: "P" },
    });
    const started = application.startThreadSession({
      type: "thread.session.start", idempotencyKey: "detach-s", actor: { type: "principal", id: "p" },
      reason: "start", projectId: project.projectId, prompt: "hello", cwd: directory,
      budget: { maxTurns: 1 }, route: { hearthProviderId: "pi", modelProvider: "agnes-ai", model: "agnes-2.0-flash" },
    });

    const reconnected = createHearthApplication({ databasePath: join(directory, "hearth.db") });
    applications.push(reconnected);
    expect(reconnected.getSessionHud(started.sessionId)?.status).toBe("running");
    expect(reconnected.getProjectChat(project.projectId).messages).toHaveLength(1);
    finish();
    await application.waitForSession(started.sessionId);
  });

  it("persists the acpx session reference for reconnecting clients", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-session-"));
    directories.push(directory);
    const databasePath = join(directory, "hearth.db");
    const application = createHearthApplication({
      databasePath,
      launchThreadSession(_spec, onEvent) {
        onEvent({
          type: "session.provider_bound",
          at: new Date().toISOString(),
          providerSessionRef: "hearth-session:session-provider-ref",
        });
      },
    });
    applications.push(application);
    const project = application.execute({
      type: "project.create", idempotencyKey: "provider-ref-p", actor: { type: "principal", id: "p" },
      reason: "create", project: { name: "P" },
    });
    const started = application.startThreadSession({
      type: "thread.session.start", idempotencyKey: "provider-ref-s", actor: { type: "principal", id: "p" },
      reason: "start", projectId: project.projectId, prompt: "hello", cwd: directory,
      budget: { maxTurns: 1 }, route: { hearthProviderId: "pi", modelProvider: "agnes-ai", model: "agnes-2.0-flash" },
    });

    const reconnected = createHearthApplication({ databasePath });
    applications.push(reconnected);
    expect(reconnected.getSessionHud(started.sessionId)?.providerSessionRef)
      .toBe("hearth-session:session-provider-ref");
  });

  it("cancels the owned Provider process and records matching state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-session-"));
    directories.push(directory);
    const cancel = vi.fn();
    const application = createHearthApplication({
      databasePath: join(directory, "hearth.db"),
      launchThreadSession(_spec, onEvent) {
        onEvent({ type: "session.running", at: new Date().toISOString(), processId: 43 });
        return { completed: new Promise<void>(() => {}), cancel };
      },
    });
    applications.push(application);
    const project = application.execute({
      type: "project.create", idempotencyKey: "cancel-p", actor: { type: "principal", id: "p" },
      reason: "create", project: { name: "P" },
    });
    const started = application.startThreadSession({
      type: "thread.session.start", idempotencyKey: "cancel-s", actor: { type: "principal", id: "p" },
      reason: "start", projectId: project.projectId, prompt: "hello", cwd: directory,
      budget: { maxTurns: 1 }, route: { hearthProviderId: "pi", modelProvider: "agnes-ai", model: "agnes-2.0-flash" },
    });

    expect(application.cancelSession(started.sessionId)).toBe(true);
    expect(cancel).toHaveBeenCalledOnce();
    expect(application.getSessionHud(started.sessionId)?.status).toBe("cancelled");
    expect(application.getSessionEvents(started.sessionId)).toContainEqual(
      expect.objectContaining({ type: "session.cancelled" }),
    );
  });

  it("does not let a late Provider failure overwrite cancelled state", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-session-"));
    directories.push(directory);
    let emit!: (event: { type: string; at: string; [key: string]: unknown }) => void;
    const application = createHearthApplication({
      databasePath: join(directory, "hearth.db"),
      launchThreadSession(_spec, onEvent) {
        emit = onEvent;
        return { completed: new Promise<void>(() => {}), cancel() {} };
      },
    });
    applications.push(application);
    const project = application.execute({
      type: "project.create", idempotencyKey: "late-failure-p", actor: { type: "principal", id: "p" },
      reason: "create", project: { name: "P" },
    });
    const started = application.startThreadSession({
      type: "thread.session.start", idempotencyKey: "late-failure-s", actor: { type: "principal", id: "p" },
      reason: "start", projectId: project.projectId, prompt: "hello", cwd: directory,
      budget: { maxTurns: 1 }, route: { hearthProviderId: "pi", modelProvider: "agnes-ai", model: "agnes-2.0-flash" },
    });

    application.cancelSession(started.sessionId);
    emit({
      type: "session.failed",
      at: new Date().toISOString(),
      reason: "provider_error",
      message: "late process error",
    });

    expect(application.getSessionHud(started.sessionId)?.status).toBe("cancelled");
  });

  it("replays start without launching a second Provider", async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-session-"));
    directories.push(directory);
    let launches = 0;
    const application = createHearthApplication({
      databasePath: join(directory, "hearth.db"),
      launchThreadSession() {
        launches += 1;
      },
    });
    applications.push(application);
    const project = application.execute({
      type: "project.create",
      idempotencyKey: "p",
      actor: { type: "principal", id: "principal-local" },
      reason: "create",
      project: { name: "P" },
    });
    const input = {
      type: "thread.session.start",
      idempotencyKey: "s",
      actor: { type: "principal", id: "principal-local" },
      reason: "start",
      projectId: project.projectId,
      prompt: "hello",
      cwd: directory,
      budget: { maxTurns: 1 },
      route: {
        hearthProviderId: "pi",
        modelProvider: "agnes-ai",
        model: "agnes-2.0-flash",
      },
    } as const;

    const first = application.startThreadSession(input);
    const replay = application.startThreadSession(input);

    expect(replay).toEqual({ ...first, replayed: true });
    expect(launches).toBe(1);
    expect(application.getProjectChat(project.projectId).messages).toHaveLength(1);
  });
});
