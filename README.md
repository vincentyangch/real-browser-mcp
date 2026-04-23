# real-browser-mcp

[English](README.md) | [简体中文](README.zh-CN.md)

Alpha MCP server for interacting with a real logged-in Chrome session.

This project is intended to provide a safer, narrower rewrite of the "real browser session" pattern:

- browser-side connector
- local bridge/session manager
- stdio MCP server

Initial goals:

1. Attach to a real browser session without requiring a sandbox browser.
2. Preserve login state and existing tabs.
3. Expose a minimal, audit-friendly MCP tool surface.
4. Keep risky capabilities gated or out of scope by default.

## Alpha Status

`real-browser-mcp` is ready for early local alpha use by MCP-capable agents, including CCBuddy. It is not yet a stable public API.

Verified so far:

- `npm test`
- `npm run typecheck`
- `npm run build`
- CCBuddy live smoke using the managed bridge path

See `docs/security.md` and `docs/known-limitations.md` before connecting it to a broadly capable agent.

Agents can follow `docs/agent-setup.md` for an install, extension setup, MCP registration, and smoke-test runbook.

## Quickstart

Prerequisites:

- Node.js 22 or newer
- Google Chrome
- An MCP-capable local agent host

Build the server and unpacked Chrome extension:

```bash
git clone https://github.com/vincentyangch/real-browser-mcp.git
cd real-browser-mcp
npm install
npm run build
```

Load the Chrome extension:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select `dist/chrome-extension`.
5. Confirm the extension is enabled and has site access for the sites you want to use.

Check bridge status:

```bash
node dist/cli.js doctor
```

Run as a stdio MCP server:

```bash
node dist/cli.js mcp
```

## Commands

```bash
npm run dev -- bridge-serve
npm run dev -- doctor
npm run dev -- mcp
npm run build
```

- `bridge-serve`: starts the local bridge server on `127.0.0.1:18767`
- `doctor`: queries the local bridge and prints status JSON
- `mcp`: starts the stdio MCP server and, by default, auto-starts the local bridge if one is not already healthy
- `build`: compiles the server and packages a loadable unpacked extension into `dist/chrome-extension/`

## MCP Host Examples

Codex CLI:

```bash
codex mcp add real-browser \
  --env REAL_BROWSER_MCP_ALLOWED_DOMAINS=yahoo.com \
  --env REAL_BROWSER_MCP_DENIED_DOMAINS=discord.com \
  -- node /absolute/path/to/real-browser-mcp/dist/cli.js mcp
```

Claude Code CLI:

```bash
claude mcp add -s user \
  -e REAL_BROWSER_MCP_ALLOWED_DOMAINS=yahoo.com \
  -e REAL_BROWSER_MCP_DENIED_DOMAINS=discord.com \
  real-browser -- node /absolute/path/to/real-browser-mcp/dist/cli.js mcp
```

CCBuddy:

```yaml
ccbuddy:
  agent:
    external_mcp_servers:
      - name: "real-browser"
        command: "/usr/bin/env"
        args:
          - "node"
          - "/absolute/path/to/real-browser-mcp/dist/cli.js"
          - "mcp"
        env:
          REAL_BROWSER_MCP_ALLOWED_DOMAINS: "yahoo.com"
          REAL_BROWSER_MCP_DENIED_DOMAINS: "discord.com"
```

Generic MCP JSON:

```json
{
  "mcpServers": {
    "real-browser": {
      "type": "stdio",
      "command": "node",
      "args": ["/absolute/path/to/real-browser-mcp/dist/cli.js", "mcp"],
      "env": {
        "REAL_BROWSER_MCP_ALLOWED_DOMAINS": "yahoo.com",
        "REAL_BROWSER_MCP_DENIED_DOMAINS": "discord.com"
      }
    }
  }
}
```

## Bridge Lifecycle

`real-browser-mcp mcp` uses `REAL_BROWSER_MCP_BRIDGE_MODE=auto` by default:

1. If a healthy bridge already exists at `REAL_BROWSER_MCP_BRIDGE_HOST` / `REAL_BROWSER_MCP_BRIDGE_PORT`, the MCP server reuses it.
2. If no healthy bridge exists, the MCP server starts an in-process managed bridge.
3. Managed bridges use the same domain policy environment as the MCP server, so hosts such as CCBuddy only need one external MCP entry for the normal path.
4. If allow/deny policy is configured but an existing bridge does not report the same policy, startup fails instead of silently bypassing the requested policy.

