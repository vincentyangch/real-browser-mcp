/// <reference types="chrome" />

import { clickElementByTextInPage, type PageClickResult } from "./page-click.js";
import { buildPageScanResult, htmlToText } from "./page-scan.js";
import { scrollPageInWindow, type PageScrollResult } from "./page-scroll.js";
import { typeIntoFocusedElementInPage, type PageTypeResult } from "./page-type.js";
import { buildConnectorSnapshot } from "./snapshot.js";
import { findTabById, pickTargetTab } from "./tab-target.js";

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

async function activateTab(tab: chrome.tabs.Tab): Promise<void> {
  if (!tab.id) {
    throw new Error("Target tab is missing an id");
  }

  await chrome.tabs.update(tab.id, { active: true });

  if (typeof tab.windowId === "number") {
    await chrome.windows.update(tab.windowId, { focused: true });
  }
}

async function clickInTab(
  tabId: number,
  payload: { text?: string; exact?: boolean },
): Promise<PageClickResult> {
  if (!payload.text) {
    return {
      ok: false,
      error: "click requires non-empty text",
    };
  }

  const [execution] = await chrome.scripting.executeScript({
    target: { tabId },
    func: clickElementByTextInPage,
    args: [{ text: payload.text, exact: payload.exact ?? false }],
  });

  return (
    execution?.result ?? {
      ok: false,
      error: "Click script returned no result",
    }
  );
}

async function scrollInTab(
  tabId: number,
  payload: { direction?: "up" | "down"; pages?: number },
): Promise<PageScrollResult> {
  if (payload.direction !== "up" && payload.direction !== "down") {
    return {
      ok: false,
      error: "scroll requires direction 'up' or 'down'",
    };
  }

  const [execution] = await chrome.scripting.executeScript({
    target: { tabId },
    func: scrollPageInWindow,
    args: [{ direction: payload.direction, pages: payload.pages ?? 1 }],
  });

  const result = execution?.result;
  if (result && typeof result === "object" && "ok" in result) {
    return result as PageScrollResult;
  }

  return {
    ok: true,
    direction: payload.direction,
    pages: payload.pages ?? 1,
  };
}

async function typeInTab(
  tabId: number,
  payload: { text?: string; clear?: boolean },
): Promise<PageTypeResult> {
  if (!payload.text) {
    return {
      ok: false,
      error: "type requires non-empty text",
    };
  }

  const [execution] = await chrome.scripting.executeScript({
    target: { tabId },
    func: typeIntoFocusedElementInPage,
    args: [{ text: payload.text, clear: payload.clear ?? false }],
  });

  return (
    execution?.result ?? {
      ok: false,
      error: "Type script returned no result",
    }
  );
}

async function pollBridgeCommands(): Promise<void> {
  type PendingCommand = {
    id: string;
    kind:
      | "open_url"
      | "switch_tab"
      | "click"
      | "scroll"
      | "type"
      | "scan_page"
      | "capture_screenshot";
    payload: {
      url?: string;
      tabId?: string;
      text?: string;
      exact?: boolean;
      direction?: "up" | "down";
      pages?: number;
      clear?: boolean;
    };
  };

  let command: PendingCommand | null = null;

  try {
    const response = await fetch(NEXT_COMMAND_URL);
    const body = await response.json() as { command: PendingCommand | null };

    command = body.command;
    if (!command) return;

    const tabs = await listEligibleTabs();

    if (command.kind === "open_url") {
      const target = pickTargetTab(tabs);
      if (!target?.id || !target.url) {
        await reportCommandResult(command.id, {
          ok: false,
          error: "No supported browser tab available for command execution",
        });
        return;
      }

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

    if (command.kind === "switch_tab") {
      if (!command.payload.tabId) {
        await reportCommandResult(command.id, {
          ok: false,
          error: "switch_tab requires a tabId payload",
        });
        return;
      }

      const target = findTabById(tabs, command.payload.tabId);
      if (!target?.id || !target.url) {
        await reportCommandResult(command.id, {
          ok: false,
          error: `Tab '${command.payload.tabId}' is not available in the attached browser session`,
        });
        return;
      }

      await activateTab(target);
      await reportCommandResult(command.id, {
        ok: true,
        result: {
          tabId: String(target.id),
          url: target.url,
          title: target.title ?? "",
        },
      });
      return;
    }

    if (command.kind === "click") {
      const target = pickTargetTab(tabs);
      if (!target?.id || !target.url) {
        await reportCommandResult(command.id, {
          ok: false,
          error: "No supported browser tab available for command execution",
        });
        return;
      }

      const result = await clickInTab(target.id, command.payload);
      await reportCommandResult(
        command.id,
        result.ok
          ? {
              ok: true,
              result,
            }
          : {
              ok: false,
              error: result.error,
            },
      );
      return;
    }

    if (command.kind === "scroll") {
      const target = pickTargetTab(tabs);
      if (!target?.id || !target.url) {
        await reportCommandResult(command.id, {
          ok: false,
          error: "No supported browser tab available for command execution",
        });
        return;
      }

      const result = await scrollInTab(target.id, command.payload);
      await reportCommandResult(
        command.id,
        result.ok
          ? {
              ok: true,
              result,
            }
          : {
              ok: false,
              error: result.error,
            },
      );
      return;
    }

    if (command.kind === "type") {
      const target = pickTargetTab(tabs);
      if (!target?.id || !target.url) {
        await reportCommandResult(command.id, {
          ok: false,
          error: "No supported browser tab available for command execution",
        });
        return;
      }

      const result = await typeInTab(target.id, command.payload);
      await reportCommandResult(
        command.id,
        result.ok
          ? {
              ok: true,
              result,
            }
          : {
              ok: false,
              error: result.error,
            },
      );
      return;
    }

    if (command.kind === "scan_page") {
      const target = pickTargetTab(tabs);
      if (!target?.id || !target.url) {
        await reportCommandResult(command.id, {
          ok: false,
          error: "No supported browser tab available for command execution",
        });
        return;
      }

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
      const target = pickTargetTab(tabs);
      if (!target?.id || !target.url) {
        await reportCommandResult(command.id, {
          ok: false,
          error: "No supported browser tab available for command execution",
        });
        return;
      }

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
