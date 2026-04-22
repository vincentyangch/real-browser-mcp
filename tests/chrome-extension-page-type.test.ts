import test from "node:test";
import assert from "node:assert/strict";

import {
  isSupportedEditableTarget,
  type EditableTargetSnapshot,
} from "../src/connectors/chrome-extension/page-type.js";

test("isSupportedEditableTarget accepts text-like inputs and textareas", () => {
  const textInput: EditableTargetSnapshot = { tagName: "input", inputType: "text" };
  const searchInput: EditableTargetSnapshot = { tagName: "input", inputType: "search" };
  const textarea: EditableTargetSnapshot = { tagName: "textarea" };

  assert.equal(isSupportedEditableTarget(textInput), true);
  assert.equal(isSupportedEditableTarget(searchInput), true);
  assert.equal(isSupportedEditableTarget(textarea), true);
});

test("isSupportedEditableTarget accepts contenteditable regions", () => {
  const editableDiv: EditableTargetSnapshot = {
    tagName: "div",
    isContentEditable: true,
  };

  assert.equal(isSupportedEditableTarget(editableDiv), true);
});

test("isSupportedEditableTarget rejects unsupported, disabled, or readonly targets", () => {
  const checkbox: EditableTargetSnapshot = { tagName: "input", inputType: "checkbox" };
  const disabledInput: EditableTargetSnapshot = {
    tagName: "input",
    inputType: "text",
    disabled: true,
  };
  const readOnlyTextarea: EditableTargetSnapshot = {
    tagName: "textarea",
    readOnly: true,
  };

  assert.equal(isSupportedEditableTarget(checkbox), false);
  assert.equal(isSupportedEditableTarget(disabledInput), false);
  assert.equal(isSupportedEditableTarget(readOnlyTextarea), false);
});
