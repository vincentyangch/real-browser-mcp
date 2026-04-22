import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export async function packageChromeExtension(projectRoot: string): Promise<{
  extensionDir: string;
  files: string[];
}> {
  const sourceManifest = join(projectRoot, "src", "connectors", "chrome-extension", "manifest.json");
  const compiledBackground = join(projectRoot, "dist", "connectors", "chrome-extension", "background.js");
  const compiledPageClick = join(projectRoot, "dist", "connectors", "chrome-extension", "page-click.js");
  const compiledPageScroll = join(projectRoot, "dist", "connectors", "chrome-extension", "page-scroll.js");
  const compiledPageType = join(projectRoot, "dist", "connectors", "chrome-extension", "page-type.js");
  const compiledPageScan = join(projectRoot, "dist", "connectors", "chrome-extension", "page-scan.js");
  const compiledSnapshot = join(projectRoot, "dist", "connectors", "chrome-extension", "snapshot.js");
  const compiledTabTarget = join(projectRoot, "dist", "connectors", "chrome-extension", "tab-target.js");
  const extensionDir = join(projectRoot, "dist", "chrome-extension");

  mkdirSync(extensionDir, { recursive: true });

  cpSync(sourceManifest, join(extensionDir, "manifest.json"));
  cpSync(compiledBackground, join(extensionDir, "background.js"));
  cpSync(compiledPageClick, join(extensionDir, "page-click.js"));
  cpSync(compiledPageScan, join(extensionDir, "page-scan.js"));
  cpSync(compiledPageScroll, join(extensionDir, "page-scroll.js"));
  cpSync(compiledPageType, join(extensionDir, "page-type.js"));
  cpSync(compiledSnapshot, join(extensionDir, "snapshot.js"));
  cpSync(compiledTabTarget, join(extensionDir, "tab-target.js"));

  return {
    extensionDir,
    files: ["manifest.json", "background.js", "page-click.js", "page-scan.js", "page-scroll.js", "page-type.js", "snapshot.js", "tab-target.js"],
  };
}
