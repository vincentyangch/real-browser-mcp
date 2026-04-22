export const DEFAULT_BRIDGE_HOST = process.env.REAL_BROWSER_MCP_BRIDGE_HOST ?? "127.0.0.1";
export const DEFAULT_BRIDGE_PORT = Number.parseInt(
  process.env.REAL_BROWSER_MCP_BRIDGE_PORT ?? "18767",
  10,
);

export function bridgeBaseUrl(host = DEFAULT_BRIDGE_HOST, port = DEFAULT_BRIDGE_PORT): string {
  return `http://${host}:${port}`;
}
