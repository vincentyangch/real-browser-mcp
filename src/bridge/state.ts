import type { BrowserTab, BridgeSnapshotResponse, BridgeStatus, ConnectorSnapshot } from "./types.js";

const BRIDGE_VERSION = "0.1.0";

export class BridgeState {
  private snapshot: ConnectorSnapshot | null = null;

  getStatus(): BridgeStatus {
    const tabs = this.snapshot?.tabs ?? [];

    return {
      ok: true,
      bridgeVersion: BRIDGE_VERSION,
      browser: this.snapshot?.browser ?? "chrome",
      mode: this.snapshot?.mode ?? "unconfigured",
      connected: this.snapshot !== null,
      connector: this.snapshot?.connector ?? null,
      tabCount: tabs.length,
      updatedAt: this.snapshot?.updatedAt ?? null,
      notes: this.snapshot
        ? []
        : [
            "Bridge server is running, but no browser connector has registered a session snapshot yet.",
            "Next step: implement a browser-side connector that posts tab snapshots to /v1/connector/snapshot.",
          ],
    };
  }

  getTabs(): BrowserTab[] {
    return this.snapshot?.tabs ?? [];
  }

  getSnapshotResponse(): BridgeSnapshotResponse {
    return {
      status: this.getStatus(),
      tabs: this.getTabs(),
    };
  }

  applySnapshot(snapshot: ConnectorSnapshot): BridgeSnapshotResponse {
    this.snapshot = {
      ...snapshot,
      tabs: snapshot.tabs.map((tab) => ({
        ...tab,
        lastSeenAt: tab.lastSeenAt || snapshot.updatedAt,
      })),
    };
    return this.getSnapshotResponse();
  }
}
