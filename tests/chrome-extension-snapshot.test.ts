import test from "node:test";
import assert from "node:assert/strict";

import {
  buildConnectorSnapshot,
  isSupportedBrowserUrl,
  type BrowserTabLike,
} from "../src/connectors/chrome-extension/snapshot.js";

test("isSupportedBrowserUrl accepts normal http and https pages", () => {
  assert.equal(isSupportedBrowserUrl("https://example.com"), true);
  assert.equal(isSupportedBrowserUrl("http://localhost:3000/dashboard"), true);
});

test("isSupportedBrowserUrl rejects internal or unsupported schemes", () => {
  assert.equal(isSupportedBrowserUrl("chrome://extensions"), false);
  assert.equal(isSupportedBrowserUrl("about:blank"), false);
  assert.equal(isSupportedBrowserUrl("file:///tmp/test.html"), false);
  assert.equal(isSupportedBrowserUrl(undefined), false);
});

test("buildConnectorSnapshot filters unsupported tabs and preserves active state", () => {
  const tabs: BrowserTabLike[] = [
    {
      id: 101,
      url: "https://example.com",
      title: "Example Domain",
      active: false,
    },
    {
      id: 102,
      url: "chrome://extensions",
      title: "Extensions",
      active: true,
    },
    {
      id: 103,
      url: "https://platform.openai.com",
      title: "OpenAI Platform",
      active: true,
    },
  ];

  const snapshot = buildConnectorSnapshot({
    connector: "chrome-extension",
    browser: "chrome",
    mode: "attached-session",
    tabs,
    updatedAt: "2026-04-21T21:30:00.000Z",
  });

  assert.equal(snapshot.tabs.length, 2);
  assert.deepEqual(snapshot.tabs.map((tab) => tab.id), ["101", "103"]);
  assert.equal(snapshot.tabs[0]?.active, false);
  assert.equal(snapshot.tabs[1]?.active, true);
  assert.equal(snapshot.tabs[0]?.lastSeenAt, "2026-04-21T21:30:00.000Z");
});
