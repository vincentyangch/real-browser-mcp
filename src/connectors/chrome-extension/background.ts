/// <reference types="chrome" />

import { buildPageScanResult, htmlToText } from "./page-scan.js";
import { buildConnectorSnapshot } from "./snapshot.js";
import { pickTargetTab } from "./tab-target.js";

const BRIDGE_URL = "http://127.0.0.1:18767/v1/connector/snapshot";
const NEXT_COMMAND_URL = "http://127.0.0.1:18767/v1/connector/next-command?connector=chrome-extension";
const COMMAND_RESULT_URL = "http://127.0.0.1:18767/v1/connector/command-result";
const CONNECTOR_NAME = "chrome-extension";
const BRIDGE_POLL_ALARM = "real-browser-mcp-poll";

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

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch target page: HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    globalThis.clearTimeout(timer);
  }
}

async function pollBridgeCommands(): Promise<void> {
  type PendingCommand = {
    id: string;
    kind: "open_url" | "scan_page" | "capture_screenshot";
    payload: { url?: string };
  };

  let command: PendingCommand | null = null;

  try {
    const response = await fetch(NEXT_COMMAND_URL);
    const body = await response.json() as { command: PendingCommand | null };

    command = body.command;
    if (!command) return;

    const tabs = await listEligibleTabs();
    const target = pickTargetTab(tabs);

    if (!target?.id || !target.url) {
      await reportCommandResult(command.id, {
        ok: false,
        error: "No supported browser tab available for command execution",
      });
      return;
    }

    if (command.kind === "open_url") {
      await chrome.tabs.update(target.id, { url: command.payload.url, active: true });
      await reportCommandResult(command.id, {
        ok: true,
        result: {
          url: command.payload.url,
          tabId: String(target.id),
        },
      });
      return;
    }

    if (command.kind === "scan_page") {
      const html = await fetchTextWithTimeout(target.url, 5000);

      await reportCommandResult(command.id, {
        ok: true,
        result: buildPageScanResult({
          url: target.url ?? "",
          title: target.title ?? "",
          text: htmlToText(html),
        }),
      });
      return;
    }

    if (command.kind === "capture_screenshot") {
      const dataUrl = await chrome.tabs.captureVisibleTab({ format: "png" });

      await reportCommandResult(command.id, {
        ok: true,
        result: {
          dataUrl,
          url: target.url,
          title: target.title ?? "",
          tabId: String(target.id),
        },
      });
      return;
    }

    await reportCommandResult(command.id, {
      ok: false,
      error: `Unsupported command kind: ${command.kind}`,
    });
  } catch (err) {
    console.warn("[real-browser-mcp][chrome-extension] bridge poll failed:", err);
    if (command) {
      await reportCommandResult(command.id, {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

function scheduleCommandPoll(): void {
  void pollBridgeCommands();
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(BRIDGE_POLL_ALARM, { periodInMinutes: 0.1 });
  scheduleCommandPoll();
  scheduleSnapshot();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(BRIDGE_POLL_ALARM, { periodInMinutes: 0.1 });
  scheduleCommandPoll();
  scheduleSnapshot();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === BRIDGE_POLL_ALARM) {
    scheduleCommandPoll();
  }
});

chrome.tabs.onActivated.addListener(() => {
  scheduleCommandPoll();
  scheduleSnapshot();
});

chrome.tabs.onCreated.addListener(() => {
  scheduleCommandPoll();
  scheduleSnapshot();
});

chrome.tabs.onRemoved.addListener(() => {
  scheduleCommandPoll();
  scheduleSnapshot();
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo) => {
  if (changeInfo.status === "complete" || changeInfo.url !== undefined) {
    scheduleCommandPoll();
    scheduleSnapshot();
  }
});
