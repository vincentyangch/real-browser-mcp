import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeClickText,
  selectClickCandidate,
  type ClickableCandidate,
} from "../src/connectors/chrome-extension/page-click.js";

test("normalizeClickText trims, collapses whitespace, and lowercases", () => {
  assert.equal(normalizeClickText("  Reply   Now  "), "reply now");
});

test("selectClickCandidate matches the first visible enabled candidate by text", () => {
  const candidates: ClickableCandidate[] = [
    { text: "Reply", visible: false, disabled: false },
    { text: "Reply later", visible: true, disabled: false, tagName: "button" },
    { text: "Reply now", visible: true, disabled: false, tagName: "a" },
  ];

  const selected = selectClickCandidate(candidates, "reply");

  assert.deepEqual(selected, candidates[1]);
});

test("selectClickCandidate can match aria labels and input values", () => {
  const candidates: ClickableCandidate[] = [
    { ariaLabel: "Open settings", visible: true, disabled: false, tagName: "button" },
    { value: "Submit order", visible: true, disabled: false, tagName: "input" },
  ];

  assert.deepEqual(selectClickCandidate(candidates, "settings"), candidates[0]);
  assert.deepEqual(selectClickCandidate(candidates, "submit"), candidates[1]);
});

test("selectClickCandidate can match placeholders on editable fields", () => {
  const candidates: ClickableCandidate[] = [
    { placeholder: "Search site", visible: true, disabled: false, tagName: "input" },
    { placeholder: "Message body", visible: true, disabled: false, tagName: "textarea" },
  ];

  assert.deepEqual(selectClickCandidate(candidates, "search"), candidates[0]);
  assert.deepEqual(selectClickCandidate(candidates, "message"), candidates[1]);
});

test("selectClickCandidate exact mode requires an exact normalized match", () => {
  const candidates: ClickableCandidate[] = [
    { text: "Reply later", visible: true, disabled: false },
    { text: "Reply", visible: true, disabled: false },
  ];

  const selected = selectClickCandidate(candidates, "reply", true);

  assert.deepEqual(selected, candidates[1]);
});

test("selectClickCandidate ignores disabled candidates", () => {
  const candidates: ClickableCandidate[] = [
    { text: "Continue", visible: true, disabled: true },
    { text: "Continue", visible: true, disabled: false },
  ];

  const selected = selectClickCandidate(candidates, "continue", true);

  assert.deepEqual(selected, candidates[1]);
});
