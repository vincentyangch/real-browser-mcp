export type BrowserKind = "chrome";
export type ConnectorMode = "unconfigured" | "attached-session";

export type BrowserTab = {
  id: string;
  url: string;
  title: string;
  active: boolean;
  lastSeenAt: string;
};

export type ConnectorSnapshot = {
  connector: string;
  browser: BrowserKind;
  mode: ConnectorMode;
  tabs: BrowserTab[];
  updatedAt: string;
};

export type BridgeStatus = {
  ok: boolean;
  bridgeVersion: string;
  browser: BrowserKind;
  mode: ConnectorMode;
  connected: boolean;
  connector: string | null;
  tabCount: number;
  updatedAt: string | null;
  notes: string[];
};

export type BridgeSnapshotResponse = {
  status: BridgeStatus;
  tabs: BrowserTab[];
};
