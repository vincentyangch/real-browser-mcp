# Known Limitations

`real-browser-mcp` is alpha software. The current release is intentionally narrow and optimized for local pilot use.

## Browser Support

- Chrome is the only connector currently implemented.
- The extension is distributed as an unpacked extension, not through the Chrome Web Store.
- Browser-internal pages such as `chrome://extensions` are intentionally excluded.

## Interaction Scope

- Clicks are text-based and choose the first visible interactive element matching text, aria-label, title, input value, or placeholder.
- Typing only targets the currently focused editable element.
- Scrolling is viewport-based.
- Complex UI flows, canvas apps, shadow DOM-heavy apps, and custom editors may need additional primitives later.

## Safety Scope

- There is no raw JavaScript execution tool.
- There is no raw Chrome DevTools Protocol passthrough.
- There is no cookie export.
- There is no desktop-wide physical input.
- Domain policy is local and host-provided; it does not understand user intent or account-level risk.

## Multi-Agent Behavior

- All connected hosts share the same Chrome profile and visible browser state.
- Multiple agents can race, switch tabs, or observe stale snapshots.
- Hosts with different domain policies should not share the same bridge. `auto` mode rejects mismatched policy when it can detect it.

## Release Stability

- Tool names and response shapes are intended to stay stable during the alpha, but they are not yet guaranteed as a stable public API.
- The local HTTP bridge contract may change before a stable release.
- The extension permissions and packaging flow may change before a stable release.
