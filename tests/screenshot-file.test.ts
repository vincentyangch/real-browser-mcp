import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { savePngDataUrl } from "../src/media/screenshot-file.js";

test("savePngDataUrl writes a png file to disk and returns the saved path", () => {
  const root = mkdtempSync(join(tmpdir(), "real-browser-mcp-shot-"));
  const tinyPngDataUrl =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9l9t8AAAAASUVORK5CYII=";

  const result = savePngDataUrl({
    dataUrl: tinyPngDataUrl,
    outputDir: root,
    filenamePrefix: "test-shot",
  });

  assert.match(result.savedTo, /test-shot/);
  assert.equal(result.mimeType, "image/png");
  assert.equal(result.bytes > 0, true);
  assert.equal(readFileSync(result.savedTo).length, result.bytes);
});
