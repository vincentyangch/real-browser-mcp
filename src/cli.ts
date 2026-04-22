#!/usr/bin/env node

import { BridgeClient } from "./bridge/http-client.js";
import { startBridgeServer } from "./bridge/http-server.js";
import { DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT, bridgeBaseUrl } from "./config.js";
import { packageChromeExtension } from "./connectors/chrome-extension/package.js";
import { startServer } from "./server.js";

async function runDoctor(): Promise<void> {
  const client = new BridgeClient(DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT);
  const status = await client.getStatus();
  console.log(JSON.stringify({
    bridgeUrl: bridgeBaseUrl(DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT),
    status,
  }, null, 2));
}

async function main(): Promise<void> {
  const command = process.argv[2] ?? "mcp";

  if (command === "bridge-serve") {
    await startBridgeServer(DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT);
    return;
  }

  if (command === "doctor") {
    await runDoctor();
    return;
  }

  if (command === "mcp") {
    await startServer();
    return;
  }

  if (command === "package-extension") {
    const result = await packageChromeExtension(process.cwd());
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.error(`Unknown command: ${command}`);
  console.error("Usage: real-browser-mcp [mcp|bridge-serve|doctor|package-extension]");
  process.exit(1);
}

main().catch((err) => {
  console.error("[real-browser-mcp] fatal:", err);
  process.exit(1);
});
