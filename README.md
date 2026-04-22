# real-browser-mcp

MCP server for interacting with a real logged-in browser session.

This project is intended to provide a safer, narrower rewrite of the "real browser session" pattern:

- browser-side connector
- local bridge/session manager
- stdio MCP server

Initial goals:

1. Attach to a real browser session without requiring a sandbox browser.
2. Preserve login state and existing tabs.
3. Expose a minimal, audit-friendly MCP tool surface.
4. Keep risky capabilities gated or out of scope by default.

## Commands

```bash
npm run dev -- bridge-serve
npm run dev -- doctor
npm run dev -- mcp
npm run build
```

- `bridge-serve`: starts the local bridge server on `127.0.0.1:18767`
- `doctor`: queries the local bridge and prints status JSON
- `mcp`: starts the stdio MCP server
- `build`: compiles the server and packages a loadable unpacked extension into `dist/chrome-extension/`

## Current Bridge Contract

The local bridge currently exposes:

- `GET /health`
- `GET /v1/tabs`
- `POST /v1/connector/snapshot`

`POST /v1/connector/snapshot` is the first browser-connector integration point. A future browser-side connector should send:

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
- `src/connectors/chrome-extension/manifest.json`

Current behavior:

1. Query open `http` / `https` tabs
2. Map them into the bridge snapshot format
3. POST snapshots to the local bridge on install/startup/tab changes

Current limitation:

1. The unpacked extension folder is now generated at `dist/chrome-extension/`
2. It still only publishes tab snapshots
3. It intentionally does not expose clicks, JS execution, cookies, or CDP

## Initial Scope

Phase 1 tools:

- `browser_status`
- `browser_list_tabs`
- `browser_switch_tab`
- `browser_open_url`
- `browser_scan_page`
- `browser_capture_screenshot`

Deferred for later phases:

- browser click/type/scroll actions
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
