# Security

`real-browser-mcp` controls a real logged-in Chrome session. Treat it as a powerful local automation tool, not as a sandboxed browser.

## Security Model

The project has three local pieces:

1. A Chrome extension that can discover supported tabs and execute narrow browser actions.
2. A local bridge on `127.0.0.1` that queues commands and stores tab snapshots.
3. A stdio MCP server that exposes browser tools to an agent host.

The MCP server defaults to `REAL_BROWSER_MCP_BRIDGE_MODE=auto`. In that mode it starts an in-process bridge when no healthy bridge exists, or reuses an existing bridge only when any configured domain policy matches.

## Important Risks

- The browser session may already be logged in to personal accounts.
- Actions happen in the real browser profile, not an isolated test profile.
- Page interaction tools can click, type, navigate, scan page text, and capture screenshots.
- A capable agent host may chain browser actions with other tools unless the host has approval gates or policy controls.
- Multiple agents using the same browser profile can interfere with each other.

## Chrome Extension Permissions

The extension requests broad host permissions because the connector needs to inspect supported tabs and run controlled page scripts on arbitrary `http` and `https` pages.

Current intentional exclusions:

- No raw JavaScript execution tool.
- No raw Chrome DevTools Protocol passthrough.
- No cookie export.
- No desktop-wide physical input.
- No `chrome://` or other browser-internal page automation.

## Domain Policy

Optional bridge-local domain policy can be configured with environment variables:

```bash
REAL_BROWSER_MCP_ALLOWED_DOMAINS=linux.do,example.com
REAL_BROWSER_MCP_DENIED_DOMAINS=discord.com
```

Rules:

1. Matching is case-insensitive.
2. A rule matches the exact host and subdomains.
3. Deny rules override allow rules.
4. An empty allow list means all domains are allowed unless denied.
5. Blocked commands fail before they are queued for the browser connector.

Domain policy is a safety backstop. It is not a replacement for host-side approvals, user roles, or tool-call review.

## Recommended Host Settings

- Use host-side approval gates for navigation, clicks, typing, screenshots, and page scans.
- Start with an allow list instead of broad access.
- Prefer a dedicated Chrome profile for testing risky workflows.
- Avoid running multiple browser-control agents against the same profile at the same time.
- Keep the bridge bound to `127.0.0.1`.

## Reporting Security Issues

This alpha does not yet have a formal private vulnerability reporting channel. Until one exists, avoid publishing sensitive exploit details in public issues.
