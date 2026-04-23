# Changelog

## v0.1.0-alpha - Unreleased

Initial alpha release candidate for local MCP-capable agents.

### Added

- Stdio MCP server with browser tools:
  - `browser_status`
  - `browser_list_tabs`
  - `browser_switch_tab`
  - `browser_open_url`
  - `browser_click`
  - `browser_scroll`
  - `browser_type`
  - `browser_scan_page`
  - `browser_capture_screenshot`
- Chrome extension connector for a real logged-in Chrome session.
- Local bridge for tab snapshots and command/result brokering.
- Managed bridge lifecycle for `real-browser-mcp mcp`.
- Optional bridge-local domain allow/deny policy.
- Chrome extension heartbeat that republishes snapshots for late-started bridges.
- CCBuddy live smoke coverage for the managed bridge path.

### Not Included

- Raw JavaScript execution.
- Raw Chrome DevTools Protocol passthrough.
- Cookie export.
- Desktop-wide physical input.
- Chrome Web Store packaging.
- npm package publishing.
