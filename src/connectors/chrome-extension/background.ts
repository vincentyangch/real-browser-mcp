/// <reference types="chrome" />

import { buildConnectorSnapshot } from "./snapshot.js";

const BRIDGE_URL = "http://127.0.0.1:18767/v1/connector/snapshot";
const NEXT_COMMAND_URL = "http://127.0.0.1:18767/v1/connector/next-command?connector=chrome-extension";
const COMMAND_RESULT_URL = "http://127.0.0.1:18767/v1/connector/command-result";
const CONNECTOR_NAME = "chrome-extension";

async function listEligibleTabs(): Promise<chrome.tabs.Tab[]> {
  const tabs = await chrome.tabs.query({});
  return tabs.filter((tab) => typeof tab.url === "string" && /^https?:/.test(tab.url));
}

async function publishTabsSnapshot(): Promise<void> {
  const tabs = await listEligibleTabs();
  const snapshot = buildConnectorSnapshot({
    connector: CONNECTOR_NAME,
    browser: "chrome",
    mode: "attached-session",
    tabs: tabs.map((tab) => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      active: tab.active,
    })),
  });

  await fetch(BRIDGE_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(snapshot),
  });
}

function scheduleSnapshot(): void {
  void publishTabsSnapshot().catch((err) => {
    console.warn("[real-browser-mcp][chrome-extension] snapshot publish failed:", err);
  });
}

async function reportCommandResult(commandId: string, payload: {
  ok: boolean;
  result?: Record<string, unknown>;
  error?: string;
}): Promise<void> {
  await fetch(COMMAND_RESULT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      commandId,
      ok: payload.ok,
      result: payload.result,
      error: payload.error,
    }),
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== "poll-bridge") return;

  void (async () => {
    try {
      const response = await fetch(NEXT_COMMAND_URL);
      const body = await response.json() as {
        command: {
          id: string;
          kind: "open_url";
          payload: { url: string };
        } | null;
      };

      if (!body.command) {
        sendResponse({ ok: true, command: null });
        return;
      }

      if (!sender.tab?.id) {
        await reportCommandResult(body.command.id, {
          ok: false,
          error: "No sender tab available for command execution",
        });
        sendResponse({ ok: false, command: body.command });
        return;
      }

      if (body.command.kind === "open_url") {
        await chrome.tabs.update(sender.tab.id, { url: body.command.payload.url });
        await reportCommandResult(body.command.id, {
          ok: true,
          result: {
            url: body.command.payload.url,
            tabId: String(sender.tab.id),
          },
        });
        sendResponse({ ok: true, command: body.command });
        return;
      }

      await reportCommandResult(body.command.id, {
        ok: false,
        error: `Unsupported command kind: ${body.command.kind}`,
      });
      sendResponse({ ok: false, command: body.command });
    } catch (err) {
      console.warn("[real-browser-mcp][chrome-extension] command poll failed:", err);
      sendResponse({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  })();

  return true;
});

chrome.runtime.onInstalled.addListener(() => {
  scheduleSnapshot();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleSnapshot();
});

chrome.tabs.onActivated.addListener(() => {
  scheduleSnapshot();
});

chrome.tabs.onCreated.addListener(() => {
  scheduleSnapshot();
});

chrome.tabs.onRemoved.addListener(() => {
  scheduleSnapshot();
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url !== undefined) {
    scheduleSnapshot();
  }
});
