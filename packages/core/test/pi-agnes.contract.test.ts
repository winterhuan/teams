import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, expect, it } from "vitest";
import { createHearthApplication } from "../src/index.ts";
import { PiAdapter } from "../src/provider/pi-adapter.ts";

const directories: string[] = [];
afterAll(async () => {
  for (const directory of directories) await rm(directory, { recursive: true, force: true });
});

it(
  "streams a real Pi + Agnes response into the durable Chat projection",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "hearth-pi-agnes-"));
    directories.push(directory);
    const adapter = new PiAdapter();
    const application = createHearthApplication({
      databasePath: join(directory, "hearth.db"),
      launchThreadSession: (spec, onEvent) => adapter.start(spec, onEvent),
    });
    const project = application.execute({
      type: "project.create",
      idempotencyKey: "real-pi-project",
      actor: { type: "principal", id: "principal-local" },
      reason: "Run real Pi acceptance",
      project: { name: "Real Pi Project" },
    });
    const started = application.startThreadSession({
      type: "thread.session.start",
      idempotencyKey: "real-pi-session",
      actor: { type: "principal", id: "principal-local" },
      reason: "Verify real Pi and Agnes",
      projectId: project.projectId,
      prompt: "Reply with exactly HEARTH_REAL_PI_OK and nothing else.",
      cwd: directory,
      budget: { maxTurns: 1 },
      route: {
        hearthProviderId: "pi",
        modelProvider: "agnes-ai",
        model: "agnes-2.0-flash",
      },
    });

    await application.waitForSession(started.sessionId);

    const hud = application.getSessionHud(started.sessionId);
    const events = application.getSessionEvents(started.sessionId) as Array<Record<string, unknown>>;
    const chat = application.getProjectChat(project.projectId);
    expect(hud).toMatchObject({
      status: "completed",
      hearthProviderId: "pi",
      modelProvider: "agnes-ai",
      model: "agnes-2.0-flash",
    });
    expect(events.some((event) => event.type === "session.running")).toBe(true);
    expect(events.some((event) => event.type === "assistant.delta")).toBe(true);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: "session.completed",
        stopReason: expect.any(String),
        usage: expect.objectContaining({ totalTokens: expect.any(Number) }),
      }),
    );
    expect(chat.messages.at(-1)).toMatchObject({
      role: "assistant",
      text: expect.stringContaining("HEARTH_REAL_PI_OK"),
    });
    application.close();
  },
  120_000,
);
