import test from "node:test";
import assert from "node:assert/strict";

import {
  findTabById,
  pickTargetTab,
  type TabLike,
} from "../src/connectors/chrome-extension/tab-target.js";

test("pickTargetTab chooses the active supported tab first", () => {
  const tabs: TabLike[] = [
    { id: 1, url: "chrome://extensions", active: true },
    { id: 2, url: "https://example.com", active: false },
    { id: 3, url: "https://discord.com/channels/1/2", active: true },
  ];

  const selected = pickTargetTab(tabs);

  assert.equal(selected?.id, 3);
});

test("pickTargetTab falls back to the first supported tab when none are active", () => {
  const tabs: TabLike[] = [
    { id: 1, url: "chrome://extensions", active: false },
    { id: 2, url: "https://example.com", active: false },
    { id: 3, url: "https://discord.com/channels/1/2", active: false },
  ];

  const selected = pickTargetTab(tabs);

  assert.equal(selected?.id, 2);
});

test("pickTargetTab returns null when there are no supported http tabs", () => {
  const tabs: TabLike[] = [
    { id: 1, url: "chrome://extensions", active: true },
    { id: 2, url: "about:blank", active: false },
  ];

  const selected = pickTargetTab(tabs);

  assert.equal(selected, null);
});

test("findTabById returns a supported tab when the string id matches", () => {
  const tabs: TabLike[] = [
    { id: 1, url: "chrome://extensions", active: false },
    { id: 2, url: "https://example.com", active: false },
    { id: 3, url: "https://discord.com/channels/1/2", active: true },
  ];

  const selected = findTabById(tabs, "3");

  assert.equal(selected?.id, 3);
});

test("findTabById ignores unsupported tabs even when the id matches", () => {
  const tabs: TabLike[] = [
    { id: 1, url: "chrome://extensions", active: true },
    { id: 2, url: "https://example.com", active: false },
  ];

  const selected = findTabById(tabs, "1");

  assert.equal(selected, null);
});
