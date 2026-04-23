# Architecture

`real-browser-mcp` is planned as three layers:

1. Browser connector
2. Local bridge/session manager
3. MCP server

## Browser Connector

Responsibilities:

1. Discover eligible tabs.
2. Provide page metadata and structured page reads.
3. Support controlled navigation and screenshots.
4. Avoid invasive page mutation.

## Local Bridge

Responsibilities:

1. Track browser sessions/tabs.
2. Broker requests between MCP tools and the browser connector.
3. Normalize errors and timeouts.
4. Provide diagnostics.
5. Optionally enforce simple domain allow/deny rules before queueing commands.

### Phase 1 HTTP Contract

Endpoints:

1. `GET /health`
2. `GET /v1/tabs`
3. `POST /v1/connector/snapshot`

The browser connector is expected to publish full tab snapshots into the bridge. The MCP server then consumes bridge state rather than talking to the browser connector directly.

## MCP Server

Responsibilities:

1. Expose a minimal tool surface.
2. Keep tool schemas stable.
3. Avoid embedding product-specific policy.
4. Own the local bridge lifecycle when running in managed or auto mode.

### Bridge Lifecycle Modes

`mcp` defaults to `REAL_BROWSER_MCP_BRIDGE_MODE=auto`.

1. `auto` reuses a healthy bridge if one is already listening, otherwise starts an in-process managed bridge.
2. `managed` always starts an in-process bridge and fails if the configured host/port is occupied.
3. `external` requires a separately launched `bridge-serve` process.

For CCBuddy, the intended normal path is one external MCP server entry that runs `real-browser-mcp mcp`. The managed bridge receives the same environment variables as the MCP server, including the optional allow/deny domain policy.
When allow/deny policy is configured, `auto` mode only reuses an existing bridge if `/health` reports the same policy summary.

## Phase 1 Safety Boundary

Allowed:

1. Status
2. Tab listing/switching
3. URL navigation
4. Page scanning
5. Page screenshot capture
6. Narrow text-based click
7. Narrow viewport-based scroll
8. Focused-element typing
9. Optional bridge-local domain allow/deny checks

Deferred:

1. JS execution
2. Raw CDP passthrough
3. Cookie export
4. Physical desktop input
