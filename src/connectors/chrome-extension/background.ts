/// <reference types="chrome" />

import { buildConnectorSnapshot } from "./snapshot.js";

const BRIDGE_URL = "http://127.0.0.1:18767/v1/connector/snapshot";
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
