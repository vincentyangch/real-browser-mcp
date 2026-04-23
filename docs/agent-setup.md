# Agent Setup Runbook

Purpose: let an agent install, configure, and smoke-test `real-browser-mcp` for a user with minimal back-and-forth.

Audience: Codex CLI, Claude Code CLI, OpenClaw, Hermes, CCBuddy, and other local MCP-capable agents.

## Operating Contract

This runbook assumes the user has asked you to set up `real-browser-mcp`.

Important constraints:

- `real-browser-mcp` controls the user's real logged-in Chrome session.
- Do not bypass browser security interstitials, paywalls, CAPTCHAs, or host permission systems.
- If your agent framework requires action-time confirmation for installing browser extensions or changing persistent MCP config, ask for that confirmation before the specific action.
- Prefer a domain allow-list. The examples below use `yahoo.com` and deny `discord.com`.
- Do not start a separate `bridge-serve` process unless the user explicitly requests external bridge mode.

## Variables

Use these values unless the user asks for something else:

```bash
export REAL_BROWSER_MCP_ROOT="/Users/flyingchickens/Projects/real-browser-mcp"
export REAL_BROWSER_MCP_NAME="real-browser"
export REAL_BROWSER_MCP_ALLOWED_DOMAINS="yahoo.com"
export REAL_BROWSER_MCP_DENIED_DOMAINS="discord.com"
export REAL_BROWSER_MCP_CLI="$REAL_BROWSER_MCP_ROOT/dist/cli.js"
export REAL_BROWSER_MCP_EXTENSION_DIR="$REAL_BROWSER_MCP_ROOT/dist/chrome-extension"
```

If the repo is not already present, clone it first:

```bash
mkdir -p "$(dirname "$REAL_BROWSER_MCP_ROOT")"
git clone https://github.com/vincentyangch/real-browser-mcp.git "$REAL_BROWSER_MCP_ROOT"
```

## Step 1: Build

```bash
cd "$REAL_BROWSER_MCP_ROOT"
npm install
npm run build
test -f "$REAL_BROWSER_MCP_CLI"
test -f "$REAL_BROWSER_MCP_EXTENSION_DIR/manifest.json"
```

Expected result:

- `dist/cli.js` exists.
- `dist/chrome-extension/manifest.json` exists.
- `npm run build` exits with code `0`.

## Step 2: Load Or Reload The Chrome Extension

First check whether the unpacked extension is already registered in Chrome:

```bash
rg --no-messages -n "\"path\":\"$REAL_BROWSER_MCP_EXTENSION_DIR\"" \
  "$HOME/Library/Application Support/Google/Chrome" \
  -g 'Preferences' \
  -g 'Secure Preferences' || true
```

If it is already loaded:

1. Open `chrome://extensions/?id=<extension-id>` if you know the id.
2. Click Reload on `real-browser-mcp connector`.
3. Confirm it is enabled.

If it is not loaded, use browser UI automation:

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. In the file picker, go to `dist/chrome-extension`.
5. Select the folder and confirm.
6. Confirm the extension is enabled.
7. Set site access to the sites the user approved.

macOS file picker shortcut for agents:

1. Press `Cmd+Shift+G`.
2. Paste `$REAL_BROWSER_MCP_EXTENSION_DIR`.
3. Press Return.
4. Click Open or Select.

Expected result:

- Chrome shows `real-browser-mcp connector`.
- Extension path is `dist/chrome-extension`.
- The extension is enabled.

## Step 3: Register MCP With Codex CLI

Use persistent Codex CLI registration:

```bash
codex mcp remove "$REAL_BROWSER_MCP_NAME" 2>/dev/null || true
codex mcp add "$REAL_BROWSER_MCP_NAME" \
  --env REAL_BROWSER_MCP_ALLOWED_DOMAINS="$REAL_BROWSER_MCP_ALLOWED_DOMAINS" \
  --env REAL_BROWSER_MCP_DENIED_DOMAINS="$REAL_BROWSER_MCP_DENIED_DOMAINS" \
  -- node "$REAL_BROWSER_MCP_CLI" mcp
codex mcp get "$REAL_BROWSER_MCP_NAME"
```

Recommended Codex smoke test:

```bash
codex exec --json -s read-only \
  -c 'approval_policy="never"' \
  -c 'mcp_servers.real-browser.tools.browser_status.approval_mode="approve"' \
  -c 'mcp_servers.real-browser.tools.browser_list_tabs.approval_mode="approve"' \
  'Smoke test real-browser-mcp. Use only real-browser/browser_status and real-browser/browser_list_tabs. Reply one line starting CODEX_SMOKE_OK with connected=<true/false> tabs=<number> policy=<policy-note-or-missing>.'
```

Passing evidence:

- JSONL contains MCP calls for `browser_status` and `browser_list_tabs`.
- Final text starts with `CODEX_SMOKE_OK`.
- Policy mentions `allow=yahoo.com; deny=discord.com`.

## Step 4: Register MCP With Claude Code CLI

Use persistent Claude Code registration:

