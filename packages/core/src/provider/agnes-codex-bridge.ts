import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

type JsonObject = Record<string, unknown>;

export type AgnesCodexBridge = Readonly<{
  baseUrl: string;
  close(): Promise<void>;
}>;

export type StartAgnesCodexBridgeOptions = Readonly<{
  upstreamBaseUrl: string;
  upstreamApiKey: string;
  localToken?: string;
  host?: string;
  port?: number;
}>;

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeRequest(value: unknown): JsonObject {
  if (!isJsonObject(value)) throw new Error("Responses request body must be a JSON object");
  const normalized: JsonObject = { ...value };
  if (Array.isArray(value.input)) {
    normalized.input = value.input.map((item) => {
      if (!isJsonObject(item) || item.role !== "developer") return item;
      return { ...item, role: "system" };
    });
  }
  if (Array.isArray(value.tools)) {
    normalized.tools = value.tools.filter((tool) => isJsonObject(tool) && tool.type === "function");
  }
  return normalized;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

async function proxyRequest(
  request: IncomingMessage,
  response: ServerResponse,
  options: StartAgnesCodexBridgeOptions,
): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", "http://localhost");
  if (request.method !== "POST" || !requestUrl.pathname.endsWith("/responses")) {
    json(response, 404, { error: { message: "Not found" } });
    return;
  }
  if (options.localToken !== undefined && request.headers.authorization !== `Bearer ${options.localToken}`) {
    json(response, 401, { error: { message: "Unauthorized" } });
    return;
  }

  let body: JsonObject;
  try {
    body = normalizeRequest(await readJson(request));
  } catch (error) {
    json(response, 400, {
      error: { message: error instanceof Error ? error.message : String(error) },
    });
    return;
  }

  const abortController = new AbortController();
  request.once("aborted", () => abortController.abort());
  response.once("close", () => {
    if (!response.writableEnded) abortController.abort();
  });
  try {
    const upstream = await fetch(`${options.upstreamBaseUrl.replace(/\/$/u, "")}/responses`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.upstreamApiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: abortController.signal,
    });
    const contentType = upstream.headers.get("content-type");
    response.writeHead(upstream.status, contentType === null ? {} : { "content-type": contentType });
    if (upstream.body === null) {
      response.end();
      return;
    }
    for await (const chunk of upstream.body) response.write(chunk);
    response.end();
  } catch (error) {
    if (abortController.signal.aborted) return;
    if (response.headersSent) {
      response.destroy(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    json(response, 502, {
      error: { message: error instanceof Error ? error.message : String(error) },
    });
  }
}

export async function startAgnesCodexBridge(
  options: StartAgnesCodexBridgeOptions,
): Promise<AgnesCodexBridge> {
  const host = options.host ?? "127.0.0.1";
  const server = createServer((request, response) => {
    void proxyRequest(request, response, options);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? 0, host, resolve);
  });
  const address = server.address() as AddressInfo;
  return {
    baseUrl: `http://${host}:${address.port}/v1`,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => error === undefined ? resolve() : reject(error));
    }),
  };
}
