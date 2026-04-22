import test from "node:test";
import assert from "node:assert/strict";

import { BridgeState } from "../src/bridge/state.js";

test("BridgeState queues and serves an open_url command for a connector", () => {
  const state = new BridgeState();

  const command = state.enqueueOpenUrl("chrome-extension", "https://example.com");

  assert.equal(command.connector, "chrome-extension");
  assert.equal(command.kind, "open_url");
  assert.equal(command.payload.url, "https://example.com");
  assert.equal(command.status, "pending");

  const next = state.takeNextCommand("chrome-extension");
  assert.ok(next);
  assert.equal(next?.id, command.id);

  const none = state.takeNextCommand("chrome-extension");
  assert.equal(none, null);
});

test("BridgeState resolves a pending command result", async () => {
  const state = new BridgeState();
  const command = state.enqueueOpenUrl("chrome-extension", "https://example.com");

  const pending = state.waitForCommandResult(command.id, 1000);

  state.completeCommand(command.id, {
    ok: true,
    result: {
      url: "https://example.com",
      tabId: "123",
    },
  });

  const result = await pending;

  assert.equal(result.ok, true);
  assert.deepEqual(result.result, {
    url: "https://example.com",
    tabId: "123",
  });
});

test("BridgeState reports configured status notes alongside snapshot notes", () => {
  const state = new BridgeState({
    statusNotes: ["Domain policy active. allow=linux.do; deny=discord.com"],
  });

  const status = state.getStatus();

  assert.deepEqual(status.notes, [
    "Domain policy active. allow=linux.do; deny=discord.com",
    "Bridge server is running, but no browser connector has registered a session snapshot yet.",
    "Next step: implement a browser-side connector that posts tab snapshots to /v1/connector/snapshot.",
  ]);
});

test("BridgeState returns the active tab first and falls back to the first known tab", () => {
  const state = new BridgeState();

  state.applySnapshot({
    connector: "chrome-extension",
    browser: "chrome",
    mode: "attached-session",
    updatedAt: "2026-04-22T10:00:00.000Z",
    tabs: [
      {
        id: "100",
        url: "https://example.com",
        title: "Example",
        active: false,
        lastSeenAt: "2026-04-22T10:00:00.000Z",
      },
      {
        id: "200",
        url: "https://linux.do",
        title: "LINUX DO",
        active: true,
        lastSeenAt: "2026-04-22T10:00:00.000Z",
      },
    ],
  });

  assert.equal(state.getPreferredTab()?.id, "200");
  assert.equal(state.findTabById("100")?.title, "Example");
  assert.equal(state.findTabById("999"), null);
});

test("BridgeState queues and serves a scan_page command for a connector", () => {
  const state = new BridgeState();

  const command = state.enqueueScanPage("chrome-extension");

  assert.equal(command.connector, "chrome-extension");
  assert.equal(command.kind, "scan_page");
  assert.deepEqual(command.payload, {});
  assert.equal(command.status, "pending");

  const next = state.takeNextCommand("chrome-extension");
  assert.ok(next);
  assert.equal(next?.id, command.id);
  assert.equal(next?.kind, "scan_page");
});

test("BridgeState queues and serves a capture_screenshot command for a connector", () => {
  const state = new BridgeState();

  const command = state.enqueueCaptureScreenshot("chrome-extension");

  assert.equal(command.connector, "chrome-extension");
  assert.equal(command.kind, "capture_screenshot");
  assert.deepEqual(command.payload, {});
  assert.equal(command.status, "pending");

  const next = state.takeNextCommand("chrome-extension");
  assert.ok(next);
  assert.equal(next?.id, command.id);
  assert.equal(next?.kind, "capture_screenshot");
});

test("BridgeState queues and serves a switch_tab command for a connector", () => {
  const state = new BridgeState();

  const command = state.enqueueSwitchTab("chrome-extension", "103");

  assert.equal(command.connector, "chrome-extension");
  assert.equal(command.kind, "switch_tab");
  assert.deepEqual(command.payload, { tabId: "103" });
  assert.equal(command.status, "pending");

  const next = state.takeNextCommand("chrome-extension");
  assert.ok(next);
  assert.equal(next?.id, command.id);
  assert.equal(next?.kind, "switch_tab");
});

test("BridgeState queues and serves a click command for a connector", () => {
  const state = new BridgeState();

  const command = state.enqueueClick("chrome-extension", "Reply", false);

  assert.equal(command.connector, "chrome-extension");
  assert.equal(command.kind, "click");
  assert.deepEqual(command.payload, { text: "Reply", exact: false });
  assert.equal(command.status, "pending");

  const next = state.takeNextCommand("chrome-extension");
  assert.ok(next);
  assert.equal(next?.id, command.id);
  assert.equal(next?.kind, "click");
});

test("BridgeState queues and serves a scroll command for a connector", () => {
  const state = new BridgeState();

  const command = state.enqueueScroll("chrome-extension", "down", 1.5);

  assert.equal(command.connector, "chrome-extension");
  assert.equal(command.kind, "scroll");
  assert.deepEqual(command.payload, { direction: "down", pages: 1.5 });
  assert.equal(command.status, "pending");

  const next = state.takeNextCommand("chrome-extension");
  assert.ok(next);
  assert.equal(next?.id, command.id);
  assert.equal(next?.kind, "scroll");
});

test("BridgeState queues and serves a type command for a connector", () => {
  const state = new BridgeState();

  const command = state.enqueueType("chrome-extension", "codex smoke", true);

  assert.equal(command.connector, "chrome-extension");
  assert.equal(command.kind, "type");
  assert.deepEqual(command.payload, { text: "codex smoke", clear: true });
  assert.equal(command.status, "pending");

  const next = state.takeNextCommand("chrome-extension");
  assert.ok(next);
  assert.equal(next?.id, command.id);
  assert.equal(next?.kind, "type");
});
