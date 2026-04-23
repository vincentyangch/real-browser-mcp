# Release To-Dos

Target release: `v0.1.0-alpha`

Release intent: make `real-browser-mcp` safe and clear enough for early public use by MCP-capable local agents, while explicitly labeling it alpha software.

Release channel: GitHub-only for the first alpha. npm publishing is intentionally deferred.

## Current Alpha Evidence

- Unit/integration tests pass with `npm test`.
- TypeScript typecheck passes with `npm run typecheck`.
- Build and Chrome extension packaging pass with `npm run build`.
- Live CCBuddy smoke passed using the managed bridge path without manually starting `bridge-serve`.
- Release CCBuddy smoke repeated on 2026-04-23 using the managed bridge path.
- Codex CLI smoke passed on 2026-04-23 using one-shot config overrides.
- Domain policy propagation was verified with `REAL_BROWSER_MCP_ALLOWED_DOMAINS=linux.do` and `REAL_BROWSER_MCP_DENIED_DOMAINS=discord.com`.
- The Chrome extension observed real supported tabs from the user's logged-in Chrome session.

## Smoke Results

- Codex CLI: passed on 2026-04-23. It called `browser_status` and `browser_list_tabs`, returned `connected=true`, `tabs=2`, and reported the expected domain policy.
- CCBuddy: passed on 2026-04-23. It called `real-browser/browser_status` and `real-browser/browser_list_tabs`, returned `connected=true`, `tabs=2`, and reported the expected domain policy.
- Claude Code CLI: MCP configuration loaded and `real-browser` connected on 2026-04-23, but the model turn was blocked by local Claude auth with `403` and `Your organization does not have access to Claude`. Full tool-call smoke remains blocked until Claude auth is restored or a usable Claude model/provider is configured.

## Release Blockers

- Decide whether the Claude Code CLI auth-blocked smoke is acceptable for `v0.1.0-alpha`, or rerun after Claude auth is restored.
- Tag `v0.1.0-alpha` and create a GitHub release.

## Documentation Tasks

- Completed: expanded `README.md` into a public quickstart.
- Completed: added MCP host examples for Codex CLI, Claude Code CLI, CCBuddy, and generic MCP JSON.
- Completed: added `docs/security.md`.
- Completed: added `docs/known-limitations.md`.
- Completed: added `CHANGELOG.md` with an initial `v0.1.0-alpha` entry.
- Completed: added MIT `LICENSE`.

## Packaging Tasks

- Keep `"private": true` in `package.json`.
- Do not run `npm publish` for `v0.1.0-alpha`.
- Tag `v0.1.0-alpha`.
- Create a GitHub release with concise release notes and links to:
  - `README.md`
  - `docs/security.md`
  - `docs/known-limitations.md`
  - `CHANGELOG.md`

## Verification Tasks

- Run local verification:
  - `npm test`
  - `npm run typecheck`
  - `npm run build`
- Run bridge lifecycle smoke:
  - Confirm no process is listening on `127.0.0.1:18767`.
  - Launch `node dist/cli.js mcp`.
  - Confirm `/health` reports the configured domain policy.
  - Confirm the process shuts down cleanly.
- Run host smoke matrix:
  - CCBuddy: verified on 2026-04-23.
  - Codex CLI: verified on 2026-04-23.
  - Claude Code CLI: MCP config verified on 2026-04-23; full tool-call smoke blocked by Claude auth.
  - OpenClaw: verify only if the specific OpenClaw client supports stdio MCP.
  - Hermes: verify only if the specific Hermes client supports stdio MCP.
- Run policy smoke:
  - Allowed domain command succeeds.
  - Denied domain command fails before queueing.
  - Mismatched existing bridge policy is rejected in `auto` mode.

## Release Notes Draft

`v0.1.0-alpha` introduces a local stdio MCP server for interacting with a real logged-in Chrome session through a Chrome extension and local bridge. It includes browser status, tab listing/switching, URL navigation, narrow click/scroll/type primitives, page scanning, screenshots, managed bridge startup, and optional domain allow/deny policy.

This release is alpha. It intentionally does not expose raw JavaScript execution, raw CDP passthrough, cookie export, or desktop-wide physical input.

## Suggested Execution Order

1. Run local verification.
2. Decide whether to accept the Claude Code CLI auth-blocked result or rerun after auth is fixed.
3. Commit and push release docs.
4. Tag `v0.1.0-alpha`.
5. Create the GitHub release.