Optional bridge lifecycle modes:

- `REAL_BROWSER_MCP_BRIDGE_MODE=auto`: reuse an existing bridge or start one if missing
- `REAL_BROWSER_MCP_BRIDGE_MODE=managed`: always start an in-process bridge and fail if the port is occupied
- `REAL_BROWSER_MCP_BRIDGE_MODE=external`: require a separately launched bridge

## Domain Policy

Optional bridge-local domain policy can be configured with environment variables:

- `REAL_BROWSER_MCP_ALLOWED_DOMAINS`
- `REAL_BROWSER_MCP_DENIED_DOMAINS`

Both variables accept comma-separated hostnames such as `yahoo.com,example.com`.

Current matching rules:

1. Rules are case-insensitive.
2. A rule matches the exact host and its subdomains.
3. Deny rules win over allow rules.
4. If `REAL_BROWSER_MCP_ALLOWED_DOMAINS` is empty, all domains are allowed unless denied.
5. The bridge rejects blocked commands before they are queued for the browser connector.

## Current Bridge Contract

The local bridge currently exposes:

- `GET /health`
- `GET /v1/tabs`
- `POST /v1/connector/snapshot`
- `GET /v1/connector/next-command?connector=<name>`
- `POST /v1/connector/command-result`
- `POST /v1/commands/open-url`
- `POST /v1/commands/switch-tab`
- `POST /v1/commands/click`
- `POST /v1/commands/scroll`
- `POST /v1/commands/type`
- `POST /v1/commands/scan-page`
- `POST /v1/commands/capture-screenshot`

`POST /v1/connector/snapshot` is the browser-connector integration point. The Chrome extension sends snapshots like:

```json
{
  "connector": "chrome-extension",
  "browser": "chrome",
  "mode": "attached-session",
  "tabs": [
    {
      "id": "tab-1",
      "url": "https://example.com",
      "title": "Example Domain",
      "active": true
    }
  ],
  "updatedAt": "2026-04-21T21:20:00.000Z"
}
```

## Connector Scaffold

The repo now includes a first Chrome extension connector scaffold in:

- `src/connectors/chrome-extension/background.ts`
- `src/connectors/chrome-extension/snapshot.ts`
- `src/connectors/chrome-extension/tab-target.ts`
- `src/connectors/chrome-extension/manifest.json`

Current behavior:

1. Query open `http` / `https` tabs
2. Map them into the bridge snapshot format
3. POST snapshots to the local bridge on install/startup/tab changes
4. Poll bridge commands from the extension background worker
5. Execute bridge commands from the background worker against the active supported tab

Current limitation:

1. The unpacked extension folder is now generated at `dist/chrome-extension/`
2. Command execution currently supports `open_url`, `switch_tab`, `click`, `scroll`, `type`, `scan_page`, and `capture_screenshot`
3. The first click primitive is text-based and clicks the first visible interactive element that matches
4. The first scroll primitive is viewport-based and scrolls the active page by a requested page count
5. The first type primitive types only into the currently focused editable element
6. Bridge-local domain policy is optional and env-driven, but richer host-side policy should still live in the consuming agent
7. It intentionally does not expose raw JS execution, cookies, or CDP

## Initial Scope

Phase 1 tools:

- `browser_status`
- `browser_list_tabs`
- `browser_switch_tab`
- `browser_open_url`
- `browser_click`
- `browser_scroll`
- `browser_type`
- `browser_scan_page`
- `browser_capture_screenshot`

Deferred for later phases:

- browser type actions
- raw JS execution
- raw CDP passthrough
- cookie export
- desktop-wide physical input

## Design Principles

1. Read-mostly first.
2. No CSP stripping.
3. No silent dialog suppression.
4. No broad dangerous tools by default.
5. Keep browser capability separate from policy enforcement.

Policy such as user approvals, role gating, and domain restrictions should be enforced by the consuming agent host, such as CCBuddy.
This repo now also supports an optional bridge-local allow/deny layer as a safety backstop for basic domain control.

## Release Planning

See `docs/release-todos.md` for the `v0.1.0-alpha` release checklist.

## License

MIT. See `LICENSE`.
