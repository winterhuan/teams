import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterAll, expect, it } from "vitest";
import { startAgnesCodexBridge, type AgnesCodexBridge } from "../src/index.ts";

const directories: string[] = [];
const bridges: AgnesCodexBridge[] = [];

afterAll(async () => {
  await Promise.all(bridges.splice(0).map((bridge) => bridge.close()));
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function agnesCredential(): Promise<{ apiKey: string; baseUrl: string }> {
  if (process.env.AGNES_API_KEY !== undefined) {
    return {
      apiKey: process.env.AGNES_API_KEY,
      baseUrl: process.env.AGNES_BASE_URL ?? "https://apihub.agnes-ai.com/v1",
    };
  }
  const modelsPath = join(homedir(), ".pi", "agent", "models.json");
  const models = JSON.parse(await readFile(modelsPath, "utf8")) as {
    providers?: { agnes?: { apiKey?: string; baseUrl?: string } };
  };
  const agnes = models.providers?.agnes;
  if (agnes?.apiKey === undefined || agnes.baseUrl === undefined) {
    throw new Error("Set AGNES_API_KEY or configure the Agnes provider in ~/.pi/agent/models.json");
  }
  return { apiKey: agnes.apiKey, baseUrl: agnes.baseUrl };
}

async function runCodex(prompt: string, cwd: string): Promise<string> {
  const credential = await agnesCredential();
  const localToken = randomUUID();
  const bridge = await startAgnesCodexBridge({
    upstreamBaseUrl: credential.baseUrl,
    upstreamApiKey: credential.apiKey,
    localToken,
  });
  bridges.push(bridge);
  const codexPath = join(
    process.env.NVM_SYMLINK ?? join(process.env.LOCALAPPDATA ?? "", "nvm", "nodejs"),
    "node_modules",
    "@openai",
    "codex",
    "bin",
    "codex.js",
  );
  return new Promise<string>((resolve, reject) => {
    const child = execFile(process.execPath, [
      codexPath,
      "--ask-for-approval", "never",
      "exec",
      "--ignore-user-config",
      "--ignore-rules",
      "--json",
      "--skip-git-repo-check",
      "--ephemeral",
      "--sandbox", "danger-full-access",
      "--cd", cwd,
      "--model", "agnes-2.0-flash",
      "--config", 'model_provider="agnes_bridge"',
      "--config", 'model_providers.agnes_bridge.name="Agnes Bridge"',
      "--config", `model_providers.agnes_bridge.base_url="${bridge.baseUrl}"`,
      "--config", 'model_providers.agnes_bridge.wire_api="responses"',
      "--config", 'model_providers.agnes_bridge.env_key="HEARTH_AGNES_BRIDGE_TOKEN"',
      prompt,
    ], {
      cwd,
      env: { ...process.env, HEARTH_AGNES_BRIDGE_TOKEN: localToken },
      encoding: "utf8",
      timeout: 180_000,
      maxBuffer: 10 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error !== null) {
        reject(new Error(`${error.message}\n${stderr}`));
        return;
      }
      resolve(stdout);
    });
    child.stdin?.end();
  });
}

async function readText(path: string): Promise<string> {
  const content = await readFile(path);
  if (content[0] === 0xff && content[1] === 0xfe) return content.subarray(2).toString("utf16le").trimEnd();
  return content.toString("utf8").trimEnd();
}

function completedTurn(stdout: string): unknown {
  return stdout.split("\n").flatMap((line) => {
    try {
      const event = JSON.parse(line) as { type?: string };
      return event.type === "turn.completed" ? [event] : [];
    } catch {
      return [];
    }
  }).at(-1);
}

it("runs a real Codex text turn on Agnes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hearth-codex-agnes-text-"));
  directories.push(directory);

  const stdout = await runCodex(
    "Reply with exactly HEARTH_CODEX_AGNES_TEXT_OK and nothing else.",
    directory,
  );

  expect(stdout).toContain("HEARTH_CODEX_AGNES_TEXT_OK");
  expect(completedTurn(stdout)).toMatchObject({
    type: "turn.completed",
    usage: { input_tokens: expect.any(Number), output_tokens: expect.any(Number) },
  });
}, 200_000);

it("runs a real Codex tool round trip on Agnes", async () => {
  const directory = await mkdtemp(join(tmpdir(), "hearth-codex-agnes-tool-"));
  directories.push(directory);

  const stdout = await runCodex(
    "Use shell_command to create codex-agnes.txt containing exactly HEARTH_CODEX_AGNES_TOOL_OK, then read the file with shell_command and reply exactly HEARTH_CODEX_AGNES_TOOL_OK.",
    directory,
  );

  expect(await readText(join(directory, "codex-agnes.txt"))).toBe("HEARTH_CODEX_AGNES_TOOL_OK");
  expect(stdout).toContain("HEARTH_CODEX_AGNES_TOOL_OK");
  expect(completedTurn(stdout)).toMatchObject({
    type: "turn.completed",
    usage: { input_tokens: expect.any(Number), output_tokens: expect.any(Number) },
  });
}, 200_000);
