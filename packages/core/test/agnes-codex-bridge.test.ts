import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, expect, it } from "vitest";
import { startAgnesCodexBridge, type AgnesCodexBridge } from "../src/index.ts";

const bridges: AgnesCodexBridge[] = [];
const upstreamServers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(bridges.splice(0).map((bridge) => bridge.close()));
  await Promise.all(upstreamServers.splice(0).map((server) => new Promise<void>((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error));
  })));
});

async function listen(server: ReturnType<typeof createServer>): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  upstreamServers.push(server);
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}/v1`;
}

it("normalizes Codex Responses input before streaming Agnes output", async () => {
  let receivedAuthorization: string | undefined;
  let receivedBody: Record<string, unknown> | undefined;
  const upstreamBaseUrl = await listen(createServer(async (request, response) => {
    receivedAuthorization = request.headers.authorization;
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    receivedBody = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write("event: response.output_text.delta\n");
    response.end("data: {\"type\":\"response.output_text.delta\",\"delta\":\"OK\"}\n\n");
  }));
  const bridge = await startAgnesCodexBridge({
    upstreamBaseUrl,
    upstreamApiKey: "agnes-secret",
    localToken: "local-token",
  });
  bridges.push(bridge);

  const response = await fetch(`${bridge.baseUrl}/responses`, {
    method: "POST",
    headers: {
      authorization: "Bearer local-token",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "agnes-2.0-flash",
      stream: true,
      input: [
        { type: "message", role: "developer", content: [{ type: "input_text", text: "rules" }] },
        { type: "message", role: "user", content: [{ type: "input_text", text: "hello" }] },
      ],
      tools: [
        { type: "function", name: "shell_command", parameters: { type: "object" } },
        { type: "namespace", name: "multi_agent", tools: [] },
        { type: "web_search" },
      ],
    }),
  });

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/event-stream");
  expect(await response.text()).toContain("response.output_text.delta");
  expect(receivedAuthorization).toBe("Bearer agnes-secret");
  expect(receivedBody).toMatchObject({
    model: "agnes-2.0-flash",
    input: [
      { type: "message", role: "system" },
      { type: "message", role: "user" },
    ],
    tools: [{ type: "function", name: "shell_command" }],
  });
});

it("rejects an invalid local token without contacting Agnes", async () => {
  let contacted = false;
  const upstreamBaseUrl = await listen(createServer((_request, response) => {
    contacted = true;
    response.end();
  }));
  const bridge = await startAgnesCodexBridge({
    upstreamBaseUrl,
    upstreamApiKey: "agnes-secret",
    localToken: "local-token",
  });
  bridges.push(bridge);

  const response = await fetch(`${bridge.baseUrl}/responses`, {
    method: "POST",
    headers: { authorization: "Bearer wrong-token", "content-type": "application/json" },
    body: "{}",
  });

  expect(response.status).toBe(401);
  expect(contacted).toBe(false);
});

it("preserves upstream error status and body", async () => {
  const upstreamBaseUrl = await listen(createServer((_request, response) => {
    response.writeHead(400, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: { message: "upstream failure" } }));
  }));
  const bridge = await startAgnesCodexBridge({
    upstreamBaseUrl,
    upstreamApiKey: "agnes-secret",
  });
  bridges.push(bridge);

  const response = await fetch(`${bridge.baseUrl}/responses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });

  expect(response.status).toBe(400);
  await expect(response.json()).resolves.toEqual({ error: { message: "upstream failure" } });
});

it("cancels the Agnes request when the Codex client disconnects", async () => {
  let markUpstreamStarted: (() => void) | undefined;
  const upstreamStarted = new Promise<void>((resolve) => {
    markUpstreamStarted = resolve;
  });
  let markUpstreamClosed: (() => void) | undefined;
  const upstreamClosed = new Promise<void>((resolve) => {
    markUpstreamClosed = resolve;
  });
  const upstreamBaseUrl = await listen(createServer((request, response) => {
    markUpstreamStarted?.();
    request.once("close", () => markUpstreamClosed?.());
    response.writeHead(200, { "content-type": "text/event-stream" });
    response.write("event: response.created\ndata: {}\n\n");
  }));
  const bridge = await startAgnesCodexBridge({
    upstreamBaseUrl,
    upstreamApiKey: "agnes-secret",
  });
  bridges.push(bridge);
  const abortController = new AbortController();
  const responsePromise = fetch(`${bridge.baseUrl}/responses`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input: [] }),
    signal: abortController.signal,
  });
  await upstreamStarted;
  abortController.abort();

  await expect(responsePromise.then((response) => response.text())).rejects.toThrow();
  await expect(upstreamClosed).resolves.toBeUndefined();
});
