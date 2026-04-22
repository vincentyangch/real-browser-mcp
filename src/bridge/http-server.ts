import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DEFAULT_DOMAIN_POLICY } from "../config.js";
import {
  describeDomainPolicy,
  evaluateDomainPolicy,
} from "../policy/domain-policy.js";
import { BridgeState } from "./state.js";
import type { BridgeCommand, BridgeCommandResult, ConnectorSnapshot } from "./types.js";

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  const text = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(text),
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
  });
  res.end(text);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

function notFound(res: ServerResponse): void {
  sendJson(res, 404, { ok: false, error: "not found" });
}

function immediateFailure(
  command: BridgeCommand,
  error: string,
): {
  command: BridgeCommand;
  result: BridgeCommandResult;
} {
  return {
    command: {
      ...command,
      status: "failed",
    },
    result: {
      ok: false,
      error,
    },
  };
}

export async function startBridgeServer(host: string, port: number): Promise<void> {
  const policySummary = describeDomainPolicy(DEFAULT_DOMAIN_POLICY);
  const state = new BridgeState({
    statusNotes: policySummary ? [policySummary] : [],
  });

  const enforceUrlPolicy = (command: BridgeCommand, url: string) => {
    const decision = evaluateDomainPolicy(DEFAULT_DOMAIN_POLICY, url);
    if (decision.ok) return null;

    return immediateFailure(command, decision.reason);
  };

  const enforcePreferredTabPolicy = (command: BridgeCommand) => {
    const tab = state.getPreferredTab();
    if (!tab?.url) {
      return immediateFailure(command, "No supported browser tab available for command execution");
    }

    const denied = enforceUrlPolicy(command, tab.url);
    if (denied) return denied;

    return null;
  };

  const server = createServer(async (req, res) => {
    try {
      const method = req.method ?? "GET";
      const parsedUrl = new URL(req.url ?? "/", `http://${host}:${port}`);
      const url = parsedUrl.pathname;

      if (method === "OPTIONS") {
        res.writeHead(204, {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, POST, OPTIONS",
          "access-control-allow-headers": "content-type",
        });
        res.end();
        return;
      }

      if (method === "GET" && url === "/health") {
        sendJson(res, 200, state.getStatus());
        return;
      }

      if (method === "GET" && url === "/v1/tabs") {
        sendJson(res, 200, state.getSnapshotResponse());
        return;
      }

      if (method === "GET" && url === "/v1/connector/next-command") {
        const connector = parsedUrl.searchParams.get("connector");
        if (!connector) {
          sendJson(res, 400, { ok: false, error: "connector is required" });
          return;
        }

        sendJson(res, 200, { command: state.takeNextCommand(connector) });
        return;
      }

      if (method === "POST" && url === "/v1/connector/snapshot") {
        const body = (await readJson(req)) as Partial<ConnectorSnapshot>;
        if (!body.connector || !body.browser || !body.mode || !Array.isArray(body.tabs)) {
          sendJson(res, 400, {
            ok: false,
            error: "connector, browser, mode, and tabs are required",
          });
          return;
        }

        const snapshot: ConnectorSnapshot = {
          connector: body.connector,
          browser: body.browser,
          mode: body.mode,
          tabs: body.tabs.map((tab) => ({
            id: String(tab.id ?? ""),
            url: String(tab.url ?? ""),
            title: String(tab.title ?? ""),
            active: Boolean(tab.active),
            lastSeenAt: typeof tab.lastSeenAt === "string" ? tab.lastSeenAt : new Date().toISOString(),
          })),
          updatedAt: typeof body.updatedAt === "string" ? body.updatedAt : new Date().toISOString(),
        };

        sendJson(res, 200, state.applySnapshot(snapshot));
        return;
      }

      if (method === "POST" && url === "/v1/connector/command-result") {
        const body = (await readJson(req)) as {
          commandId?: string;
          ok?: boolean;
          result?: Record<string, unknown>;
          error?: string;
        };

        if (!body.commandId || typeof body.ok !== "boolean") {
          sendJson(res, 400, {
            ok: false,
            error: "commandId and ok are required",
          });
          return;
        }

        const result: BridgeCommandResult = {
          ok: body.ok,
          result: body.result,
          error: body.error,
        };

        state.completeCommand(body.commandId, result);
        sendJson(res, 200, { ok: true });
        return;
      }

      if (method === "POST" && url === "/v1/commands/open-url") {
        const body = (await readJson(req)) as {
          connector?: string;
          url?: string;
          timeoutMs?: number;
        };

        if (!body.url) {
          sendJson(res, 400, { ok: false, error: "url is required" });
          return;
        }

        const connector = body.connector ?? "chrome-extension";
        const timeoutMs = body.timeoutMs ?? 5000;
        const command = state.enqueueOpenUrl(connector, body.url);
        const denied = enforceUrlPolicy(command, body.url);
        if (denied) {
          sendJson(res, 200, denied);
          return;
        }
        const result = await state.waitForCommandResult(command.id, timeoutMs);

        sendJson(res, 200, { command, result });
        return;
      }

      if (method === "POST" && url === "/v1/commands/switch-tab") {
        const body = (await readJson(req)) as {
          connector?: string;
          tabId?: string;
          timeoutMs?: number;
        };

        if (!body.tabId) {
          sendJson(res, 400, { ok: false, error: "tabId is required" });
          return;
        }

        const connector = body.connector ?? "chrome-extension";
        const timeoutMs = body.timeoutMs ?? 5000;
        const command = state.enqueueSwitchTab(connector, body.tabId);
        const targetTab = state.findTabById(body.tabId);
        if (!targetTab?.url) {
          sendJson(res, 200, immediateFailure(command, `Tab '${body.tabId}' is not available in the attached browser session`));
          return;
        }

        const denied = enforceUrlPolicy(command, targetTab.url);
        if (denied) {
          sendJson(res, 200, denied);
          return;
        }
        const result = await state.waitForCommandResult(command.id, timeoutMs);

        sendJson(res, 200, { command, result });
        return;
      }

      if (method === "POST" && url === "/v1/commands/click") {
        const body = (await readJson(req)) as {
          connector?: string;
          text?: string;
          exact?: boolean;
          timeoutMs?: number;
        };

        if (!body.text) {
          sendJson(res, 400, { ok: false, error: "text is required" });
          return;
        }

        const connector = body.connector ?? "chrome-extension";
        const timeoutMs = body.timeoutMs ?? 5000;
        const command = state.enqueueClick(connector, body.text, body.exact ?? false);
        const denied = enforcePreferredTabPolicy(command);
        if (denied) {
          sendJson(res, 200, denied);
          return;
        }
        const result = await state.waitForCommandResult(command.id, timeoutMs);

        sendJson(res, 200, { command, result });
        return;
      }

      if (method === "POST" && url === "/v1/commands/scroll") {
        const body = (await readJson(req)) as {
          connector?: string;
          direction?: "up" | "down";
          pages?: number;
          timeoutMs?: number;
        };

        if (body.direction !== "up" && body.direction !== "down") {
          sendJson(res, 400, { ok: false, error: "direction must be 'up' or 'down'" });
          return;
        }

        const connector = body.connector ?? "chrome-extension";
        const timeoutMs = body.timeoutMs ?? 5000;
        const command = state.enqueueScroll(connector, body.direction, body.pages ?? 1);
        const denied = enforcePreferredTabPolicy(command);
        if (denied) {
          sendJson(res, 200, denied);
          return;
        }
        const result = await state.waitForCommandResult(command.id, timeoutMs);

        sendJson(res, 200, { command, result });
        return;
      }

      if (method === "POST" && url === "/v1/commands/type") {
        const body = (await readJson(req)) as {
          connector?: string;
          text?: string;
          clear?: boolean;
          timeoutMs?: number;
        };

        if (!body.text) {
          sendJson(res, 400, { ok: false, error: "text is required" });
          return;
        }

        const connector = body.connector ?? "chrome-extension";
        const timeoutMs = body.timeoutMs ?? 5000;
        const command = state.enqueueType(connector, body.text, body.clear ?? false);
        const denied = enforcePreferredTabPolicy(command);
        if (denied) {
          sendJson(res, 200, denied);
          return;
        }
        const result = await state.waitForCommandResult(command.id, timeoutMs);

        sendJson(res, 200, { command, result });
        return;
      }

      if (method === "POST" && url === "/v1/commands/scan-page") {
        const body = (await readJson(req)) as {
          connector?: string;
          timeoutMs?: number;
        };

        const connector = body.connector ?? "chrome-extension";
        const timeoutMs = body.timeoutMs ?? 5000;
        const command = state.enqueueScanPage(connector);
        const denied = enforcePreferredTabPolicy(command);
        if (denied) {
          sendJson(res, 200, denied);
          return;
        }
        const result = await state.waitForCommandResult(command.id, timeoutMs);

        sendJson(res, 200, { command, result });
        return;
      }

      if (method === "POST" && url === "/v1/commands/capture-screenshot") {
        const body = (await readJson(req)) as {
          connector?: string;
          timeoutMs?: number;
        };

        const connector = body.connector ?? "chrome-extension";
        const timeoutMs = body.timeoutMs ?? 5000;
        const command = state.enqueueCaptureScreenshot(connector);
        const denied = enforcePreferredTabPolicy(command);
        if (denied) {
          sendJson(res, 200, denied);
          return;
        }
        const result = await state.waitForCommandResult(command.id, timeoutMs);

        sendJson(res, 200, { command, result });
        return;
      }

      notFound(res);
    } catch (err) {
      sendJson(res, 500, {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  console.error(`[real-browser-mcp] bridge listening on http://${host}:${port}`);
}
