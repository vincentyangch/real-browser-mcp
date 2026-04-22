import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export async function packageChromeExtension(projectRoot: string): Promise<{
  extensionDir: string;
  files: string[];
}> {
  const sourceManifest = join(projectRoot, "src", "connectors", "chrome-extension", "manifest.json");
  const sourceContent = join(projectRoot, "src", "connectors", "chrome-extension", "content.js");
  const compiledBackground = join(projectRoot, "dist", "connectors", "chrome-extension", "background.js");
  const compiledSnapshot = join(projectRoot, "dist", "connectors", "chrome-extension", "snapshot.js");
  const extensionDir = join(projectRoot, "dist", "chrome-extension");

  mkdirSync(extensionDir, { recursive: true });

  cpSync(sourceManifest, join(extensionDir, "manifest.json"));
  cpSync(compiledBackground, join(extensionDir, "background.js"));
  cpSync(sourceContent, join(extensionDir, "content.js"));
  cpSync(compiledSnapshot, join(extensionDir, "snapshot.js"));

  return {
    extensionDir,
    files: ["manifest.json", "background.js", "content.js", "snapshot.js"],
  };
}
