import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { BridgeClient } from "./bridge/http-client.js";
import { DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT } from "./config.js";
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

export async function startServer(): Promise<void> {
  const bridge = new BridgeClient(DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT);

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
    async ({ tabId }) =>
      textResult(
        unimplemented(
          `switch_tab not implemented yet for tab '${tabId}'. Next step: add a bridge command for active-tab selection.`,
        ),
      ),
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
