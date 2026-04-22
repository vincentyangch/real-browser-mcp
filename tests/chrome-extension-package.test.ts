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
      permissions: ["tabs", "alarms", "scripting"],
      host_permissions: ["<all_urls>"],
      background: {
        service_worker: "background.js",
        type: "module",
      },
    }, null, 2),
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
  writeFileSync(
    join(compiledDir, "tab-target.js"),
    'export function pickTargetTab() { return null; }\n',
    "utf8",
  );
  writeFileSync(
    join(compiledDir, "page-scan.js"),
    'export function buildPageScanResult() { return { text: "" }; }\n',
    "utf8",
  );
  writeFileSync(
    join(compiledDir, "page-click.js"),
    'export function selectClickCandidate() { return null; }\n',
    "utf8",
  );
  writeFileSync(
    join(compiledDir, "page-scroll.js"),
    'export function computeScrollDelta() { return 0; }\n',
    "utf8",
  );
  writeFileSync(
    join(compiledDir, "page-type.js"),
    'export function isSupportedEditableTarget() { return true; }\n',
    "utf8",
  );

  const result = await packageChromeExtension(root);

  assert.equal(result.extensionDir, join(root, "dist", "chrome-extension"));
  assert.deepEqual(result.files.sort(), ["background.js", "manifest.json", "page-click.js", "page-scan.js", "page-scroll.js", "page-type.js", "snapshot.js", "tab-target.js"]);
  assert.match(readFileSync(join(result.extensionDir, "background.js"), "utf8"), /background ready/);
  assert.match(readFileSync(join(result.extensionDir, "page-click.js"), "utf8"), /selectClickCandidate/);
  assert.match(readFileSync(join(result.extensionDir, "page-scroll.js"), "utf8"), /computeScrollDelta/);
  assert.match(readFileSync(join(result.extensionDir, "page-type.js"), "utf8"), /isSupportedEditableTarget/);
  assert.match(readFileSync(join(result.extensionDir, "snapshot.js"), "utf8"), /buildConnectorSnapshot/);
  assert.match(readFileSync(join(result.extensionDir, "tab-target.js"), "utf8"), /pickTargetTab/);
  assert.match(readFileSync(join(result.extensionDir, "page-scan.js"), "utf8"), /buildPageScanResult/);
  assert.match(readFileSync(join(result.extensionDir, "manifest.json"), "utf8"), /real-browser-mcp connector/);
  assert.match(readFileSync(join(result.extensionDir, "manifest.json"), "utf8"), /<all_urls>/);
  assert.match(readFileSync(join(result.extensionDir, "manifest.json"), "utf8"), /scripting/);
  assert.ok(!readFileSync(join(result.extensionDir, "manifest.json"), "utf8").includes("content_scripts"));
});
