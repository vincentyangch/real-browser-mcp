import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { BridgeClient } from "./bridge/http-client.js";
import { ensureBridgeServer, type BridgeRuntime } from "./bridge/lifecycle.js";
import {
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_LIFECYCLE_MODE,
  DEFAULT_BRIDGE_PORT,
  DEFAULT_DOMAIN_POLICY,
} from "./config.js";
import { savePngDataUrl } from "./media/screenshot-file.js";

type FailureResult = {
  ok: false;
  reason: string;
};

function textResult(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function unimplemented(reason: string): FailureResult {
  return {
    ok: false,
    reason,
  };
}

function installManagedBridgeShutdown(runtime: BridgeRuntime): void {
  if (runtime.source !== "managed" || !runtime.close) return;

  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    try {
      await runtime.close?.();
    } catch (err) {
      console.error("[real-browser-mcp] failed to close managed bridge:", err);
    }
  };

  const exitAfterClose = (code: number) => {
    void close().finally(() => process.exit(code));
  };

  process.once("SIGINT", () => exitAfterClose(130));
  process.once("SIGTERM", () => exitAfterClose(0));
  process.stdin.once("end", () => {
    void close();
  });
  process.stdin.once("close", () => {
    void close();
  });
}

export async function startServer(): Promise<void> {
  const bridgeRuntime = await ensureBridgeServer({
    host: DEFAULT_BRIDGE_HOST,
    port: DEFAULT_BRIDGE_PORT,
    mode: DEFAULT_BRIDGE_LIFECYCLE_MODE,
    domainPolicy: DEFAULT_DOMAIN_POLICY,
  });
  installManagedBridgeShutdown(bridgeRuntime);

  console.error(`[real-browser-mcp] mcp using ${bridgeRuntime.source} bridge at ${bridgeRuntime.url}`);

  const bridge = new BridgeClient(bridgeRuntime.host, bridgeRuntime.port);

  const server = new McpServer({
    name: "real-browser-mcp",
    version: "0.1.0",
  });

  server.registerTool(
    "browser_status",
    {
      description: "Return connection and bridge status for the real browser session.",
    },
    async () => textResult(await bridge.getStatus()),
  );

  server.registerTool(
    "browser_list_tabs",
    {
      description: "List known browser tabs in the attached real browser session.",
    },
    async () => textResult(await bridge.getTabs()),
  );

  server.registerTool(
    "browser_switch_tab",
    {
      description: "Switch the active browser tab by id.",
      inputSchema: {
        tabId: z.string(),
      },
    },
    async ({ tabId }) => textResult(await bridge.switchTab(tabId)),
  );

  server.registerTool(
    "browser_open_url",
    {
      description: "Open a URL in the current browser session.",
      inputSchema: {
        url: z.string().url(),
      },
    },
    async ({ url }) => textResult(await bridge.openUrl(url)),
  );

  server.registerTool(
    "browser_click",
    {
      description: "Click the first visible interactive element whose text matches the provided text.",
      inputSchema: {
        text: z.string().min(1),
        exact: z.boolean().optional(),
      },
    },
    async ({ text, exact }) => textResult(await bridge.click(text, exact ?? false)),
  );

  server.registerTool(
    "browser_scroll",
    {
      description: "Scroll the current page up or down by a number of viewport pages.",
      inputSchema: {
        direction: z.enum(["up", "down"]),
        pages: z.number().positive().optional(),
      },
    },
    async ({ direction, pages }) => textResult(await bridge.scroll(direction, pages ?? 1)),
  );

  server.registerTool(
    "browser_type",
    {
      description: "Type text into the currently focused editable element on the active page.",
      inputSchema: {
        text: z.string().min(1),
        clear: z.boolean().optional(),
      },
    },
    async ({ text, clear }) => textResult(await bridge.type(text, clear ?? false)),
  );

  server.registerTool(
    "browser_scan_page",
    {
      description: "Read the current page content from the attached browser session.",
    },
    async () => textResult(await bridge.scanPage()),
  );

  server.registerTool(
    "browser_capture_screenshot",
    {
      description: "Capture a screenshot of the current page in the attached browser session.",
    },
    async () => {
      const response = await bridge.captureScreenshot();
      const dataUrl = response.result.result?.dataUrl;

      if (!response.result.ok || typeof dataUrl !== "string") {
        return textResult(response);
      }

      const outputDir = join(process.cwd(), "artifacts", "screenshots");
      mkdirSync(outputDir, { recursive: true });

      const savedScreenshot = savePngDataUrl({
        dataUrl,
        outputDir,
        filenamePrefix: "real-browser-mcp-shot",
      });

      return textResult({
        ...response,
        savedScreenshot,
      });
    },
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
