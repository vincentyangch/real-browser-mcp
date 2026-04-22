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