```bash
claude mcp remove "$REAL_BROWSER_MCP_NAME" -s user 2>/dev/null || true
claude mcp add -s user \
  -e REAL_BROWSER_MCP_ALLOWED_DOMAINS="$REAL_BROWSER_MCP_ALLOWED_DOMAINS" \
  -e REAL_BROWSER_MCP_DENIED_DOMAINS="$REAL_BROWSER_MCP_DENIED_DOMAINS" \
  "$REAL_BROWSER_MCP_NAME" -- node "$REAL_BROWSER_MCP_CLI" mcp
claude mcp get "$REAL_BROWSER_MCP_NAME"
```

Recommended Claude Code smoke test:

```bash
claude -p --no-session-persistence \
  --permission-mode dontAsk \
  --allowedTools 'mcp__real-browser__browser_status,mcp__real-browser__browser_list_tabs' \
  'Smoke test real-browser-mcp. Use only browser_status and browser_list_tabs from the real-browser MCP server. Reply one line starting CLAUDE_SMOKE_OK with connected=<true/false> tabs=<number> policy=<policy-note-or-missing>.'
```

Passing evidence:

- Claude Code lists `real-browser` as connected.
- The prompt calls `mcp__real-browser__browser_status`.
- The prompt calls `mcp__real-browser__browser_list_tabs`.
- Final text starts with `CLAUDE_SMOKE_OK`.

## Step 5: Register MCP With CCBuddy

Edit `config/local.yaml` in the CCBuddy repo:

```yaml
ccbuddy:
  agent:
    external_mcp_servers:
      - name: "real-browser"
        command: "/usr/bin/env"
        args:
          - "node"
          - "/Users/flyingchickens/Projects/real-browser-mcp/dist/cli.js"
          - "mcp"
        env:
          REAL_BROWSER_MCP_ALLOWED_DOMAINS: "yahoo.com"
          REAL_BROWSER_MCP_DENIED_DOMAINS: "discord.com"
```

Restart CCBuddy on macOS:

```bash
launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/com.ccbuddy.agent.plist 2>/dev/null || true
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.ccbuddy.agent.plist
```

Passing evidence:

- LaunchAgent is running.
- Dashboard/webchat can call `real-browser/browser_status`.
- Dashboard/webchat can call `real-browser/browser_list_tabs`.
- Tool output reports `Domain policy active. allow=yahoo.com; deny=discord.com`.

## Step 6: Register MCP With OpenClaw, Hermes, Or Another MCP Host

Use this generic stdio MCP config if the host accepts JSON:

```json
{
  "mcpServers": {
    "real-browser": {
      "type": "stdio",
      "command": "node",
      "args": ["/Users/flyingchickens/Projects/real-browser-mcp/dist/cli.js", "mcp"],
      "env": {
        "REAL_BROWSER_MCP_ALLOWED_DOMAINS": "yahoo.com",
        "REAL_BROWSER_MCP_DENIED_DOMAINS": "discord.com"
      }
    }
  }
}
```

If the host has a CLI command instead of JSON, map the fields as follows:

- Server name: `real-browser`
- Transport: `stdio`
- Command: `node`
- Args: `/Users/flyingchickens/Projects/real-browser-mcp/dist/cli.js`, `mcp`
- Env: `REAL_BROWSER_MCP_ALLOWED_DOMAINS=yahoo.com`
- Env: `REAL_BROWSER_MCP_DENIED_DOMAINS=discord.com`

Passing evidence:

- The host reports the MCP server as connected.
- The host exposes `browser_status`.
- The host exposes `browser_list_tabs`.
- A smoke prompt can call both tools and report the expected policy.

## Step 7: Smoke Test The Bridge Directly

Before a host smoke, confirm no stale bridge is listening:

```bash
lsof -iTCP:18767 -sTCP:LISTEN -n -P || true
```

Run a direct managed bridge smoke:

```bash
cd "$REAL_BROWSER_MCP_ROOT"
REAL_BROWSER_MCP_ALLOWED_DOMAINS="$REAL_BROWSER_MCP_ALLOWED_DOMAINS" \
REAL_BROWSER_MCP_DENIED_DOMAINS="$REAL_BROWSER_MCP_DENIED_DOMAINS" \
node dist/cli.js mcp
```

In another shell, query health:

```bash
curl -s http://127.0.0.1:18767/health
```

Expected health fields:

- `ok: true`
- `connected: true` after the Chrome extension publishes a snapshot
- `notes` includes `Domain policy active. allow=yahoo.com; deny=discord.com`

Stop the MCP process after the smoke.

## Troubleshooting

Bridge has no connected browser:

- Reload the Chrome extension.
- Confirm the extension path is `dist/chrome-extension`.
- Wait up to 10 seconds for the extension alarm to publish a snapshot.
- Open or focus an `http` or `https` tab.

Host says MCP is connected but tools are cancelled:

- Configure host tool approval for `browser_status` and `browser_list_tabs`.
- For Codex CLI, set per-tool `approval_mode="approve"` for the smoke.

Domain policy mismatch:

- Stop any existing bridge process.
- Restart the host MCP session.
- Confirm every host uses the same allow/deny env values.

Unsupported active tab:

- `chrome://`, extension pages, and other internal browser pages are excluded.
- Open a normal `https://` tab and rerun `browser_list_tabs`.

## Completion Checklist

- Build passed.
- Chrome extension loaded or reloaded.
- MCP host registration completed.
- `browser_status` works from the host.
- `browser_list_tabs` works from the host.
- Policy reports `allow=yahoo.com; deny=discord.com`.
- No unintended standalone bridge process is left running.
