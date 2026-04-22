import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { packageChromeExtension } from "../src/connectors/chrome-extension/package.js";

test("packageChromeExtension creates a loadable unpacked extension folder", async () => {
  const root = mkdtempSync(join(tmpdir(), "real-browser-mcp-package-"));
  const srcDir = join(root, "src", "connectors", "chrome-extension");
  const compiledDir = join(root, "dist", "connectors", "chrome-extension");

  mkdirSync(srcDir, { recursive: true });
  mkdirSync(compiledDir, { recursive: true });

  writeFileSync(
    join(srcDir, "manifest.json"),
    JSON.stringify({
      manifest_version: 3,
      name: "real-browser-mcp connector",
      version: "0.1.0",
      background: {
        service_worker: "background.js",
        type: "module",
      },
    }, null, 2),
    "utf8",
  );
  writeFileSync(
    join(srcDir, "content.js"),
    'console.log("content ready");\n',
    "utf8",
  );

  writeFileSync(
    join(compiledDir, "background.js"),
    'console.log("background ready");\n',
    "utf8",
  );
  writeFileSync(
    join(compiledDir, "snapshot.js"),
    'export function buildConnectorSnapshot() { return { tabs: [] }; }\n',
    "utf8",
  );

  const result = await packageChromeExtension(root);

  assert.equal(result.extensionDir, join(root, "dist", "chrome-extension"));
  assert.deepEqual(result.files.sort(), ["background.js", "content.js", "manifest.json", "snapshot.js"]);
  assert.match(readFileSync(join(result.extensionDir, "background.js"), "utf8"), /background ready/);
  assert.match(readFileSync(join(result.extensionDir, "content.js"), "utf8"), /content ready/);
  assert.match(readFileSync(join(result.extensionDir, "snapshot.js"), "utf8"), /buildConnectorSnapshot/);
  assert.match(readFileSync(join(result.extensionDir, "manifest.json"), "utf8"), /real-browser-mcp connector/);
});
